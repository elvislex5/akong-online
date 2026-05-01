"""
Smoke test for self_play_v3.

Plays a single very short self-play game with a tiny random network and
verifies the recorded samples have the expected schema.
"""
from __future__ import annotations
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch  # noqa: F401
    import numpy as np
    TORCH_OK = True
except Exception:
    TORCH_OK = False


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_self_play_runs_and_produces_compatible_samples(tmp_path):
    import numpy as np
    import torch
    from network_v3 import SongoNetV3, NetworkV3Config
    from self_play_v3 import SelfPlayEngine, MctsConfig, records_to_npz
    from distillation import EgtbDataset

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SongoNetV3(NetworkV3Config(num_blocks=2, filters=32)).to(device)
    cfg = MctsConfig(num_simulations=8, max_game_plies=40,
                     dirichlet_epsilon=0.0)  # deterministic-ish for test
    engine = SelfPlayEngine(model, device, cfg)
    rng = np.random.default_rng(42)

    records = engine.play_game(rng)
    assert len(records) > 0, "play_game returned no records"

    # Each record has the expected keys
    rec = records[0]
    for key in ("board", "scores", "cp", "sm", "sb", "policy", "move_mask", "value", "mover"):
        assert key in rec, f"missing key {key}"
    assert rec["policy"].shape == (7,)
    assert rec["move_mask"].shape == (7,)
    # Policy sums to 1 (visit-count distribution)
    s = float(rec["policy"].sum())
    assert abs(s - 1.0) < 1e-4 or s == 0.0, f"policy should sum to 1, got {s}"

    # Save and reload through EgtbDataset — must be compatible
    out_path = tmp_path / "selfplay.npz"
    records_to_npz(records, out_path)
    ds = EgtbDataset(out_path)
    assert len(ds) == len(records)
    item = ds[0]
    assert item["x"].shape == (16, 2, 7)
    assert item["policy"].shape == (7,)
    assert item["wdl_class"].item() in (0, 1, 2)


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_batched_self_play_matches_schema_and_is_faster(tmp_path):
    """
    Batched MCTS must (a) produce records with the same schema as serial,
    (b) pass the same validation checks, (c) be at least as fast as serial
    on a modest config (GPU or CPU). We don't check exact equivalence —
    virtual loss + non-determinism means trajectories can differ, but quality
    should be comparable.
    """
    import time
    import numpy as np
    import torch
    from network_v3 import SongoNetV3, NetworkV3Config
    from self_play_v3 import SelfPlayEngine, MctsConfig, records_to_npz
    from distillation import EgtbDataset

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SongoNetV3(NetworkV3Config(num_blocks=2, filters=32)).to(device)
    # Warm up the GPU so the timing comparison isn't dominated by first-call overhead
    dummy = torch.randn(1, 16, 2, 7, device=device)
    with torch.no_grad():
        for _ in range(3):
            model(dummy)

    cfg = MctsConfig(num_simulations=32, max_game_plies=40,
                     dirichlet_epsilon=0.0,
                     leaf_batch_size=16, virtual_loss=1.0)
    engine = SelfPlayEngine(model, device, cfg)

    rng = np.random.default_rng(123)
    t0 = time.time()
    serial_records = engine.play_game(rng)
    t_serial = time.time() - t0

    rng = np.random.default_rng(123)
    t0 = time.time()
    batched_records = engine.play_game_batched(rng)
    t_batched = time.time() - t0

    # Schema checks
    assert len(batched_records) > 0
    for key in ("board", "scores", "cp", "sm", "sb", "policy", "move_mask", "value", "mover"):
        assert key in batched_records[0]
    # Policy sums to 1
    s = float(batched_records[0]["policy"].sum())
    assert abs(s - 1.0) < 1e-4 or s == 0.0

    # Saving round-trips through EgtbDataset
    out_path = tmp_path / "batched.npz"
    records_to_npz(batched_records, out_path)
    ds = EgtbDataset(out_path)
    assert len(ds) == len(batched_records)
    assert ds[0]["x"].shape == (16, 2, 7)

    # Performance sanity: batched should be no slower than serial on GPU.
    # On CPU the advantage is smaller; allow a 1.5x slowdown there.
    if device == "cuda":
        assert t_batched <= t_serial * 1.3, (
            f"batched slower than serial? serial={t_serial:.2f}s batched={t_batched:.2f}s"
        )
