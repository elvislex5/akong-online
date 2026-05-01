"""
Self-play generator for SongoNetV3.

A compact PUCT-MCTS implementation that uses SongoNetV3 for priors (policy)
and value estimates at leaves. Produces self-play samples in the same shape
as `distillation.py` so both sources can be mixed in the replay buffer.

Sample shape (one per move played in every self-play game):
    board    : (14,)      int16   absolute
    scores   : (2,)       int16
    cp       : int        current player (0|1)
    sm, sb   : bool, int?
    policy   : (7,)       float32  visit-count distribution (current-player-relative)
    value    : float               final game outcome from mover's perspective
                                   (-1 loss / 0 draw / +1 win)
    move_mask: (7,)       bool     legal moves (cp-relative)

Stored as .npz compatible with `distillation.EgtbDataset`.

Usage:
    python self_play_v3.py \
        --checkpoint checkpoints/pretrain-v3/model_best.pt \
        --games 100 --sims 200 --out data/selfplay-v3.npz
"""
from __future__ import annotations
import argparse
import math
import os
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch

from songo_game import SongoGame
from network_v3 import SongoNetV3, NetworkV3Config
from encoding_v3 import StateView, encode


# ─── PUCT MCTS ────────────────────────────────────────────────────────────────

class MctsNode:
    __slots__ = ("prior", "children", "visits", "value_sum",
                 "legal_mask", "terminal_value", "is_expanded")

    def __init__(self, prior: float = 0.0):
        self.prior = prior
        self.children: dict[int, "MctsNode"] = {}   # pit_rel -> child
        self.visits = 0
        self.value_sum = 0.0
        self.legal_mask: np.ndarray | None = None   # (7,) bool
        self.terminal_value: float | None = None    # None if not terminal
        self.is_expanded = False

    def q(self) -> float:
        return 0.0 if self.visits == 0 else self.value_sum / self.visits


def state_view_of(game: SongoGame) -> StateView:
    return StateView(
        board=np.asarray(game.board, dtype=np.int16),
        scores=(int(game.scores[0]), int(game.scores[1])),
        current_player=int(game.current_player),
        solidarity_mode=bool(game.solidarity_mode),
        solidarity_beneficiary=(int(game.solidarity_beneficiary)
                                if game.solidarity_beneficiary is not None else None),
    )


def terminal_value_from_mover(game: SongoGame, mover: int) -> float:
    """Game must be terminal. Return value from `mover`'s perspective."""
    if game.winner is None:
        # No explicit winner — treat as draw.
        return 0.0
    if game.winner == -1:  # explicit draw
        return 0.0
    return 1.0 if game.winner == mover else -1.0


@dataclass
class MctsConfig:
    num_simulations: int = 200
    c_puct: float = 1.5
    dirichlet_alpha: float = 0.5
    dirichlet_epsilon: float = 0.25
    # Temperature schedule
    temperature_start: float = 1.0
    temperature_end: float = 0.1
    temperature_threshold: int = 15
    # Safety
    max_game_plies: int = 300
    # Batched MCTS (used only by play_game_batched)
    leaf_batch_size: int = 32
    virtual_loss: float = 1.0


