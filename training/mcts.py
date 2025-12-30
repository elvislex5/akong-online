"""
Monte Carlo Tree Search (MCTS) for Songo
AlphaZero-style MCTS guided by neural network
"""

import numpy as np
import math
from songo_env import SongoEnv, GameState, Player

class MCTSNode:
    """Node in the MCTS tree"""

    def __init__(self, state: GameState, parent=None, prior_prob=1.0, action=None):
        self.state = state
        self.parent = parent
        self.action = action  # Action that led to this node
        self.prior_prob = prior_prob  # P(s,a) from neural network

        self.children = {}  # action -> MCTSNode
        self.visit_count = 0
        self.value_sum = 0.0

    def is_leaf(self):
        """Check if node is a leaf (not expanded)"""
        return len(self.children) == 0

    def value(self):
        """Average value of this node"""
        if self.visit_count == 0:
            return 0.0
        return self.value_sum / self.visit_count

    def select_child(self, c_puct=1.0):
        """
        Select child with highest UCB score
        UCB = Q(s,a) + c_puct * P(s,a) * sqrt(N(s)) / (1 + N(s,a))
        """
        best_score = -float('inf')
        best_action = None
        best_child = None

        for action, child in self.children.items():
            # Q value (from child's perspective, so negate it)
            q_value = -child.value()

            # Exploration bonus
            u_value = c_puct * child.prior_prob * math.sqrt(self.visit_count) / (1 + child.visit_count)

            ucb_score = q_value + u_value

            if ucb_score > best_score:
                best_score = ucb_score
                best_action = action
                best_child = child

        return best_action, best_child

    def expand(self, env: SongoEnv, policy_probs: np.ndarray):
        """
        Expand node by creating children for all valid actions
        Args:
            env: SongoEnv instance
            policy_probs: numpy array (14,) of action probabilities from network
        """
        valid_moves = env.get_valid_moves(self.state)

        if len(valid_moves) == 0:
            return  # Terminal node

        # Normalize probabilities over valid moves
        valid_probs = policy_probs[valid_moves]
        valid_probs_sum = valid_probs.sum()

        if valid_probs_sum > 0:
            valid_probs = valid_probs / valid_probs_sum
        else:
            # Uniform if network gives zero probability to all valid moves
            valid_probs = np.ones(len(valid_moves)) / len(valid_moves)

        # Create child nodes
        for i, action in enumerate(valid_moves):
            new_state = env.execute_move(self.state, action)
            child = MCTSNode(new_state, parent=self, prior_prob=valid_probs[i], action=action)
            self.children[action] = child

    def backup(self, value: float):
        """
        Backup value up the tree
        Value is from perspective of player who just moved
        """
        node = self
        while node is not None:
            node.visit_count += 1
            node.value_sum += value
            value = -value  # Flip value for opponent
            node = node.parent


class MCTS:
    """Monte Carlo Tree Search"""

    def __init__(self, env: SongoEnv, network, c_puct=1.0, num_simulations=100):
        """
        Args:
            env: SongoEnv instance
            network: Neural network (SongoNet)
            c_puct: Exploration constant
            num_simulations: Number of MCTS simulations per move
        """
        self.env = env
        self.network = network
        self.c_puct = c_puct
        self.num_simulations = num_simulations

    def search(self, state: GameState) -> np.ndarray:
        """
        Run MCTS search from given state
        Returns: action probabilities (14,) based on visit counts
        """
        root = MCTSNode(state)

        # Run simulations
        for _ in range(self.num_simulations):
            self._simulate(root)

        # Get action probabilities from visit counts
        action_probs = np.zeros(14, dtype=np.float32)

        total_visits = sum(child.visit_count for child in root.children.values())

        if total_visits > 0:
            for action, child in root.children.items():
                action_probs[action] = child.visit_count / total_visits

        return action_probs

    def _simulate(self, root: MCTSNode):
        """Run one simulation"""
        node = root

        # Selection: traverse tree using UCB
        while not node.is_leaf():
            action, node = node.select_child(self.c_puct)

        # Check if terminal
        if node.state.status.value == 1:  # GameStatus.FINISHED
            # Terminal node
            if node.state.winner is None:
                value = 0.0  # Draw
            elif node.state.winner == node.parent.state.current_player:
                value = 1.0  # Parent's move led to win
            else:
                value = -1.0  # Parent's move led to loss

            node.backup(value)
            return

        # Expansion: get network prediction and expand
        state_features = self.env.get_state_representation(node.state)
        policy_probs, value = self.network.predict(state_features)

        node.expand(self.env, policy_probs)

        # Backup: propagate value up the tree
        # Value is from perspective of current player in this state
        # Need to negate because backup expects value from parent's perspective
        node.backup(-value)

    def get_action_with_temp(self, state: GameState, temperature=1.0) -> int:
        """
        Get action using MCTS with temperature
        Args:
            state: Current game state
            temperature:
                - temperature > 1: more exploration
                - temperature = 1: proportional to visit counts
                - temperature < 1: more exploitation
                - temperature -> 0: greedy (pick most visited)
        Returns:
            action (int)
        """
        action_probs = self.search(state)

        if temperature == 0:
            # Greedy: pick most visited
            valid_moves = self.env.get_valid_moves(state)
            valid_probs = action_probs[valid_moves]
            best_idx = np.argmax(valid_probs)
            return valid_moves[best_idx]

        # Sample with temperature
        if temperature != 1.0:
            action_probs = action_probs ** (1.0 / temperature)
            action_probs = action_probs / action_probs.sum()

        # Ensure we only sample from valid moves
        valid_moves = self.env.get_valid_moves(state)
        valid_probs = action_probs[valid_moves]
        valid_probs = valid_probs / valid_probs.sum()

        action_idx = np.random.choice(len(valid_moves), p=valid_probs)
        return valid_moves[action_idx]


if __name__ == "__main__":
    # Test MCTS
    from songo_net import SongoNetSmall
    import torch

    print("Testing MCTS...")

    env = SongoEnv()
    network = SongoNetSmall(hidden_size=128)
    network.eval()

    mcts = MCTS(env, network, c_puct=1.0, num_simulations=50)

    print("\nInitial state:")
    env.render()

    # Run MCTS search
    print("\nRunning MCTS (50 simulations)...")
    action_probs = mcts.search(env.state)

    valid_moves = env.get_valid_moves()
    print(f"\nValid moves: {valid_moves}")
    print(f"Action probabilities:")
    for move in valid_moves:
        print(f"  Move {move}: {action_probs[move]:.3f}")

    # Select action
    action = mcts.get_action_with_temp(env.state, temperature=1.0)
    print(f"\nSelected action: {action}")

    # Execute move
    env.step(action)
    print("\nState after move:")
    env.render()

    print("\n✓ MCTS test passed!")
