"""
Supervised pre-training of SongoNetV3 on EGTB-distilled samples.

This warm-starts the network from perfect-play targets before any self-play
iteration. The resulting checkpoint can then be used as the initial model
for the full self-play + distillation loop (M4 train_v3.py).

Loss formulation (mover-perspective):
    L = policy_CE + value_weight * value_MSE + wdl_weight * wdl_CE
        + score_diff_weight * score_diff_MSE + weight_decay_L2

Metrics tracked per epoch:
    - train/val total loss (mean)
    - policy CE, value MSE, WDL CE (component losses on val)
    - policy top-1 accuracy (fraction of samples where argmax(policy_pred)
      is in the set of optimal moves — i.e. policy_target[argmax] > 0)
    - WDL classifier accuracy

Usage:
    python pretrain_from_egtb.py \
        --data egtb-data/samples-n4.npz \
        --epochs 20 \
        --batch 512 \
        --device cuda \
        --out checkpoints/pretrain-v3
"""
from __future__ import annotations
import argparse
import json
import os
import time
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, random_split

from distillation import EgtbDataset, describe
from network_v3 import SongoNetV3, NetworkV3Config


@dataclass
class PretrainConfig:
    data_path: str
    out_dir: str = "checkpoints/pretrain-v3"
    epochs: int = 20
    batch_size: int = 512
    lr: float = 1e-3
    weight_decay: float = 1e-4
    val_frac: float = 0.1
    device: str = "cuda"
    seed: int = 0xC0FFEE
    # Loss weights
    value_weight: float = 1.0
    wdl_weight: float = 0.5
    score_diff_weight: float = 0.2
    # Net overrides (None = network_v3 defaults)
    num_blocks: int | None = None
    filters: int | None = None
    # Hardware
    num_workers: int = 0  # Windows + small dataset → 0 is fine


def build_model(cfg: PretrainConfig, device: str) -> SongoNetV3:
    net_cfg = NetworkV3Config()
    if cfg.num_blocks is not None:
        net_cfg.num_blocks = cfg.num_blocks
    if cfg.filters is not None:
        net_cfg.filters = cfg.filters
    model = SongoNetV3(net_cfg).to(device)
    return model


def compute_losses(
    batch: dict[str, torch.Tensor],
    out: dict[str, torch.Tensor],
    cfg: PretrainConfig,
) -> tuple[torch.Tensor, dict[str, float]]:
    """Combined multi-head loss. Returns (total_loss, per-head floats)."""
    log_p = F.log_softmax(out["policy"], dim=1)
    # Cross-entropy with soft target (soft_CE = -sum(p * log_q))
    loss_p = -(batch["policy"] * log_p).sum(dim=1).mean()

    loss_v = F.mse_loss(out["value"].squeeze(-1), batch["value"])
    loss_w = F.cross_entropy(out["wdl"], batch["wdl_class"])
    # Score-diff proxy: regress the (value ∈ {-1,0,+1}) same target for now
    # (later replaced by true (s1-s2)/36 when training data carries it).
    loss_sd = F.mse_loss(out["score_diff"].squeeze(-1), batch["value"])

    total = (loss_p
             + cfg.value_weight * loss_v
             + cfg.wdl_weight * loss_w
             + cfg.score_diff_weight * loss_sd)

    return total, {
        "total": float(total.item()),
        "policy": float(loss_p.item()),
        "value": float(loss_v.item()),
        "wdl": float(loss_w.item()),
        "score_diff": float(loss_sd.item()),
    }


@torch.no_grad()
def evaluate(
    model: SongoNetV3,
    loader: DataLoader,
    cfg: PretrainConfig,
    device: str,
) -> dict[str, float]:
    """Compute validation metrics. Returns dict of scalars."""
    model.eval()
    totals = {"total": 0.0, "policy": 0.0, "value": 0.0, "wdl": 0.0, "score_diff": 0.0}
    n = 0
    policy_top1_hits = 0
    wdl_correct = 0
    for batch in loader:
        batch = {k: v.to(device) for k, v in batch.items()}
        out = model(batch["x"])
        _, parts = compute_losses(batch, out, cfg)
        bsz = batch["x"].size(0)
        for k in totals:
            totals[k] += parts[k] * bsz
        n += bsz

        # Policy top-1: prediction argmax must be in the set of optimal moves
        pred_pit = out["policy"].argmax(dim=1)  # (B,)
        target_policy = batch["policy"]  # (B, 7)
        policy_top1_hits += int(
            (target_policy.gather(1, pred_pit.unsqueeze(1)).squeeze(1) > 0).sum().item()
        )
        # WDL accuracy
        wdl_pred = out["wdl"].argmax(dim=1)
        wdl_correct += int((wdl_pred == batch["wdl_class"]).sum().item())

    return {
        "total": totals["total"] / n,
        "policy": totals["policy"] / n,
        "value": totals["value"] / n,
        "wdl": totals["wdl"] / n,
        "score_diff": totals["score_diff"] / n,
        "policy_top1_acc": policy_top1_hits / n,
        "wdl_acc": wdl_correct / n,
        "n": n,
    }


