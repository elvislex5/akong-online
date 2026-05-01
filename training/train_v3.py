"""
Full AlphaZero-style training loop for SongoNetV3.

Each iteration runs:
  1. Self-play with the current champion → `data/iter-N/selfplay.npz`
  2. Mix with EGTB distillation samples in `egtb_ratio` proportion
  3. Train a candidate warm-started from the champion checkpoint
  4. Arena: pit candidate against champion (deterministic MCTS)
  5. Promote candidate if Wilson CI lower bound > win_threshold
     (backup previous champion to `champion_prev.pt` before overwriting)

Iteration state is persisted under `--run-dir`:
    run-dir/
      champion.pt            # current best model
      champion_prev.pt       # backup from last promotion
      iter-001/
        selfplay.npz
        candidate.pt
        history.json
        arena.json
      ...
      global_history.json

Usage:
    python train_v3.py --run-dir runs/v3-warmstart \
        --egtb egtb-data/samples-n4.npz \
        --iterations 5 \
        --selfplay-games 40 --selfplay-sims 120 \
        --arena-games 30 --arena-sims 100 \
        --init checkpoints/pretrain-v3/model_best.pt
"""
from __future__ import annotations
import argparse
import json
import shutil
import time
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import ConcatDataset, DataLoader, WeightedRandomSampler

from arena_v3 import ArenaConfig, load_model, pit
from distillation import EgtbDataset, describe
from network_v3 import SongoNetV3, NetworkV3Config
from pretrain_from_egtb import compute_losses, PretrainConfig, evaluate
from self_play_v3 import MctsConfig, SelfPlayEngine, records_to_npz


@dataclass
class TrainV3Config:
    run_dir: str
    egtb_path: str | None = None
    init_checkpoint: str | None = None

    iterations: int = 10
    selfplay_games: int = 40
    selfplay_sims: int = 120
    selfplay_buffer_iters: int = 5   # keep the most recent N iterations of self-play

    epochs_per_iter: int = 3
    batch_size: int = 512
    lr: float = 2e-4                  # fine-tuning LR (champion rollback learned)
    weight_decay: float = 1e-4
    egtb_ratio: float = 0.3           # fraction of batches drawn from EGTB distillation

    arena_games: int = 30
    arena_sims: int = 100
    arena_temperature_plies: int = 6  # stochastic opening for arena diversity
    win_threshold: float = 0.55
    alpha: float = 0.05

    device: str = "cuda"
    seed: int = 2026

    # Loss weights (same defaults as pretrain)
    value_weight: float = 1.0
    wdl_weight: float = 0.5
    score_diff_weight: float = 0.2


def new_network(cfg: TrainV3Config) -> SongoNetV3:
    return SongoNetV3(NetworkV3Config()).to(cfg.device)


def save_ckpt(model: SongoNetV3, path: Path, meta: dict | None = None):
    payload = {"model": model.state_dict()}
    if meta:
        payload.update(meta)
    torch.save(payload, path)


def load_model_cfg(path: Path, device: str) -> SongoNetV3:
    return load_model(str(path), device)


