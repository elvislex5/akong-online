"""
Integration test: EGTB JSONL → npz → DataLoader → SongoNetV3 forward+backward.

Requires a pre-dumped sample file. By default uses `egtb-data/samples-n4.jsonl`
(produced by `cargo run --release --bin egtb_dump_samples -- 4 ...`). If not
present, the test is skipped.
"""
from __future__ import annotations
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch
    from torch.utils.data import DataLoader
    import torch.nn.functional as F
    TORCH_OK = True
except Exception:  # pragma: no cover
    TORCH_OK = False

import numpy as np
from distillation import EgtbDataset, load_all, describe, jsonl_to_npz


ROOT = Path(__file__).resolve().parents[2]
JSONL_PATH = ROOT / "egtb-data" / "samples-n4.jsonl"


@pytest.mark.skipif(not JSONL_PATH.exists(), reason=f"missing {JSONL_PATH}")
def test_jsonl_loads_nonempty():
    data = load_all(JSONL_PATH)
    assert data["x"].shape[0] > 0
    assert data["x"].shape[1:] == (16, 2, 7)
    assert data["policy"].shape[1] == 7
    assert data["value"].dtype == np.float32
    assert data["wdl_class"].dtype == np.int64
    # Policy rows should sum to ~1 (soft targets)
    sums = data["policy"].sum(axis=1)
    np.testing.assert_allclose(sums, 1.0, atol=1e-4)
    # Values in {-1, 0, 1}
    assert set(np.unique(data["value"]).tolist()).issubset({-1.0, 0.0, 1.0})


@pytest.mark.skipif(not JSONL_PATH.exists(), reason=f"missing {JSONL_PATH}")
def test_npz_roundtrip(tmp_path):
    npz = tmp_path / "samples.npz"
    info = jsonl_to_npz(JSONL_PATH, npz)
    assert info["samples"] > 0
    ds = EgtbDataset(npz)
    assert len(ds) == info["samples"]
    item = ds[0]
    assert item["x"].shape == (16, 2, 7)
    assert item["policy"].shape == (7,)
    assert isinstance(item["wdl_class"].item(), int)


@pytest.mark.skipif(not (TORCH_OK and JSONL_PATH.exists()), reason="needs torch + samples")
def test_train_one_step_decreases_loss():
    """Sanity: a single gradient step reduces training loss on a tiny network."""
    from network_v3 import SongoNetV3, NetworkV3Config

    data = load_all(JSONL_PATH)
    ds = EgtbDataset(data)
    loader = DataLoader(ds, batch_size=512, shuffle=True, num_workers=0)

    model = SongoNetV3(NetworkV3Config(num_blocks=2, filters=32))
    model.train()
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3)

    def compute_loss(batch):
        out = model(batch["x"])
        log_p = F.log_softmax(out["policy"], dim=1)
        loss_p = -(batch["policy"] * log_p).sum(dim=1).mean()
        loss_v = F.mse_loss(out["value"].squeeze(-1), batch["value"])
        loss_w = F.cross_entropy(out["wdl"], batch["wdl_class"])
        return loss_p + loss_v + 0.5 * loss_w

    it = iter(loader)
    b0 = next(it)
    loss0 = compute_loss(b0)

    # One backward pass
    opt.zero_grad()
    loss0.backward()
    opt.step()

    # Second step must see a decreased loss on the same batch
    loss1 = compute_loss(b0)
    assert loss1.item() < loss0.item(), f"loss did not decrease: {loss0.item()} -> {loss1.item()}"
