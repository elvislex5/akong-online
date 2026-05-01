"""
AlphaZero for Songo — Monte Carlo Tree Search (MCTS)

v2: Batched inference + GPU support + symmetry augmentation.

Uses the neural network to guide the search:
- Selection: PUCT formula (UCB variant with NN priors) with virtual loss
- Expansion: Batched NN evaluation (multiple leaves per forward pass)
- Backpropagation: Updates visit counts and values
- No random rollouts (replaced by NN value head)
- Mirror symmetry: optionally evaluate both original and mirrored state
"""
import math
import numpy as np
import torch
from typing import Optional, Dict, List, Tuple

from songo_game import SongoGame
from neural_network import SongoNet
from config import MCTSConfig


# ─── Symmetry helpers ────────────────────────────────────────────────────────

def mirror_encoded_state(state: np.ndarray) -> np.ndarray:
    """
    Mirror a canonical 80-feature state vector by reversing pit order.
    Pit 0↔6, 1↔5, 2↔4, 3 stays — for both current and opponent sides.
    Zone features and derived features are recomputed by reversing the
    underlying pit arrays.
    """
    m = state.copy()

    # [0-6]: my pits → reverse
    m[0:7] = state[0:7][::-1]
    # [7-13]: opponent pits → reverse
    m[7:14] = state[7:14][::-1]

    # [14-27]: scalar features — unchanged (scores, totals, etc.)

    # [28-31]: bidoua/threats — unchanged (aggregates)

    # [32-37]: zone features need swapping: Tête ↔ Membres, Pivot unchanged
    # my_tete(32) ↔ my_membres(34), my_pivot(33) unchanged
    m[32], m[34] = state[34], state[32]
    # op_tete(35) ↔ op_membres(37), op_pivot(36) unchanged
    m[35], m[37] = state[37], state[35]

    # [38-44]: maison proximity per-pit → reverse
    m[38:45] = state[38:45][::-1]

    # [45-51]: capture potential per-pit → reverse
    m[45:52] = state[45:52][::-1]

    # [52-57]: vulnerability by zone — swap Tête ↔ Membres
    m[52], m[54] = state[54], state[52]  # my tête ↔ my membres
    m[55], m[57] = state[57], state[55]  # op tête ↔ op membres
    # Pivot (53, 56) unchanged

    # [58-63]: strategic balance
    m[61] = -state[61]  # tête imbalance → negate (swapped sides)
    m[62] = -state[62]  # membres imbalance → negate

    # [64-70]: landing positions per-pit → reverse
    m[64:71] = state[64:71][::-1]

    # [71-76]: yini/olôa/akuru counts — unchanged (aggregates)

    return m


def mirror_policy(policy: np.ndarray) -> np.ndarray:
    """Mirror a 7-action policy vector: action 0↔6, 1↔5, 2↔4, 3 stays."""
    return policy[::-1].copy()


# ─── MCTS Node ───────────────────────────────────────────────────────────────

class MCTSNode:
    """A node in the MCTS tree."""

    __slots__ = ['game', 'parent', 'action', 'prior', 'children',
                 'visit_count', 'value_sum', 'is_expanded']

    def __init__(
        self,
        game: SongoGame,
        parent: Optional['MCTSNode'] = None,
        action: int = -1,
        prior: float = 0.0
    ):
        self.game = game
        self.parent = parent
        self.action = action  # Action that led to this node (relative, 0-6)
        self.prior = prior    # P(s, a) from NN policy
        self.children: Dict[int, 'MCTSNode'] = {}
        self.visit_count = 0
        self.value_sum = 0.0
        self.is_expanded = False

    @property
    def q_value(self) -> float:
        """Mean value (Q) of this node."""
        if self.visit_count == 0:
            return 0.0
        return self.value_sum / self.visit_count

    def ucb_score(self, c_puct: float) -> float:
        """
        Upper Confidence Bound score using PUCT formula.
        We NEGATE Q because: each node stores value from its OWN player's
        perspective. The parent (opponent) wants the child worst for child.
        """
        parent_visits = self.parent.visit_count if self.parent else 1
        exploration = c_puct * self.prior * math.sqrt(parent_visits) / (1 + self.visit_count)
        return -self.q_value + exploration

    def select_child(self, c_puct: float) -> 'MCTSNode':
        """Select the child with the highest UCB score."""
        best_score = -float('inf')
        best_child = None
        for child in self.children.values():
            score = child.ucb_score(c_puct)
            if score > best_score:
                best_score = score
                best_child = child
        return best_child

    def expand(self, policy_probs: np.ndarray):
        """Expand this node using the NN policy output."""
        if self.game.is_terminal:
            return

        self.is_expanded = True
        valid_mask = self.game.get_valid_moves_mask()

        # Mask and renormalize policy
        masked_probs = policy_probs * valid_mask
        prob_sum = masked_probs.sum()
        if prob_sum > 0:
            masked_probs /= prob_sum
        elif valid_mask.sum() > 0:
            masked_probs = valid_mask / valid_mask.sum()
        else:
            return

        for action in range(7):
            if valid_mask[action] > 0:
                child_game = self.game.clone()
                pit_index = child_game.action_to_pit_index(action)
                child_game.execute_move(pit_index)

                child = MCTSNode(
                    game=child_game,
                    parent=self,
                    action=action,
                    prior=float(masked_probs[action])
                )
                self.children[action] = child

    def backpropagate(self, value: float):
        """Backpropagate the value up the tree, alternating perspective."""
        node = self
        while node is not None:
            node.visit_count += 1
            node.value_sum += value
            value = -value
            node = node.parent


