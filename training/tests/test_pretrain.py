"""
Integration test for pretrain_from_egtb.

Runs a minimal 2-epoch pre-training cycle on the EGTB samples and asserts
the checkpoint loads and loss decreased. Skipped if torch or samples are
missing.
"""
from __future__ import annotations
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch  # noqa: F401
    TORCH_OK = True
except Exception:
    TORCH_OK = False

from distillation import jsonl_to_npz


ROOT = Path(__file__).resolve().parents[2]
JSONL_PATH = ROOT / "egtb-data" / "samples-n4.jsonl"


@pytest.mark.skipif(not (TORCH_OK and JSONL_PATH.exists()), reason="needs torch + samples")
def test_pretrain_two_epochs_decreases_loss(tmp_path):
    import torch
    from pretrain_from_egtb import PretrainConfig, run_pretrain

    # Ensure we have a cached npz near the tmp_path
    npz = tmp_path / "samples.npz"
    jsonl_to_npz(JSONL_PATH, npz)

    cfg = PretrainConfig(
        data_path=str(npz),
        out_dir=str(tmp_path / "ckpt"),
        epochs=2,
        batch_size=512,
        lr=1e-3,
        val_frac=0.1,
        device="cuda" if torch.cuda.is_available() else "cpu",
        # Tiny net for speed
        num_blocks=2,
        filters=32,
    )
    summary = run_pretrain(cfg)
    history = summary["history"]
    assert len(history) == 2
    # Val loss should strictly decrease epoch 1 → epoch 2
    assert history[1]["val"]["total"] < history[0]["val"]["total"], (
        f"val loss did not decrease: {history[0]['val']['total']} → {history[1]['val']['total']}"
    )
    # Best checkpoint file exists and loads
    ckpt_path = Path(summary["checkpoint"])
    assert ckpt_path.exists(), f"checkpoint not found at {ckpt_path}"
    payload = torch.load(ckpt_path, weights_only=False, map_location="cpu")
    assert "model" in payload
    assert payload["val_total"] == pytest.approx(summary["best_val_total"])