def run_selfplay(model: SongoNetV3, cfg: TrainV3Config, out_path: Path):
    """Generate self-play samples with the given model."""
    mcfg = MctsConfig(
        num_simulations=cfg.selfplay_sims,
        dirichlet_alpha=0.5,
        dirichlet_epsilon=0.25,
        temperature_start=1.0,
        temperature_end=0.1,
        temperature_threshold=15,
        # Batched MCTS: 15-25x speedup vs serial on GPU
        leaf_batch_size=64,
        virtual_loss=1.0,
    )
    engine = SelfPlayEngine(model, cfg.device, mcfg)
    rng = np.random.default_rng(cfg.seed)
    all_records: list[dict] = []
    t0 = time.time()
    for g in range(cfg.selfplay_games):
        recs = engine.play_game_batched(rng)
        all_records.extend(recs)
        if (g + 1) % max(1, cfg.selfplay_games // 5) == 0:
            print(f"  self-play {g+1}/{cfg.selfplay_games}  "
                  f"samples={len(all_records)}  elapsed={time.time()-t0:.1f}s")
    records_to_npz(all_records, out_path)
    print(f"  → saved {len(all_records)} samples to {out_path}")
    return len(all_records)


def build_selfplay_buffer(run_dir: Path, current_iter: int, buffer_iters: int) -> EgtbDataset | None:
    """Concatenate the most recent N iterations of self-play into one dataset."""
    paths: list[Path] = []
    for i in range(max(1, current_iter - buffer_iters + 1), current_iter + 1):
        p = run_dir / f"iter-{i:03d}" / "selfplay.npz"
        if p.exists():
            paths.append(p)
    if not paths:
        return None
    # Stack into single arrays for a uniform Dataset
    xs, pols, vals, wdls, masks = [], [], [], [], []
    for pth in paths:
        data = np.load(pth)
        xs.append(data["x"]); pols.append(data["policy"])
        vals.append(data["value"]); wdls.append(data["wdl_class"])
        masks.append(data["move_mask"])
    combined = {
        "x": np.concatenate(xs, axis=0),
        "policy": np.concatenate(pols, axis=0),
        "value": np.concatenate(vals, axis=0),
        "wdl_class": np.concatenate(wdls, axis=0),
        "move_mask": np.concatenate(masks, axis=0),
    }
    return EgtbDataset(combined)


def train_candidate(
    warm_start_ckpt: Path | None,
    sp_ds: EgtbDataset | None,
    egtb_ds: EgtbDataset | None,
    cfg: TrainV3Config,
) -> tuple[SongoNetV3, dict]:
    """Train a new candidate model from warm start, mixing self-play and EGTB."""
    device = cfg.device
    model = new_network(cfg)
    if warm_start_ckpt is not None and warm_start_ckpt.exists():
        ckpt = torch.load(warm_start_ckpt, weights_only=False, map_location=device)
        model.load_state_dict(ckpt["model"])
        print(f"  warm-started from {warm_start_ckpt}")

    # Build combined loader with weighted sampler
    ds_list: list[EgtbDataset] = []
    weights: list[float] = []
    if sp_ds is not None and len(sp_ds) > 0:
        ds_list.append(sp_ds)
        weights.append(1.0 - cfg.egtb_ratio)
    if egtb_ds is not None and len(egtb_ds) > 0:
        ds_list.append(egtb_ds)
        weights.append(cfg.egtb_ratio)
    if not ds_list:
        raise RuntimeError("no training data available (self-play empty, no EGTB)")

    combined = ConcatDataset(ds_list)
    sample_weights = []
    for w, ds in zip(weights, ds_list):
        per_sample_w = w / max(1, len(ds))
        sample_weights.extend([per_sample_w] * len(ds))
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(combined), replacement=True)
    loader = DataLoader(combined, batch_size=cfg.batch_size, sampler=sampler,
                        num_workers=0, pin_memory=(device == "cuda"))

    opt = torch.optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    loss_cfg = PretrainConfig(data_path="", value_weight=cfg.value_weight,
                              wdl_weight=cfg.wdl_weight,
                              score_diff_weight=cfg.score_diff_weight)

    history = []
    for epoch in range(1, cfg.epochs_per_iter + 1):
        model.train()
        epoch_totals = {"total": 0.0, "policy": 0.0, "value": 0.0, "wdl": 0.0, "score_diff": 0.0}
        n_seen = 0
        for batch in loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            out = model(batch["x"])
            loss, parts = compute_losses(batch, out, loss_cfg)
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            opt.step()
            bsz = batch["x"].size(0)
            for k in epoch_totals:
                epoch_totals[k] += parts[k] * bsz
            n_seen += bsz
        train_metrics = {k: v / n_seen for k, v in epoch_totals.items()}
        history.append({"epoch": epoch, "train": train_metrics})
        print(f"    epoch {epoch}/{cfg.epochs_per_iter}  total={train_metrics['total']:.3f}")

    return model, {"history": history, "buffer_sizes": [len(ds) for ds in ds_list],
                   "weights": weights, "total_samples_per_epoch": len(combined)}