class SelfPlayEngine:
    def __init__(self, model: SongoNetV3, device: str, cfg: MctsConfig):
        self.model = model
        self.model.eval()
        self.device = device
        self.cfg = cfg

    @torch.no_grad()
    def _nn_eval(self, game: SongoGame) -> tuple[np.ndarray, float]:
        """Return (policy probs over 7 rel actions, value estimate from mover)."""
        view = state_view_of(game)
        x = encode(view)
        xt = torch.from_numpy(x).unsqueeze(0).to(self.device)
        out = self.model(xt)
        log_p = torch.log_softmax(out["policy"], dim=1).squeeze(0)
        p = torch.exp(log_p).cpu().numpy()
        v = float(out["value"].item())
        return p, v

    def _legal_mask(self, game: SongoGame) -> np.ndarray:
        valid = game.get_valid_moves()
        start = 0 if game.current_player == 0 else 7
        mask = np.zeros(7, dtype=bool)
        for abs_pit in valid:
            rel = int(abs_pit) - start
            if 0 <= rel < 7:
                mask[rel] = True
        return mask

    def _expand(self, node: MctsNode, game: SongoGame) -> float:
        """Expand a leaf node. Returns value estimate from mover's perspective."""
        # Check terminal
        if game.is_terminal:
            v = terminal_value_from_mover(game, game.current_player)
            node.terminal_value = v
            node.is_expanded = True
            return v

        mask = self._legal_mask(game)
        if not mask.any():
            # Stalemate — final value by scores (songo_game should have marked terminal,
            # but be defensive).
            v = 0.0
            if game.scores[0] > game.scores[1]:
                v = 1.0 if game.current_player == 0 else -1.0
            elif game.scores[1] > game.scores[0]:
                v = 1.0 if game.current_player == 1 else -1.0
            node.terminal_value = v
            node.is_expanded = True
            return v

        policy, value = self._nn_eval(game)
        # Zero out illegal move probs and renormalize
        masked = policy * mask.astype(np.float32)
        s = masked.sum()
        if s > 1e-8:
            masked = masked / s
        else:
            # Uniform over legal moves if priors are all on illegal
            masked = mask.astype(np.float32) / max(mask.sum(), 1)

        node.legal_mask = mask
        node.is_expanded = True
        for rel in range(7):
            if mask[rel]:
                node.children[rel] = MctsNode(prior=float(masked[rel]))
        return value

    def _select_child(self, node: MctsNode) -> int:
        """PUCT: argmax of Q + c * prior * sqrt(sum_visits) / (1 + visits)."""
        total_visits_sqrt = math.sqrt(max(1, node.visits))
        c = self.cfg.c_puct
        best_score = -1e9
        best_rel = -1
        for rel, child in node.children.items():
            u = c * child.prior * total_visits_sqrt / (1 + child.visits)
            score = child.q() + u
            if score > best_score:
                best_score = score
                best_rel = rel
        return best_rel

    def _simulate(self, root: MctsNode, root_game: SongoGame):
        """Run one MCTS simulation from the root."""
        node = root
        game = root_game.clone()
        path: list[MctsNode] = [node]

        # Selection
        while node.is_expanded and node.terminal_value is None:
            rel = self._select_child(node)
            mover_start = 0 if game.current_player == 0 else 7
            game.execute_move(mover_start + rel)
            node = node.children[rel]
            path.append(node)

        # Expansion + evaluation
        value_for_leaf_mover = self._expand(node, game)

        # Backprop: alternating sign per level (each edge switches mover)
        # The leaf node's value is from leaf's mover perspective.
        # The parent stores this edge's value from PARENT's mover perspective,
        # which is the opposite because playing the move flipped turn.
        v = value_for_leaf_mover
        for n in reversed(path):
            n.visits += 1
            n.value_sum += v
            v = -v

    def _root_dirichlet(self, root: MctsNode):
        """Inject Dirichlet noise at root to encourage exploration."""
        legal = [rel for rel, _ in root.children.items()]
        if not legal:
            return
        noise = np.random.dirichlet([self.cfg.dirichlet_alpha] * len(legal))
        eps = self.cfg.dirichlet_epsilon
        for i, rel in enumerate(legal):
            child = root.children[rel]
            child.prior = (1 - eps) * child.prior + eps * float(noise[i])

    # ─── Batched MCTS (virtual loss) ─────────────────────────────────────

    @torch.no_grad()
    def _nn_eval_batch(self, games: list[SongoGame]) -> tuple[np.ndarray, np.ndarray]:
        """Batched evaluation. Returns (policies (B, 7), values (B,)) as np.float32."""
        xs = np.stack([encode(state_view_of(g)) for g in games], axis=0)
        xt = torch.from_numpy(xs).to(self.device)
        out = self.model(xt)
        log_p = torch.log_softmax(out["policy"], dim=1)
        p = torch.exp(log_p).cpu().numpy().astype(np.float32)
        v = out["value"].squeeze(-1).cpu().numpy().astype(np.float32)
        return p, v

    def _descend_virtual_loss(
        self, root: MctsNode, root_game: SongoGame, vloss: float
    ) -> tuple[list[MctsNode], SongoGame]:
        """
        Walk from root down to a leaf (unexpanded or terminal), applying
        virtual loss to every visited node to discourage subsequent sims in
        this batch from retracing the same path. Returns (path, game).
        """
        node = root
        game = root_game.clone()
        path = [node]
        # Virtual loss on root as well — affects PUCT denominator for children.
        node.visits += vloss
        node.value_sum += vloss
        while node.is_expanded and node.terminal_value is None:
            rel = self._select_child(node)
            mover_start = 0 if game.current_player == 0 else 7
            game.execute_move(mover_start + rel)
            child = node.children[rel]
            child.visits += vloss
            child.value_sum += vloss
            path.append(child)
            node = child
        return path, game

    def _backprop(self, path: list[MctsNode], leaf_value_from_mover: float, vloss: float):
        """Undo virtual loss and apply the real value (sign-flipped per level)."""
        v = leaf_value_from_mover
        for node in reversed(path):
            node.visits += 1 - vloss
            node.value_sum += v - vloss
            v = -v

    def _run_batched_sims(
        self, root: MctsNode, root_game: SongoGame, total_sims: int
    ):
        """Run `total_sims` MCTS simulations in batches, batching NN leaf
        evaluations to amortise GPU dispatch overhead."""
        vloss = self.cfg.virtual_loss
        batch_size = self.cfg.leaf_batch_size
        done = 0
        while done < total_sims:
            remaining = total_sims - done
            want = min(batch_size, remaining)
            pending_paths: list[list[MctsNode]] = []
            pending_games: list[SongoGame] = []

            # Phase 1: collect `want` descents, resolve terminals immediately
            for _ in range(want):
                path, game = self._descend_virtual_loss(root, root_game, vloss)
                leaf = path[-1]
                if leaf.terminal_value is not None:
                    # Terminal already classified — apply stored value directly
                    self._backprop(path, leaf.terminal_value, vloss)
                    done += 1
                elif leaf.is_expanded:
                    # Tree hit an already-expanded node (shouldn't normally happen
                    # because selection continues until an unexpanded leaf). If it
                    # does, treat its Q as the value estimate.
                    self._backprop(path, leaf.q(), vloss)
                    done += 1
                else:
                    pending_paths.append(path)
                    pending_games.append(game)

            if not pending_games:
                continue

            # Phase 2: batched NN inference
            policies, values = self._nn_eval_batch(pending_games)

            # Phase 3: expand each leaf and backprop
            for i, (path, game) in enumerate(zip(pending_paths, pending_games)):
                leaf = path[-1]
                mask = self._legal_mask(game)
                if not mask.any():
                    # Should have been classified terminal by game.is_terminal;
                    # use 0 (draw) as defensive fallback
                    leaf.terminal_value = 0.0
                    leaf.is_expanded = True
                    self._backprop(path, 0.0, vloss)
                    done += 1
                    continue
                prior = policies[i] * mask.astype(np.float32)
                s = prior.sum()
                if s > 1e-8:
                    prior = prior / s
                else:
                    prior = mask.astype(np.float32) / max(mask.sum(), 1)
                leaf.legal_mask = mask
                leaf.is_expanded = True
                for rel in range(7):
                    if mask[rel]:
                        leaf.children[rel] = MctsNode(prior=float(prior[rel]))
                self._backprop(path, float(values[i]), vloss)
                done += 1

    def play_game_batched(self, rng: np.random.Generator) -> list[dict]:
        """
        Batched variant of `play_game` — identical semantics but amortises NN
        inference across `cfg.leaf_batch_size` leaves per forward. Produces
        training records in the same format.
        """
        game = SongoGame()
        records: list[dict] = []
        plies = 0
        vloss = self.cfg.virtual_loss
        while not game.is_terminal and plies < self.cfg.max_game_plies:
            root = MctsNode()
            # Seed the root so the first batch of descents can use its priors
            self._expand(root, game)
            if root.terminal_value is not None:
                break
            self._root_dirichlet(root)

            self._run_batched_sims(root, game, self.cfg.num_simulations)

            policy = np.zeros(7, dtype=np.float32)
            for rel, child in root.children.items():
                policy[rel] = child.visits
            s = policy.sum()
            if s > 0:
                policy /= s

            view = state_view_of(game)
            records.append({
                "board": view.board.copy(),
                "scores": view.scores,
                "cp": view.current_player,
                "sm": view.solidarity_mode,
                "sb": view.solidarity_beneficiary,
                "policy": policy,
                "move_mask": root.legal_mask.copy() if root.legal_mask is not None
                             else np.zeros(7, dtype=bool),
                "mover": view.current_player,
            })

            temp = (self.cfg.temperature_start
                    if plies < self.cfg.temperature_threshold
                    else self.cfg.temperature_end)
            if temp <= 1e-3:
                rel = int(policy.argmax())
            else:
                probs = np.power(policy, 1.0 / temp)
                probs /= probs.sum()
                rel = int(rng.choice(7, p=probs))

            mover_start = 0 if game.current_player == 0 else 7
            game.execute_move(mover_start + rel)
            plies += 1

        # Fill per-record values from the game outcome
        if game.is_terminal:
            winner = game.winner
        else:
            winner = -1
        for rec in records:
            mover = rec["mover"]
            if winner is None or winner == -1:
                rec["value"] = 0.0
            elif winner == mover:
                rec["value"] = 1.0
            else:
                rec["value"] = -1.0
        return records

    # ─── Original serial play ────────────────────────────────────────────

    def play_game(self, rng: np.random.Generator) -> list[dict]:
        """
        Play a full self-play game. Returns a list of per-move records with
        (state_view, mcts_policy_rel_7, mover, legal_mask). The final `value`
        field is filled once the game ends.
        """
        game = SongoGame()
        records: list[dict] = []
        plies = 0
        while not game.is_terminal and plies < self.cfg.max_game_plies:
            root = MctsNode()
            self._expand(root, game)
            if root.terminal_value is not None:
                break
            self._root_dirichlet(root)

            for _ in range(self.cfg.num_simulations):
                self._simulate(root, game)

            # Build visit-count policy (cp-relative)
            policy = np.zeros(7, dtype=np.float32)
            for rel, child in root.children.items():
                policy[rel] = child.visits
            s = policy.sum()
            if s > 0:
                policy /= s

            # Record this move's state for training (before applying the chosen move)
            view = state_view_of(game)
            records.append({
                "board": view.board.copy(),
                "scores": view.scores,
                "cp": view.current_player,
                "sm": view.solidarity_mode,
                "sb": view.solidarity_beneficiary,
                "policy": policy,
                "move_mask": root.legal_mask.copy() if root.legal_mask is not None
                             else np.zeros(7, dtype=bool),
                "mover": view.current_player,
            })

            # Sample a move with temperature
            temp = (self.cfg.temperature_start
                    if plies < self.cfg.temperature_threshold
                    else self.cfg.temperature_end)
            if temp <= 1e-3:
                rel = int(policy.argmax())
            else:
                probs = np.power(policy, 1.0 / temp)
                probs /= probs.sum()
                rel = int(rng.choice(7, p=probs))

            mover_start = 0 if game.current_player == 0 else 7
            game.execute_move(mover_start + rel)
            plies += 1

        # Assign final value (mover's perspective) retroactively
        if game.is_terminal:
            winner = game.winner  # 0 / 1 / -1 (draw) / None
        else:
            winner = -1  # timeout → draw

        for rec in records:
            mover = rec["mover"]
            if winner is None or winner == -1:
                rec["value"] = 0.0
            elif winner == mover:
                rec["value"] = 1.0
            else:
                rec["value"] = -1.0

        return records


