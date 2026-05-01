"""
Arena — pit two SongoNetV3 models head-to-head under deterministic MCTS.

Used by the self-play loop to decide whether a newly trained candidate
should replace the current champion. Follows the AlphaZero convention:
promote iff candidate wins ≥ `win_threshold` fraction with Wilson p-value
< `alpha`.

Games alternate starting player so each side plays an equal number of
openings. MCTS runs with temperature 0 (argmax on visit counts) and no
Dirichlet noise — play is deterministic given the two networks' weights.

Usage:
    python arena_v3.py \
        --a checkpoints/candidate.pt \
        --b checkpoints/champion.pt \
        --games 50 --sims 200
"""
from __future__ import annotations
import argparse
import math
import time
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import torch

from songo_game import SongoGame
from network_v3 import SongoNetV3, NetworkV3Config
from self_play_v3 import MctsNode, SelfPlayEngine, MctsConfig


@dataclass
class ArenaConfig:
    num_games: int = 40
    num_simulations: int = 200
    c_puct: float = 1.5
    max_game_plies: int = 300
    win_threshold: float = 0.55   # fraction A must beat to be "better"
    alpha: float = 0.05            # statistical significance level
    verbose: bool = True
    # Stochastic opening: sample proportionally to visit counts for the first
    # `temperature_plies` plies, then play deterministically (argmax).
    # Without this, a fully-deterministic arena yields only 2 unique games per
    # 40-game match (one per starting side) — Wilson CI becomes meaningless.
    temperature_plies: int = 6
    rng_seed: int = 2026


@dataclass
class ArenaResult:
    games: int
    wins_a: int
    wins_b: int
    draws: int
    a_win_rate: float              # = (wins_a + 0.5*draws) / games
    # Wilson 95% CI lower bound on A's win rate (ignoring draws as 0.5)
    wilson_lower: float
    wilson_upper: float
    promote: bool                  # True if A should replace B

    def to_dict(self) -> dict:
        return asdict(self)