def run_training(cfg: TrainV3Config):
    torch.manual_seed(cfg.seed)
    np.random.seed(cfg.seed)
    device = cfg.device if torch.cuda.is_available() or cfg.device == "cpu" else "cpu"
    run_dir = Path(cfg.run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    print(f"[train-v3] run_dir={run_dir}  device={device}")

    champion_ckpt = run_dir / "champion.pt"

    # Bootstrap champion if missing
    if not champion_ckpt.exists():
        if cfg.init_checkpoint:
            shutil.copy2(cfg.init_checkpoint, champion_ckpt)
            print(f"[bootstrap] copied {cfg.init_checkpoint} → {champion_ckpt}")
        else:
            print("[bootstrap] no init checkpoint, saving random-init network as champion")
            save_ckpt(new_network(cfg), champion_ckpt, {"epoch": 0, "iter": 0})

    egtb_ds = EgtbDataset(cfg.egtb_path) if cfg.egtb_path else None
    if egtb_ds:
        print(f"[egtb] {describe(egtb_ds)}")

    global_history = []
    t_global = time.time()
    for it in range(1, cfg.iterations + 1):
        print(f"\n=== iteration {it}/{cfg.iterations} ===")
        iter_dir = run_dir / f"iter-{it:03d}"
        iter_dir.mkdir(parents=True, exist_ok=True)

        # Idempotent resume: skip if iteration already fully complete
        if (iter_dir / "history.json").exists():
            print(f"  [skip] iteration {it} already complete")
            with (iter_dir / "history.json").open() as f:
                global_history.append(json.load(f))
            continue

        # 1) Self-play with the current champion
        champion_model = load_model_cfg(champion_ckpt, device)
        selfplay_path = iter_dir / "selfplay.npz"
        if not selfplay_path.exists():
            print("[self-play] generating …")
            run_selfplay(champion_model, cfg, selfplay_path)
        del champion_model  # free GPU mem

        # 2) Build mixed dataset
        sp_ds = build_selfplay_buffer(run_dir, it, cfg.selfplay_buffer_iters)

        # 3) Train candidate warm-started from champion
        print("[train] candidate (warm-start from champion)")
        candidate_model, train_info = train_candidate(champion_ckpt, sp_ds, egtb_ds, cfg)
        candidate_ckpt = iter_dir / "candidate.pt"
        save_ckpt(candidate_model, candidate_ckpt,
                  {"iter": it, "train": train_info["history"]})

        # 4) Arena
        print("[arena] candidate vs champion …")
        champion_model = load_model_cfg(champion_ckpt, device)
        arena_cfg = ArenaConfig(
            num_games=cfg.arena_games,
            num_simulations=cfg.arena_sims,
            temperature_plies=cfg.arena_temperature_plies,
            rng_seed=cfg.seed + it,  # different opening distribution per iter
            win_threshold=cfg.win_threshold,
            alpha=cfg.alpha,
            verbose=False,
        )
        arena_res = pit(candidate_model, champion_model, device, arena_cfg)
        with (iter_dir / "arena.json").open("w") as f:
            json.dump(arena_res.to_dict(), f, indent=2)
        print(f"  A(cand)={arena_res.wins_a}  B(champ)={arena_res.wins_b}  D={arena_res.draws}  "
              f"rate={arena_res.a_win_rate:.3f}  CI=[{arena_res.wilson_lower:.3f},"
              f"{arena_res.wilson_upper:.3f}]  promote={arena_res.promote}")

        # 5) Promote if warranted
        promoted = False
        if arena_res.promote:
            prev_path = run_dir / "champion_prev.pt"
            shutil.copy2(champion_ckpt, prev_path)
            shutil.copy2(candidate_ckpt, champion_ckpt)
            promoted = True
            print(f"  PROMOTED. Backup: {prev_path}")

        iter_log = {
            "iter": it,
            "selfplay_samples": int(sp_ds.x.shape[0]) if sp_ds is not None else 0,
            "buffer_sizes": train_info["buffer_sizes"],
            "buffer_weights": train_info["weights"],
            "total_samples_per_epoch": train_info["total_samples_per_epoch"],
            "arena": arena_res.to_dict(),
            "promoted": promoted,
            "elapsed_sec": round(time.time() - t_global, 2),
        }
        with (iter_dir / "history.json").open("w") as f:
            json.dump({"train": train_info["history"], **iter_log}, f, indent=2)
        global_history.append(iter_log)
        with (run_dir / "global_history.json").open("w") as f:
            json.dump(global_history, f, indent=2)

        del candidate_model, champion_model

    print(f"\n[DONE] {cfg.iterations} iterations in {time.time()-t_global:.1f}s")
    print(f"       champion = {champion_ckpt}")
    return global_history


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--run-dir", required=True)
    p.add_argument("--egtb", default=None, help=".npz EGTB distillation samples")
    p.add_argument("--init", default=None, help="initial champion .pt (else random)")
    p.add_argument("--iterations", type=int, default=10)
    p.add_argument("--selfplay-games", type=int, default=40)
    p.add_argument("--selfplay-sims", type=int, default=120)
    p.add_argument("--buffer-iters", type=int, default=5)
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch", type=int, default=512)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--egtb-ratio", type=float, default=0.3)
    p.add_argument("--arena-games", type=int, default=30)
    p.add_argument("--arena-sims", type=int, default=100)
    p.add_argument("--arena-temp-plies", type=int, default=6,
                   help="stochastic-opening plies for arena (0 = fully deterministic)")
    p.add_argument("--win-threshold", type=float, default=0.55)
    p.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    p.add_argument("--seed", type=int, default=2026)
    args = p.parse_args()

    cfg = TrainV3Config(
        run_dir=args.run_dir,
        egtb_path=args.egtb,
        init_checkpoint=args.init,
        iterations=args.iterations,
        selfplay_games=args.selfplay_games,
        selfplay_sims=args.selfplay_sims,
        selfplay_buffer_iters=args.buffer_iters,
        epochs_per_iter=args.epochs,
        batch_size=args.batch,
        lr=args.lr,
        egtb_ratio=args.egtb_ratio,
        arena_games=args.arena_games,
        arena_sims=args.arena_sims,
        arena_temperature_plies=args.arena_temp_plies,
        win_threshold=args.win_threshold,
        device=args.device,
        seed=args.seed,
    )
    run_training(cfg)


if __name__ == "__main__":
    main()