# ─── IO ───────────────────────────────────────────────────────────────────────

def records_to_npz(records: list[dict], out_path: str | Path):
    """Save as npz compatible with distillation.EgtbDataset."""
    xs, policies, values, wdls, masks = [], [], [], [], []
    for r in records:
        view = StateView(
            board=r["board"], scores=r["scores"], current_player=r["cp"],
            solidarity_mode=r["sm"], solidarity_beneficiary=r["sb"],
        )
        xs.append(encode(view))
        policies.append(r["policy"])
        values.append(float(r["value"]))
        v = r["value"]
        wdls.append(0 if v > 0.5 else (2 if v < -0.5 else 1))
        masks.append(r["move_mask"])
    np.savez_compressed(
        out_path,
        x=np.stack(xs, axis=0),
        policy=np.stack(policies, axis=0),
        value=np.asarray(values, dtype=np.float32),
        wdl_class=np.asarray(wdls, dtype=np.int64),
        move_mask=np.stack(masks, axis=0),
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", default=None, help="Optional .pt to warm-start the net")
    p.add_argument("--games", type=int, default=100)
    p.add_argument("--sims", type=int, default=200)
    p.add_argument("--c-puct", type=float, default=1.5)
    p.add_argument("--dirichlet-alpha", type=float, default=0.5)
    p.add_argument("--dirichlet-eps", type=float, default=0.25)
    p.add_argument("--temp-start", type=float, default=1.0)
    p.add_argument("--temp-end", type=float, default=0.1)
    p.add_argument("--temp-threshold", type=int, default=15)
    p.add_argument("--out", default="data/selfplay-v3.npz")
    p.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    p.add_argument("--seed", type=int, default=1234)
    args = p.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    rng = np.random.default_rng(args.seed)

    model = SongoNetV3(NetworkV3Config()).to(args.device)
    if args.checkpoint:
        ckpt = torch.load(args.checkpoint, weights_only=False, map_location=args.device)
        model.load_state_dict(ckpt["model"])
        print(f"[self-play] loaded {args.checkpoint} (epoch {ckpt.get('epoch', '?')})")
    else:
        print("[self-play] using random-init network")

    cfg = MctsConfig(
        num_simulations=args.sims,
        c_puct=args.c_puct,
        dirichlet_alpha=args.dirichlet_alpha,
        dirichlet_epsilon=args.dirichlet_eps,
        temperature_start=args.temp_start,
        temperature_end=args.temp_end,
        temperature_threshold=args.temp_threshold,
    )
    engine = SelfPlayEngine(model, args.device, cfg)

    all_records: list[dict] = []
    t0 = time.time()
    wins_by = {0: 0, 1: 0, -1: 0}
    plies_per_game: list[int] = []
    for g in range(args.games):
        recs = engine.play_game(rng)
        all_records.extend(recs)
        # Determine game outcome from first record's final value
        if recs:
            # value is from record's mover perspective → winner unambiguous
            final_v = recs[-1]["value"]
            last_mover = recs[-1]["mover"]
            if final_v > 0.5:
                winner = last_mover
            elif final_v < -0.5:
                winner = 1 - last_mover
            else:
                winner = -1
            wins_by[winner] += 1
            plies_per_game.append(len(recs))
        if (g + 1) % max(1, args.games // 10) == 0:
            elapsed = time.time() - t0
            print(f"  game {g+1:>4}/{args.games}  elapsed={elapsed:.1f}s  "
                  f"samples={len(all_records)}  wins P1/P2/Draw = "
                  f"{wins_by[0]}/{wins_by[1]}/{wins_by[-1]}")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    records_to_npz(all_records, out_path)
    elapsed = time.time() - t0
    avg_plies = float(np.mean(plies_per_game)) if plies_per_game else 0
    print()
    print(f"[DONE] {args.games} games, {len(all_records)} samples, {elapsed:.1f}s wall")
    print(f"       avg plies/game = {avg_plies:.1f}")
    print(f"       outcomes P1/P2/Draw = {wins_by[0]}/{wins_by[1]}/{wins_by[-1]}")
    print(f"       saved → {out_path}")


if __name__ == "__main__":
    main()