def run_pretrain(cfg: PretrainConfig) -> dict[str, object]:
    """Execute the pre-training loop. Returns a summary dict."""
    torch.manual_seed(cfg.seed)
    np.random.seed(cfg.seed)

    device = cfg.device if torch.cuda.is_available() or cfg.device == "cpu" else "cpu"
    out_dir = Path(cfg.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[pretrain] device = {device}")

    # Data
    dataset = EgtbDataset(cfg.data_path)
    print(f"[pretrain] dataset loaded: {describe(dataset)}")

    n_total = len(dataset)
    n_val = max(1, int(n_total * cfg.val_frac))
    n_train = n_total - n_val
    gen = torch.Generator().manual_seed(cfg.seed)
    train_ds, val_ds = random_split(dataset, [n_train, n_val], generator=gen)
    print(f"[pretrain] split train={n_train} val={n_val}")

    train_loader = DataLoader(
        train_ds, batch_size=cfg.batch_size, shuffle=True,
        num_workers=cfg.num_workers, pin_memory=(device == "cuda"),
    )
    val_loader = DataLoader(
        val_ds, batch_size=cfg.batch_size, shuffle=False,
        num_workers=cfg.num_workers, pin_memory=(device == "cuda"),
    )

    # Model + optim
    model = build_model(cfg, device)
    n_params = model.count_parameters()
    print(f"[pretrain] model: {n_params:,} params ({n_params/1e6:.2f} M)")
    opt = torch.optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=cfg.epochs)

    best_val = float("inf")
    history: list[dict] = []

    for epoch in range(1, cfg.epochs + 1):
        t0 = time.time()
        model.train()
        epoch_totals = {"total": 0.0, "policy": 0.0, "value": 0.0, "wdl": 0.0, "score_diff": 0.0}
        n_seen = 0
        for batch in train_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            out = model(batch["x"])
            loss, parts = compute_losses(batch, out, cfg)
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            opt.step()
            bsz = batch["x"].size(0)
            for k in epoch_totals:
                epoch_totals[k] += parts[k] * bsz
            n_seen += bsz
        train_metrics = {k: v / n_seen for k, v in epoch_totals.items()}
        sched.step()

        val_metrics = evaluate(model, val_loader, cfg, device)

        elapsed = time.time() - t0
        log = {
            "epoch": epoch,
            "lr": opt.param_groups[0]["lr"],
            "elapsed_sec": round(elapsed, 2),
            "train": {k: round(v, 4) for k, v in train_metrics.items()},
            "val": {k: round(v, 4) for k, v in val_metrics.items()},
        }
        history.append(log)
        print(
            f"[epoch {epoch:02d}] {elapsed:5.1f}s  "
            f"train_total={train_metrics['total']:.3f}  "
            f"val_total={val_metrics['total']:.3f}  "
            f"val_pol={val_metrics['policy']:.3f}  "
            f"val_val={val_metrics['value']:.3f}  "
            f"pol_top1={val_metrics['policy_top1_acc']:.3f}  "
            f"wdl_acc={val_metrics['wdl_acc']:.3f}"
        )

        # Checkpoint best-of-val
        if val_metrics["total"] < best_val:
            best_val = val_metrics["total"]
            ckpt_path = out_dir / "model_best.pt"
            torch.save({
                "model": model.state_dict(),
                "config": asdict(cfg),
                "epoch": epoch,
                "val_total": best_val,
                "val_metrics": val_metrics,
            }, ckpt_path)

    # Always save last
    last_path = out_dir / "model_last.pt"
    torch.save({
        "model": model.state_dict(),
        "config": asdict(cfg),
        "epoch": cfg.epochs,
        "val_total": history[-1]["val"]["total"] if history else None,
    }, last_path)

    # Write history
    with (out_dir / "history.json").open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    return {
        "best_val_total": best_val,
        "final_val": history[-1]["val"] if history else None,
        "checkpoint": str(out_dir / "model_best.pt"),
        "history": history,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="Path to .npz EGTB samples")
    p.add_argument("--out", default="checkpoints/pretrain-v3")
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch", type=int, default=512)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--val-frac", type=float, default=0.1)
    p.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    p.add_argument("--seed", type=int, default=0xC0FFEE)
    p.add_argument("--value-weight", type=float, default=1.0)
    p.add_argument("--wdl-weight", type=float, default=0.5)
    p.add_argument("--score-diff-weight", type=float, default=0.2)
    p.add_argument("--num-blocks", type=int, default=None)
    p.add_argument("--filters", type=int, default=None)
    p.add_argument("--num-workers", type=int, default=0)
    args = p.parse_args()

    cfg = PretrainConfig(
        data_path=args.data,
        out_dir=args.out,
        epochs=args.epochs,
        batch_size=args.batch,
        lr=args.lr,
        weight_decay=args.weight_decay,
        val_frac=args.val_frac,
        device=args.device,
        seed=args.seed,
        value_weight=args.value_weight,
        wdl_weight=args.wdl_weight,
        score_diff_weight=args.score_diff_weight,
        num_blocks=args.num_blocks,
        filters=args.filters,
        num_workers=args.num_workers,
    )
    summary = run_pretrain(cfg)
    print()
    print(f"[DONE] best val total = {summary['best_val_total']:.4f}")
    print(f"       checkpoint = {summary['checkpoint']}")


if __name__ == "__main__":
    main()
