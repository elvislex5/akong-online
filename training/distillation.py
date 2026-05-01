"""
EGTB distillation — convert Rust-dumped JSONL samples into training tensors.

Pipeline:
    egtb_dump_samples (Rust) ──► samples-nK.jsonl ──► EgtbDataset (torch)
                                                  ──► .npz cached archive

Sample JSONL line format (see engine-rs/src/bin/egtb_dump_samples.rs):
    {
      "board": [b0..b13], "scores": [s0, s1],
      "cp": 0|1, "sm": bool, "sb": 0|1|null,
      "value": -1|0|+1, "wdl_class": 0|1|2,
      "policy": [p0..p6], "valid": [absolute pit indices]
    }

Training tensors emitted per sample:
    x          : (16, 2, 7) float32  — state encoded via encoding_v3
    policy     : (7,)       float32  — soft target (sums to 1)
    value      : ()         float32  — in {-1, 0, +1}
    wdl_class  : ()         int64    — class index 0=Win / 1=Draw / 2=Loss
    move_mask  : (7,)       bool     — True = legal move (current-player relative)
"""
from __future__ import annotations
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator

import numpy as np
import torch
from torch.utils.data import Dataset

from encoding_v3 import StateView, encode


@dataclass
class EgtbSample:
    x: np.ndarray          # (16, 2, 7) float32
    policy: np.ndarray     # (7,) float32
    value: float           # in {-1, 0, 1}
    wdl_class: int         # 0/1/2
    move_mask: np.ndarray  # (7,) bool — legal moves (cp-relative)


def _parse_line(line: str) -> EgtbSample:
    obj = json.loads(line)
    board = np.asarray(obj["board"], dtype=np.int16)
    scores = tuple(int(s) for s in obj["scores"])
    cp = int(obj["cp"])
    sm = bool(obj["sm"])
    sb_raw = obj["sb"]
    sb = None if sb_raw is None else int(sb_raw)
    view = StateView(board=board, scores=scores, current_player=cp,
                     solidarity_mode=sm, solidarity_beneficiary=sb)
    x = encode(view)
    policy = np.asarray(obj["policy"], dtype=np.float32)
    value = float(obj["value"])
    wdl_class = int(obj["wdl_class"])
    # Build relative legal-move mask
    move_mask = np.zeros(7, dtype=bool)
    mover_start = 0 if cp == 0 else 7
    for abs_pit in obj["valid"]:
        rel = int(abs_pit) - mover_start
        if 0 <= rel < 7:
            move_mask[rel] = True
    return EgtbSample(x=x, policy=policy, value=value,
                      wdl_class=wdl_class, move_mask=move_mask)


def iter_samples(jsonl_path: str | Path) -> Iterator[EgtbSample]:
    """Stream-parse a JSONL file one sample at a time (low memory)."""
    path = Path(jsonl_path)
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield _parse_line(line)


def load_all(jsonl_path: str | Path) -> dict[str, np.ndarray]:
    """
    Load an entire JSONL file into memory as stacked numpy arrays. Keys:
        "x"         (N, 16, 2, 7) float32
        "policy"    (N, 7)        float32
        "value"     (N,)          float32
        "wdl_class" (N,)          int64
        "move_mask" (N, 7)        bool
    """
    xs, policies, values, wdls, masks = [], [], [], [], []
    for s in iter_samples(jsonl_path):
        xs.append(s.x)
        policies.append(s.policy)
        values.append(s.value)
        wdls.append(s.wdl_class)
        masks.append(s.move_mask)
    return {
        "x": np.stack(xs, axis=0),
        "policy": np.stack(policies, axis=0),
        "value": np.asarray(values, dtype=np.float32),
        "wdl_class": np.asarray(wdls, dtype=np.int64),
        "move_mask": np.stack(masks, axis=0),
    }


def jsonl_to_npz(jsonl_path: str | Path, npz_path: str | Path) -> dict[str, int]:
    """
    One-shot conversion: parse JSONL, stack, save as compressed .npz.
    Returns a small summary dict (counts, timing).
    """
    t0 = time.time()
    arrays = load_all(jsonl_path)
    elapsed_load = time.time() - t0
    t1 = time.time()
    np.savez_compressed(npz_path, **arrays)
    elapsed_save = time.time() - t1
    return {
        "samples": int(arrays["x"].shape[0]),
        "load_sec": round(elapsed_load, 2),
        "save_sec": round(elapsed_save, 2),
    }


class EgtbDataset(Dataset):
    """
    torch Dataset over a preloaded set of EGTB samples.

    Accepts either a path to a .npz file (from `jsonl_to_npz`) or
    a dict of numpy arrays (from `load_all`).
    """

    def __init__(self, source: str | Path | dict[str, np.ndarray]):
        if isinstance(source, (str, Path)):
            data = np.load(source)
            self.x = data["x"]
            self.policy = data["policy"]
            self.value = data["value"]
            self.wdl_class = data["wdl_class"]
            self.move_mask = data["move_mask"]
        else:
            self.x = source["x"]
            self.policy = source["policy"]
            self.value = source["value"]
            self.wdl_class = source["wdl_class"]
            self.move_mask = source["move_mask"]

    def __len__(self) -> int:
        return int(self.x.shape[0])

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        return {
            "x": torch.from_numpy(self.x[idx]),
            "policy": torch.from_numpy(self.policy[idx]),
            "value": torch.tensor(self.value[idx], dtype=torch.float32),
            "wdl_class": torch.tensor(self.wdl_class[idx], dtype=torch.long),
            "move_mask": torch.from_numpy(self.move_mask[idx]),
        }


def describe(data: dict[str, np.ndarray] | EgtbDataset) -> dict[str, object]:
    """Quick sanity stats for a sample archive."""
    if isinstance(data, EgtbDataset):
        data = {
            "x": data.x,
            "policy": data.policy,
            "value": data.value,
            "wdl_class": data.wdl_class,
            "move_mask": data.move_mask,
        }
    n = int(data["x"].shape[0])
    wdl = data["wdl_class"]
    wins = int((wdl == 0).sum())
    draws = int((wdl == 1).sum())
    losses = int((wdl == 2).sum())
    vmean = float(data["value"].mean())
    policy_entropy = float(-(data["policy"] * np.log(data["policy"] + 1e-12)).sum(axis=1).mean())
    avg_legal_moves = float(data["move_mask"].sum(axis=1).mean())
    return {
        "samples": n,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "value_mean": round(vmean, 4),
        "avg_policy_entropy_nats": round(policy_entropy, 4),
        "avg_legal_moves": round(avg_legal_moves, 3),
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("usage: distillation.py <samples.jsonl> [out.npz]")
        sys.exit(2)
    jsonl = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else jsonl.replace(".jsonl", ".npz")
    info = jsonl_to_npz(jsonl, out)
    print(f"Converted {info['samples']} samples in {info['load_sec']}s load + {info['save_sec']}s save")
    ds = EgtbDataset(out)
    print(describe(ds))
