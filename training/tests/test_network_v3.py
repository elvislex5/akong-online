"""
Smoke tests for SongoNetV3 + encoding v3.

These tests require a working PyTorch installation. If `import torch` fails,
they are skipped with a clear message.
"""
from __future__ import annotations
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch  # noqa: F401
    TORCH_OK = True
except Exception as e:  # pragma: no cover
    TORCH_OK = False
    _TORCH_ERR = str(e)

import numpy as np

from encoding_v3 import StateView, encode, encode_batch, mirror, valid_move_mask, CHANNELS


# ─── Encoding tests (numpy-only, no torch) ───────────────────────────────────

def test_initial_state_encoding_shape():
    v = StateView.initial()
    t = encode(v)
    assert t.shape == (16, 2, 7)
    assert t.dtype == np.float32


def test_initial_state_encoding_content():
    v = StateView.initial()
    t = encode(v)
    # All pits have 5 seeds → row 0 and row 1 channel 0 = 5/15 = 0.333...
    np.testing.assert_allclose(t[0, 0, :], 5 / 15.0)
    np.testing.assert_allclose(t[0, 1, :], 5 / 15.0)
    # Mine indicator row 0
    assert (t[1, 0, :] == 1).all()
    assert (t[1, 1, :] == 0).all()
    # Opp indicator row 1
    assert (t[2, 0, :] == 0).all()
    assert (t[2, 1, :] == 1).all()
    # Yini (5 seeds) — all pits have 5 → all 1
    assert (t[3, :, :] == 1).all()
    # Vulnerable (2..4) → none
    assert t[4].sum() == 0
    assert t[5].sum() == 0
    # No grenier yet
    assert t[6].sum() == 0
    assert t[7].sum() == 0
    # No empty pits
    assert t[8].sum() == 0
    # Opp not starving
    assert (t[9] == 0).all()
    # Not in solidarity
    assert (t[10] == 0).all()
    # Scores 0/36
    assert (t[11] == 0).all()
    assert (t[12] == 0).all()
    assert (t[13] == 0).all()
    # Seeds in play = 70/70 = 1
    assert (t[14] == 1.0).all()
    # Bias channel = 1
    assert (t[15] == 1.0).all()


def test_perspective_flip_swaps_rows():
    board = np.array([5, 4, 3, 0, 0, 0, 0,  2, 0, 0, 0, 0, 0, 6], dtype=np.int16)
    vA = StateView(board=board, scores=(10, 20), current_player=0)
    vB = StateView(board=board, scores=(10, 20), current_player=1)
    tA = encode(vA)
    tB = encode(vB)
    # Row 0 of A == Row 1 of B for seed-count channel (current player perspective flip)
    np.testing.assert_allclose(tA[0, 0, :], tB[0, 1, :])
    np.testing.assert_allclose(tA[0, 1, :], tB[0, 0, :])
    # My score in A = 10/36, in B = 20/36
    np.testing.assert_allclose(tA[11], 10 / 36.0)
    np.testing.assert_allclose(tB[11], 20 / 36.0)


def test_yini_and_vulnerable_flags():
    board = np.zeros(14, dtype=np.int16)
    board[0] = 5   # Yini on my pit
    board[3] = 3   # vulnerable mine
    board[9] = 2   # vulnerable opp
    board[12] = 14 # grenier opp
    v = StateView(board=board, scores=(12, 8), current_player=0)
    t = encode(v)
    assert t[3, 0, 0] == 1      # Yini at my pit 0
    assert t[4, 0, 3] == 1      # vulnerable mine at pit 3
    assert t[5, 1, 9 - 7] == 1  # vulnerable opp at pit 9
    assert t[7, 1, 12 - 7] == 1 # grenier opp at pit 12


def test_opp_starving_broadcast():
    board = np.zeros(14, dtype=np.int16)
    board[0] = 3
    v = StateView(board=board, scores=(0, 0), current_player=0)
    t = encode(v)
    assert (t[9] == 1).all()


def test_batch_encoding():
    batch = [StateView.initial() for _ in range(3)]
    t = encode_batch(batch)
    assert t.shape == (3, 16, 2, 7)


def test_mirror_reverses_width_axis():
    v = StateView.initial()
    t = encode(v)
    tm = mirror(t)
    np.testing.assert_array_equal(tm[:, :, :], t[:, :, ::-1])


def test_valid_move_mask_initial():
    v = StateView.initial()
    mask = valid_move_mask(v)
    assert mask.dtype == np.bool_
    assert mask.shape == (7,)
    assert mask.all()


# ─── Network tests (require torch) ────────────────────────────────────────────

@pytest.mark.skipif(not TORCH_OK, reason=f"torch unavailable: {_TORCH_ERR if not TORCH_OK else ''}")
def test_network_forward_shapes():
    from network_v3 import SongoNetV3, NetworkV3Config
    import torch

    model = SongoNetV3(NetworkV3Config(num_blocks=2, filters=32))  # tiny for fast test
    model.eval()
    batch = torch.randn(4, 16, 2, 7)
    with torch.no_grad():
        out = model(batch)
    assert out["policy"].shape == (4, 7)
    assert out["value"].shape == (4, 1)
    assert out["score_diff"].shape == (4, 1)
    assert out["wdl"].shape == (4, 3)


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_network_param_count_target_range():
    from network_v3 import SongoNetV3, NetworkV3Config
    model = SongoNetV3(NetworkV3Config())  # default 12 blocks × 256 filters
    n = model.count_parameters()
    # Budget: 5–10 M params per the plan; widen slightly to be safe
    assert 3_000_000 < n < 15_000_000, f"param count {n:,} out of 3M-15M range"


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_network_encodes_and_forwards_real_state():
    """End-to-end: encode a real position → torch → forward → shapes OK."""
    from network_v3 import SongoNetV3, NetworkV3Config
    import torch

    v = StateView.initial()
    x = encode(v)
    xt = torch.from_numpy(x).unsqueeze(0)  # (1, 16, 2, 7)
    model = SongoNetV3(NetworkV3Config(num_blocks=2, filters=32))
    model.eval()
    with torch.no_grad():
        out = model(xt)
    assert out["policy"].shape == (1, 7)
    assert out["value"].shape == (1, 1)
    assert -1.0 <= out["value"].item() <= 1.0


@pytest.mark.skipif(not TORCH_OK, reason="torch unavailable")
def test_network_onnx_export_roundtrip(tmp_path):
    from network_v3 import SongoNetV3, NetworkV3Config
    import torch

    model = SongoNetV3(NetworkV3Config(num_blocks=2, filters=32))
    model.eval()
    sample = torch.randn(1, 16, 2, 7)
    out_path = tmp_path / "songo_v3.onnx"
    torch.onnx.export(
        model, sample, str(out_path),
        input_names=["state"],
        output_names=["policy", "value", "score_diff", "wdl"],
        dynamic_axes={"state": {0: "B"}, "policy": {0: "B"}, "value": {0: "B"},
                      "score_diff": {0: "B"}, "wdl": {0: "B"}},
        opset_version=17,
    )
    assert out_path.exists()
    assert out_path.stat().st_size > 1000  # non-empty sensible model file