def wilson_interval(wins: float, n: int, z: float = 1.96) -> tuple[float, float]:
    """
    Wilson score interval for a binomial proportion. `wins` can be fractional
    (draws counted as 0.5 wins). Returns (lower, upper) bounds on the true rate.
    """
    if n == 0:
        return (0.0, 1.0)
    p = wins / n
    denom = 1.0 + z * z / n
    center = p + z * z / (2 * n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((center - half) / denom, (center + half) / denom)


class ArenaEngine:
    """MCTS engine for arena play.

    Plays stochastically (temperature=1) for the first `temperature_plies`
    plies to diversify openings, then deterministically (argmax) afterwards.
    """

    def __init__(
        self,
        model: SongoNetV3,
        device: str,
        sims: int,
        c_puct: float,
        temperature_plies: int = 0,
        rng: np.random.Generator | None = None,
    ):
        self.model = model.eval()
        self.device = device
        self.sims = sims
        self.c_puct = c_puct
        self.temperature_plies = temperature_plies
        self.rng = rng if rng is not None else np.random.default_rng()
        # Reuse SelfPlayEngine's tree mechanics
        self.engine = SelfPlayEngine(
            model, device,
            MctsConfig(
                num_simulations=sims,
                c_puct=c_puct,
                dirichlet_epsilon=0.0,
                temperature_start=0.0,
                temperature_end=0.0,
                temperature_threshold=0,
            )
        )

    def choose_move(self, game: SongoGame, ply: int = 0) -> int:
        """Return the relative pit index (0..6) to play."""
        root = MctsNode()
        self.engine._expand(root, game)
        if root.terminal_value is not None or root.legal_mask is None:
            mask = self.engine._legal_mask(game)
            legal = [i for i in range(7) if mask[i]]
            return legal[0] if legal else 0
        for _ in range(self.sims):
            self.engine._simulate(root, game)
        visits = np.zeros(7, dtype=np.float32)
        for rel, child in root.children.items():
            visits[rel] = child.visits
        if ply < self.temperature_plies and visits.sum() > 0:
            probs = visits / visits.sum()
            return int(self.rng.choice(7, p=probs))
        return int(visits.argmax())


def play_one_game(
    engine_a: ArenaEngine, engine_b: ArenaEngine, a_plays_first: bool, max_plies: int
) -> int:
    """
    Play a single game. Returns the winner from A's perspective:
        +1 = A wins, -1 = B wins, 0 = draw.
    `a_plays_first`: if True, A = Player One, B = Player Two; else vice versa.
    """
    game = SongoGame()
    player_engine = {
        0: engine_a if a_plays_first else engine_b,
        1: engine_b if a_plays_first else engine_a,
    }
    plies = 0
    while not game.is_terminal and plies < max_plies:
        engine = player_engine[game.current_player]
        rel = engine.choose_move(game, plies)
        mover_start = 0 if game.current_player == 0 else 7
        game.execute_move(mover_start + rel)
        plies += 1

    # Determine outcome from A's perspective
    if not game.is_terminal:
        return 0  # timeout → draw
    if game.winner is None or game.winner == -1:
        return 0
    a_player = 0 if a_plays_first else 1
    return 1 if game.winner == a_player else -1


def pit(
    model_a: SongoNetV3,
    model_b: SongoNetV3,
    device: str,
    cfg: ArenaConfig,
) -> ArenaResult:
    """Run `cfg.num_games` between A and B, alternating starting side."""
    rng = np.random.default_rng(cfg.rng_seed)
    engine_a = ArenaEngine(model_a, device, cfg.num_simulations, cfg.c_puct,
                           temperature_plies=cfg.temperature_plies, rng=rng)
    engine_b = ArenaEngine(model_b, device, cfg.num_simulations, cfg.c_puct,
                           temperature_plies=cfg.temperature_plies, rng=rng)

    wins_a = 0
    wins_b = 0
    draws = 0
    t0 = time.time()
    for g in range(cfg.num_games):
        a_first = (g % 2 == 0)
        result = play_one_game(engine_a, engine_b, a_first, cfg.max_game_plies)
        if result > 0:
            wins_a += 1
        elif result < 0:
            wins_b += 1
        else:
            draws += 1
        if cfg.verbose and (g + 1) % max(1, cfg.num_games // 10) == 0:
            elapsed = time.time() - t0
            print(f"  arena game {g+1:>3}/{cfg.num_games}: "
                  f"A={wins_a} B={wins_b} D={draws}  elapsed={elapsed:.1f}s")

    n = cfg.num_games
    a_score = wins_a + 0.5 * draws
    a_rate = a_score / n if n else 0.0
    lo, hi = wilson_interval(a_score, n)
    # Promote A iff the Wilson lower bound exceeds the threshold — guarantees
    # we are >threshold at the chosen confidence level.
    # Equivalently: we reject H0: rate ≤ threshold at level alpha.
    promote = lo > cfg.win_threshold

    result = ArenaResult(
        games=n,
        wins_a=wins_a,
        wins_b=wins_b,
        draws=draws,
        a_win_rate=a_rate,
        wilson_lower=lo,
        wilson_upper=hi,
        promote=promote,
    )
    if cfg.verbose:
        print(f"[arena] A={wins_a} B={wins_b} D={draws} over {n} games, "
              f"A rate={a_rate:.3f} (95% CI [{lo:.3f}, {hi:.3f}]), "
              f"promote={promote}")
    return result


def load_model(path: str, device: str) -> SongoNetV3:
    ckpt = torch.load(path, weights_only=False, map_location=device)
    # Rebuild network using stored config if available, else defaults
    net_cfg = NetworkV3Config()
    if isinstance(ckpt.get("config"), dict):
        # Only override structural fields
        for field in ("num_blocks", "filters", "input_channels",
                      "policy_size", "kernel_size", "use_aux_heads"):
            if field in ckpt["config"] and ckpt["config"][field] is not None:
                setattr(net_cfg, field, ckpt["config"][field])
    model = SongoNetV3(net_cfg).to(device)
    model.load_state_dict(ckpt["model"])
    model.eval()
    return model


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--a", required=True, help="checkpoint for model A (candidate)")
    p.add_argument("--b", required=True, help="checkpoint for model B (champion)")
    p.add_argument("--games", type=int, default=40)
    p.add_argument("--sims", type=int, default=200)
    p.add_argument("--c-puct", type=float, default=1.5)
    p.add_argument("--win-threshold", type=float, default=0.55)
    p.add_argument("--alpha", type=float, default=0.05)
    p.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    args = p.parse_args()

    print(f"[arena] device={args.device}")
    model_a = load_model(args.a, args.device)
    model_b = load_model(args.b, args.device)

    cfg = ArenaConfig(
        num_games=args.games,
        num_simulations=args.sims,
        c_puct=args.c_puct,
        win_threshold=args.win_threshold,
        alpha=args.alpha,
    )
    result = pit(model_a, model_b, args.device, cfg)
    print()
    print(f"RESULT: promote={result.promote}")
    return 0 if result.promote else 1


if __name__ == "__main__":
    raise SystemExit(main())
