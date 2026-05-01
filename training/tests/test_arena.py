"""
Smoke tests for arena_v3 and train_v3.

Kept tiny (num_blocks=2, filters=32, few sims, few games) so the entire
suite runs in under a minute on CPU.
"""
from __future__ import annotations
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch  # noqa: F401
    import numpy as np  # noqa: F401
    TORCH_OK = True
except Exception:
    TORCH_OK = False


def _make_tiny_model(device: str):
    from network_v3 import SongoNetV3, NetworkV3Config
    return SongoNetV3(NetworkV3Config(num_blocks=2, filters=32)).to(device)


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_arena_identical_models_roughly_balanced():
    """Two copies of the same network should produce near-50% results."""
    import torch
    from arena_v3 import ArenaConfig, pit

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = _make_tiny_model(device).eval()
    # Clone the weights for model_b
    model_b = _make_tiny_model(device)
    model_b.load_state_dict(model.state_dict())
    model_b.eval()

    cfg = ArenaConfig(num_games=6, num_simulations=8, verbose=False,
                      max_game_plies=50, win_threshold=0.55)
    res = pit(model, model_b, device, cfg)
    assert res.games == 6
    assert res.wins_a + res.wins_b + res.draws == 6
    # With identical models and tiny sims, we shouldn't confidently promote A
    # (Wilson lower bound won't exceed 55% in 6 games).
    assert res.promote is False


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_wilson_interval_math():
    from arena_v3 import wilson_interval
    lo, hi = wilson_interval(50, 100)
    assert 0.39 < lo < 0.41  # known value: Wilson 95% on 50/100 ≈ [0.402, 0.598]
    assert 0.59 < hi < 0.61

    lo0, hi0 = wilson_interval(0, 0)
    assert (lo0, hi0) == (0.0, 1.0)

    lo1, hi1 = wilson_interval(10, 10)
    assert hi1 == pytest.approx(1.0, abs=1e-9)


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_train_v3_one_iteration(tmp_path):
    """End-to-end: one iteration produces champion + iter artefacts."""
    import torch
    from train_v3 import TrainV3Config, run_training

    device = "cuda" if torch.cuda.is_available() else "cpu"
    cfg = TrainV3Config(
        run_dir=str(tmp_path / "run"),
        egtb_path=None,
        init_checkpoint=None,
        iterations=1,
        selfplay_games=1,          # just 1 self-play game
        selfplay_sims=4,            # minimum viable sims
        epochs_per_iter=1,
        batch_size=32,
        lr=1e-3,
        egtb_ratio=0.0,             # no EGTB → self-play only
        arena_games=2,
        arena_sims=4,
        win_threshold=0.55,
        device=device,
        seed=0,
    )
    run_training(cfg)

    run_dir = Path(cfg.run_dir)
    assert (run_dir / "champion.pt").exists()
    assert (run_dir / "iter-001" / "selfplay.npz").exists()
    assert (run_dir / "iter-001" / "candidate.pt").exists()
    assert (run_dir / "iter-001" / "history.json").exists()
    assert (run_dir / "iter-001" / "arena.json").exists()
    assert (run_dir / "global_history.json").exists()