# ─── Batched MCTS ────────────────────────────────────────────────────────────

class MCTS:
    """Monte Carlo Tree Search with batched GPU inference and symmetry."""

    def __init__(
        self,
        model: SongoNet,
        config: MCTSConfig,
        device: str = "cpu",
        batch_size: int = 16,
        use_symmetry: bool = True,
    ):
        self.model = model
        self.config = config
        self.device = device
        self.batch_size = batch_size
        self.use_symmetry = use_symmetry

    @torch.no_grad()
    def _evaluate_single(self, game: SongoGame) -> Tuple[np.ndarray, float]:
        """Evaluate a single game state (fallback)."""
        state = game.encode_state()
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)

        self.model.eval()
        policy_logits, value = self.model(state_tensor)
        policy_probs = torch.softmax(policy_logits, dim=1).cpu().numpy()[0]
        value = value.cpu().item()

        return policy_probs, value

    @torch.no_grad()
    def _evaluate_batch(
        self, games: List[SongoGame]
    ) -> List[Tuple[np.ndarray, float]]:
        """
        Evaluate a batch of game states in a single forward pass.
        With symmetry: evaluates both original and mirrored, averages results.
        """
        if len(games) == 0:
            return []

        self.model.eval()
        n = len(games)

        # Encode all states
        states = np.stack([g.encode_state() for g in games], axis=0)

        if self.use_symmetry:
            # Stack original + mirrored → batch of 2n
            mirrored = np.stack([mirror_encoded_state(s) for s in states], axis=0)
            batch = np.concatenate([states, mirrored], axis=0)  # (2n, 80)
        else:
            batch = states  # (n, 80)

        batch_tensor = torch.FloatTensor(batch).to(self.device)
        policy_logits, values = self.model(batch_tensor)
        policy_probs = torch.softmax(policy_logits, dim=1).cpu().numpy()
        values = values.cpu().numpy().flatten()

        results = []
        for i in range(n):
            if self.use_symmetry:
                # Average original and un-mirrored policy/value
                orig_policy = policy_probs[i]
                mirror_pol = mirror_policy(policy_probs[n + i])
                avg_policy = (orig_policy + mirror_pol) / 2.0
                avg_value = (values[i] + values[n + i]) / 2.0
                results.append((avg_policy, float(avg_value)))
            else:
                results.append((policy_probs[i], float(values[i])))

        return results

    def search(self, game: SongoGame, add_noise: bool = True) -> np.ndarray:
        """
        Run batched MCTS from the given game state.

        Collects `batch_size` leaves per iteration using virtual loss,
        then evaluates them in a single batched forward pass.

        Args:
            game: Current game state
            add_noise: Whether to add Dirichlet noise at root

        Returns:
            action_probs: (7,) normalized visit count distribution
        """
        root = MCTSNode(game.clone())

        if root.game.is_terminal:
            return np.zeros(7, dtype=np.float32)

        # Expand root (single evaluation)
        policy_probs, value = self._evaluate_single(root.game)

        # Add Dirichlet noise for exploration
        if add_noise:
            noise = np.random.dirichlet(
                [self.config.dirichlet_alpha] * 7
            )
            valid_mask = root.game.get_valid_moves_mask()
            noise *= valid_mask
            noise_sum = noise.sum()
            if noise_sum > 0:
                noise /= noise_sum
            policy_probs = (
                (1 - self.config.dirichlet_epsilon) * policy_probs
                + self.config.dirichlet_epsilon * noise
            )

        root.expand(policy_probs)
        root.visit_count = 1
        root.value_sum = value

        # ── Batched simulation loop ──────────────────────────────────────
        sims_done = 0
        total_sims = self.config.num_simulations

        while sims_done < total_sims:
            batch_leaves: List[MCTSNode] = []
            batch_games: List[SongoGame] = []
            terminal_results: List[Tuple[MCTSNode, float]] = []

            # 1. Selection — collect batch_size leaves with virtual loss
            for _ in range(min(self.batch_size, total_sims - sims_done)):
                node = root

                # Traverse to leaf
                while node.is_expanded and len(node.children) > 0:
                    node = node.select_child(self.config.c_puct)

                # Apply virtual loss to discourage re-selection
                vl_node = node
                while vl_node is not None:
                    vl_node.visit_count += 1
                    vl_node.value_sum -= 1.0  # Pessimistic
                    vl_node = vl_node.parent

                if node.game.is_terminal:
                    result = node.game.get_result(node.game.current_player)
                    terminal_results.append((node, result))
                elif node.is_expanded:
                    # Already expanded (duplicate in batch) — treat as terminal-ish
                    terminal_results.append((node, node.q_value))
                else:
                    batch_leaves.append(node)
                    batch_games.append(node.game)

            # 2. Batched expansion + evaluation
            if len(batch_games) > 0:
                eval_results = self._evaluate_batch(batch_games)
                for node, (policy, val) in zip(batch_leaves, eval_results):
                    node.expand(policy)

            # 3. Undo virtual loss + backpropagate real values
            all_nodes = [(n, v) for n, v in terminal_results]
            if len(batch_games) > 0:
                all_nodes += [(n, v) for n, (_, v) in zip(batch_leaves, eval_results)]

            for node, value in all_nodes:
                # Undo virtual loss (walk up from node to root)
                vl_node = node
                while vl_node is not None:
                    vl_node.visit_count -= 1
                    vl_node.value_sum += 1.0
                    vl_node = vl_node.parent

                # Real backpropagation
                node.backpropagate(value)
                sims_done += 1

        # Extract action probabilities from visit counts
        action_probs = np.zeros(7, dtype=np.float32)
        for action, child in root.children.items():
            action_probs[action] = child.visit_count

        total_visits = action_probs.sum()
        if total_visits > 0:
            action_probs /= total_visits

        return action_probs

    def get_action(
        self,
        game: SongoGame,
        temperature: float = 1.0,
        add_noise: bool = False
    ) -> Tuple[int, np.ndarray]:
        """
        Get an action using MCTS.

        Args:
            game: Current game state
            temperature: Controls exploration (1.0 = proportional, 0 = greedy)
            add_noise: Whether to add exploration noise

        Returns:
            action: Selected action (0-6)
            action_probs: (7,) visit count distribution
        """
        action_probs = self.search(game, add_noise=add_noise)

        valid_mask = game.get_valid_moves_mask()
        valid_indices = np.where(valid_mask > 0)[0]

        if len(valid_indices) == 0:
            return 0, action_probs

        if temperature == 0 or temperature < 0.1:
            masked = action_probs * valid_mask
            if masked.sum() > 0:
                action = int(np.argmax(masked))
            else:
                action = int(valid_indices[0])
        else:
            adjusted = action_probs ** (1.0 / temperature)
            adjusted = adjusted * valid_mask
            adjusted_sum = adjusted.sum()
            if adjusted_sum > 0:
                adjusted /= adjusted_sum
                action = int(np.random.choice(7, p=adjusted))
            else:
                p = valid_mask / valid_mask.sum()
                action = int(np.random.choice(7, p=p))

        return action, action_probs


if __name__ == "__main__":
    from neural_network import create_network
    from config import MCTSConfig, NetworkConfig

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = create_network(NetworkConfig(), device=device)
    mcts = MCTS(model, MCTSConfig(num_simulations=100), device=device,
                batch_size=16, use_symmetry=True)

    game = SongoGame()
    print(game)
    print()

    action, probs = mcts.get_action(game, temperature=1.0, add_noise=True)
    print(f"Action: {action}")
    print(f"Visit distribution: {probs}")
    print(f"Selected pit: {game.action_to_pit_index(action)}")
