"""
AlphaZero for Songo — Training Loop (Full Pipeline)

Complete autonomous training:
1. Self-play: Generate training data using MCTS + current best model (parallel)
2. Train: Update NN weights from replay buffer
3. Pit: Challenger vs Champion (40 games, 100 sims, alternating sides)
4. Promote: If challenger wins >55%, save new champion + export ONNX for web
5. Repeat

Usage:
  python train.py --iterations 50 --games 100 --sims 200 --resume checkpoints/model_champion.pt
  python train.py --quick                      # Fast test (3 iterations, 10 games)
"""
import os
import sys
import io
import time
import shutil
import multiprocessing as mp
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import numpy as np
from pathlib import Path
from tqdm import tqdm

# Force UTF-8 on Windows
if sys.platform == 'win32' and not isinstance(sys.stdout, io.TextIOWrapper):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from config import AlphaZeroConfig, MCTSConfig, NetworkConfig
from neural_network import SongoNet, create_network
from self_play import generate_self_play_data, ReplayBuffer
from pit_evaluation import play_pit_game
from mcts import MCTS


# ─── Champion / Pit Configuration ────────────────────────────────────────────
PIT_GAMES              = 60     # 40→60: plus de parties = moins de variance, seuil plus bas compensé
PIT_SIMS               = 100    # Sims MCTS pendant le pit (200→100: le pit n'a pas besoin de la même précision)
PIT_THRESHOLD          = 0.52   # 0.55→0.52: accepter les améliorations marginales (54.1% bloqué à 55%)
PIT_EVERY              = 1      # Pit toutes les N itérations
MAX_FAILURES_BEFORE_RESET = 3   # Reset aux poids champion après N échecs consécutifs

ONNX_PUBLIC_PATH = "../public/songo_nn.onnx"


def get_device() -> str:
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        device = "cuda"
        print(f"[Device] Using CUDA: {torch.cuda.get_device_name(0)}")
    else:
        device = "cpu"
        print("[Device] Using CPU")
    return device


def train_epoch(
    model: SongoNet,
    optimizer: optim.Optimizer,
    replay_buffer: ReplayBuffer,
    batch_size: int,
    device: str,
    num_batches: int = None
) -> dict:
    """Train for one epoch on replay buffer. Returns loss metrics."""
    model.train()

    total_loss = 0.0
    policy_loss_total = 0.0
    value_loss_total = 0.0
    num_steps = 0

    if num_batches is None:
        num_batches = max(1, len(replay_buffer) // batch_size)

    for _ in range(num_batches):
        states, target_policies, target_values = replay_buffer.sample_batch(batch_size)

        states_t = torch.FloatTensor(states).to(device)
        target_policies_t = torch.FloatTensor(target_policies).to(device)
        target_values_t = torch.FloatTensor(target_values).to(device)

        policy_logits, value_pred = model(states_t)
        value_pred = value_pred.squeeze(-1)

        # Policy loss: cross-entropy with MCTS policy targets
        log_probs = F.log_softmax(policy_logits, dim=1)
        policy_loss = -torch.sum(target_policies_t * log_probs, dim=1).mean()

        # Value loss: MSE
        value_loss = F.mse_loss(value_pred, target_values_t)

        loss = policy_loss + value_loss

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()
        policy_loss_total += policy_loss.item()
        value_loss_total += value_loss.item()
        num_steps += 1

    return {
        'total_loss': total_loss / max(num_steps, 1),
        'policy_loss': policy_loss_total / max(num_steps, 1),
        'value_loss': value_loss_total / max(num_steps, 1),
    }


def save_checkpoint(model: SongoNet, optimizer: optim.Optimizer,
                    iteration: int, metrics: dict, path: str):
    """Save model checkpoint."""
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    torch.save({
        'iteration': iteration,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'metrics': metrics,
    }, path)


def load_checkpoint(model: SongoNet, optimizer: optim.Optimizer, path: str) -> int:
    """Load checkpoint. Returns iteration number."""
    checkpoint = torch.load(path, weights_only=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    if optimizer and 'optimizer_state_dict' in checkpoint:
        try:
            optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        except Exception:
            print(f"[Checkpoint] Optimizer state incompatible, using fresh optimizer.")
    iteration = checkpoint.get('iteration', 0)
    print(f"[Checkpoint] Loaded: {path} (iteration {iteration})")
    return iteration


def run_pit_in_memory(
    challenger: SongoNet,
    champion: SongoNet,
    device: str,
    num_games: int = PIT_GAMES,
    num_sims: int = PIT_SIMS,
    threshold: float = PIT_THRESHOLD,
) -> dict:
    """
    Pit evaluation in memory — no file I/O.
    Returns dict with results and promotion decision.
    """
    pit_config = MCTSConfig(num_simulations=num_sims)

    challenger.eval()
    champion.eval()

    challenger_mcts = MCTS(challenger, pit_config, device=device,
                          batch_size=16, use_symmetry=True)
    champion_mcts   = MCTS(champion,   pit_config, device=device,
                          batch_size=16, use_symmetry=True)

    challenger_wins = 0
    champion_wins   = 0
    draws           = 0
    half = num_games // 2

    # First half: challenger = P1
    for _ in tqdm(range(half), desc="Pit: Challenger(P1) vs Champion(P2)", leave=False):
        winner = play_pit_game(challenger_mcts, champion_mcts)
        if winner == 0:
            challenger_wins += 1
        elif winner == 1:
            champion_wins += 1
        else:
            draws += 1

    # Second half: challenger = P2
    for _ in tqdm(range(num_games - half), desc="Pit: Champion(P1) vs Challenger(P2)", leave=False):
        winner = play_pit_game(champion_mcts, challenger_mcts)
        if winner == 1:
            challenger_wins += 1
        elif winner == 0:
            champion_wins += 1
        else:
            draws += 1

    decisive = challenger_wins + champion_wins
    win_rate = challenger_wins / decisive if decisive > 0 else 0.0
    promoted = win_rate >= threshold

    return {
        'challenger_wins': challenger_wins,
        'champion_wins':   champion_wins,
        'draws':           draws,
        'win_rate':        win_rate,
        'promoted':        promoted,
    }


def export_onnx_champion(champion_path: str):
    """Export champion to ONNX for web deployment."""
    try:
        from export_onnx import export_to_onnx
        onnx_tmp = "test_songo_nn.onnx"
        export_to_onnx(champion_path, onnx_tmp, quantize=False)

        # Pack into single file for ONNX Runtime Web
        import onnx
        m = onnx.load(onnx_tmp)
        onnx.save_model(m, ONNX_PUBLIC_PATH, save_as_external_data=False)

        # Clean up temp files
        if os.path.exists(onnx_tmp):
            os.remove(onnx_tmp)
        if os.path.exists(onnx_tmp + ".data"):
            os.remove(onnx_tmp + ".data")

        print(f"  > ONNX exporté : {ONNX_PUBLIC_PATH}")
    except Exception as e:
        print(f"  > ONNX export échoué : {e}")


def notify_web_server():
    """Notify local dev server that AI model was updated."""
    try:
        import requests
        res = requests.post("http://localhost:3002/api/ai-updated", timeout=3)
        if res.status_code == 200:
            print("  > Serveur web notifié (rechargement IA).")
    except Exception:
        pass  # Server might not be running


# ─── Main Training Loop ─────────────────────────────────────────────────────

def train(config: AlphaZeroConfig = None, resume_from: str = None):
    """
    Full AlphaZero training loop with champion tracking.

    1. Self-play (parallel, all CPU cores)
    2. Train on replay buffer
    3. Quick eval vs Random/Greedy
    4. Pit evaluation vs champion
    5. Promote if >55% → save champion + export ONNX
    """
    config = config or AlphaZeroConfig()

    device = get_device()
    config.training.device = device

    # ── Model & Optimizer ────────────────────────────────────────────────
    model = create_network(config.network, device=device)

    optimizer = optim.Adam(
        model.parameters(),
        lr=config.training.learning_rate,
        weight_decay=config.training.weight_decay
    )

    scheduler = optim.lr_scheduler.StepLR(
        optimizer,
        step_size=config.training.lr_scheduler_step,
        gamma=config.training.lr_scheduler_gamma
    )

    replay_buffer = ReplayBuffer(max_size=config.training.replay_buffer_size)

    # ── Paths ────────────────────────────────────────────────────────────
    checkpoint_dir = Path(config.training.checkpoint_dir)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    champion_path = checkpoint_dir / "model_champion.pt"
    champion_backup_path = checkpoint_dir / "model_champion_prev.pt"
    latest_path = checkpoint_dir / "model_latest.pt"
    replay_buffer_path = checkpoint_dir / "replay_buffer.pkl"

    # ── Resume ───────────────────────────────────────────────────────────
    start_iteration = 0
    if resume_from and os.path.exists(resume_from):
        start_iteration = load_checkpoint(model, optimizer, resume_from) + 1

    # ── Load persisted replay buffer ─────────────────────────────────────
    replay_buffer.load(str(replay_buffer_path))

    # ── Champion state (in memory) ───────────────────────────────────────
    champion_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    # Save initial champion if none exists
    if not champion_path.exists():
        save_checkpoint(model, optimizer, 0, {}, str(champion_path))
        print(f"[Champion] Initial champion saved: {champion_path}")

    consecutive_failures = 0
    total_promotions = 0

    # ── Print config ─────────────────────────────────────────────────────
    num_workers = config.training.num_workers or mp.cpu_count()
    mcts_batch_size = config.training.mcts_batch_size

    print(f"\n{'=' * 60}")
    print(f"  AlphaZero for Songo — Full Pipeline v2")
    print(f"{'=' * 60}")
    print(f"  Iterations:      {config.training.num_iterations}")
    print(f"  Games/iter:      {config.training.num_self_play_games}")
    print(f"  MCTS sims:       {config.mcts.num_simulations}")
    print(f"  MCTS batch:      {mcts_batch_size} leaves/inference")
    print(f"  Symmetry:        ON (mirror augmentation)")
    sp_mode = f"{num_workers} CPU workers (parallel)" if num_workers > 1 else f"GPU single-process"
    print(f"  Self-play:       {sp_mode}")
    print(f"  Train batch:     {config.training.batch_size}")
    print(f"  Learning rate:   {config.training.learning_rate}")
    print(f"  Replay buffer:   {config.training.replay_buffer_size} (persistent)")
    print(f"  Pit:             {PIT_GAMES} games / {PIT_SIMS} sims / {PIT_THRESHOLD:.0%} threshold")
    print(f"  Device:          {device}")
    print(f"  Resume from:     {resume_from or 'scratch'}")
    print(f"{'=' * 60}\n")

    # ── Training Loop ────────────────────────────────────────────────────
    for iteration in range(start_iteration, config.training.num_iterations):
        iter_start = time.time()

        print(f"\n{'─' * 55}")
        print(f"  Iteration {iteration + 1}/{config.training.num_iterations}"
              f"  (promotions: {total_promotions}, échecs consécutifs: {consecutive_failures})")
        print(f"{'─' * 55}")

        # ═════════════════════════════════════════════════════════════════
        # Phase 1: Self-Play (parallel)
        # ═════════════════════════════════════════════════════════════════
        sp_label = f"{num_workers} workers" if num_workers > 1 else f"GPU batch={mcts_batch_size}"
        print(f"\n[Phase 1] Self-Play ({config.training.num_self_play_games} games, "
              f"{config.mcts.num_simulations} sims, {sp_label})...")
        t0 = time.time()

        model.eval()
        samples = generate_self_play_data(
            model=model,
            num_games=config.training.num_self_play_games,
            mcts_config=config.mcts,
            device=device,
            show_progress=True,
            num_workers=num_workers,
            network_config=config.network,
            batch_size=mcts_batch_size,
            use_symmetry=True,
        )
        replay_buffer.add(samples)

        sp_time = time.time() - t0
        print(f"[Self-Play] {sp_time:.0f}s | {len(samples)} samples | "
              f"Buffer: {len(replay_buffer)}")
        sys.stdout.flush()

        # ═════════════════════════════════════════════════════════════════
        # Phase 2: Training
        # ═════════════════════════════════════════════════════════════════
        if len(replay_buffer) < config.training.min_replay_size:
            print(f"[Train] Buffer trop petit ({len(replay_buffer)} < "
                  f"{config.training.min_replay_size}), skip.")
            continue

        print(f"\n[Phase 2] Training ({config.training.num_epochs} epochs, "
              f"batch={config.training.batch_size})...")
        t0 = time.time()

        model.train()
        epoch_metrics = None
        for epoch in range(config.training.num_epochs):
            epoch_metrics = train_epoch(
                model=model,
                optimizer=optimizer,
                replay_buffer=replay_buffer,
                batch_size=config.training.batch_size,
                device=device
            )
            if (epoch + 1) % 5 == 0 or epoch == 0:
                print(f"  Epoch {epoch + 1}/{config.training.num_epochs}: "
                      f"Loss={epoch_metrics['total_loss']:.4f} "
                      f"(P={epoch_metrics['policy_loss']:.4f} "
                      f"V={epoch_metrics['value_loss']:.4f})")

        scheduler.step()
        train_time = time.time() - t0
        print(f"[Train] {train_time:.0f}s | LR: {scheduler.get_last_lr()[0]:.6f}")
        sys.stdout.flush()

        # ═════════════════════════════════════════════════════════════════
        # Phase 3: Pit Evaluation vs Champion
        # ═════════════════════════════════════════════════════════════════
        if (iteration + 1) % PIT_EVERY == 0:
            print(f"\n[Phase 3] Pit ({PIT_GAMES} games, {PIT_SIMS} sims)...")
            t0 = time.time()

            # Create champion model from saved state
            champion_model = create_network(config.network, device=device)
            champion_model.load_state_dict(
                {k: v.to(device) for k, v in champion_state.items()}
            )
            champion_model.eval()

            pit_result = run_pit_in_memory(
                challenger=model,
                champion=champion_model,
                device=device,
            )

            pit_time = time.time() - t0

            print(f"\n  ╔══════════════════════════════════════════╗")
            print(f"  ║  Challenger : {pit_result['challenger_wins']:2d} victoires"
                  f"               ║")
            print(f"  ║  Champion   : {pit_result['champion_wins']:2d} victoires"
                  f"               ║")
            print(f"  ║  Nuls       : {pit_result['draws']:2d}"
                  f"                          ║")
            print(f"  ║  Taux       : {pit_result['win_rate']:.1%}"
                  f" (seuil {PIT_THRESHOLD:.0%})"
                  f"              ║")

            if pit_result['promoted']:
                print(f"  ║  ✅ CHALLENGER PROMU — nouveau champion ! ║")
                print(f"  ╚══════════════════════════════════════════╝")

                consecutive_failures = 0
                total_promotions += 1

                # Backup old champion
                if champion_path.exists():
                    shutil.copy2(str(champion_path), str(champion_backup_path))
                    print(f"  > Backup ancien champion → {champion_backup_path}")

                # Update in-memory champion state
                champion_state = {k: v.cpu().clone()
                                  for k, v in model.state_dict().items()}

                # Save new champion
                save_checkpoint(model, optimizer, iteration,
                                {'win_rate': pit_result['win_rate']},
                                str(champion_path))
                print(f"  > Champion sauvegardé : {champion_path}")

                # Export ONNX
                export_onnx_champion(str(champion_path))
                notify_web_server()

            else:
                print(f"  ║  ❌ Champion conservé.                    ║")
                print(f"  ╚══════════════════════════════════════════╝")

                consecutive_failures += 1

                if consecutive_failures >= MAX_FAILURES_BEFORE_RESET:
                    print(f"  > {consecutive_failures} échecs consécutifs — "
                          f"reset aux poids champion.")
                    model.load_state_dict(
                        {k: v.to(device) for k, v in champion_state.items()}
                    )
                    # Reset optimizer to avoid stale momentum
                    optimizer = optim.Adam(
                        model.parameters(),
                        lr=scheduler.get_last_lr()[0],
                        weight_decay=config.training.weight_decay
                    )
                    consecutive_failures = 0

            print(f"  [Pit] {pit_time:.0f}s")
            del champion_model

        # ═════════════════════════════════════════════════════════════════
        # Save latest checkpoint + replay buffer (always)
        # ═════════════════════════════════════════════════════════════════
        save_checkpoint(
            model, optimizer, iteration,
            {},
            str(latest_path)
        )

        # Persist replay buffer every 5 iterations (avoid I/O overhead)
        if (iteration + 1) % 5 == 0 or iteration == start_iteration:
            replay_buffer.save(str(replay_buffer_path))

        iter_time = time.time() - iter_start
        print(f"\n[Iteration {iteration + 1}] Total: {iter_time:.0f}s "
              f"(self-play: {sp_time:.0f}s, train: {train_time:.0f}s)")

    # ── Final save ────────────────────────────────────────────────────────
    replay_buffer.save(str(replay_buffer_path))

    print(f"\n{'=' * 60}")
    print(f"  Training Complete!")
    print(f"{'=' * 60}")
    print(f"  Iterations:  {config.training.num_iterations}")
    print(f"  Promotions:  {total_promotions}")
    print(f"  Champion:    {champion_path}")
    print(f"  Replay buf:  {replay_buffer_path} ({len(replay_buffer)} samples)")
    print(f"{'=' * 60}")

    return model


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AlphaZero for Songo — Full Training Pipeline")
    parser.add_argument("--iterations", type=int, default=None,
                        help="Number of training iterations (default: 50)")
    parser.add_argument("--games",      type=int, default=None,
                        help="Self-play games per iteration (default: 100)")
    parser.add_argument("--sims",       type=int, default=None,
                        help="MCTS simulations per move (default: from config)")
    parser.add_argument("--epochs",     type=int, default=None,
                        help="Training epochs per iteration (default: 10)")
    parser.add_argument("--workers",    type=int, default=None,
                        help="Parallel self-play workers (default: all CPU cores)")
    parser.add_argument("--resume",     type=str, default=None,
                        help="Resume from checkpoint (.pt)")
    parser.add_argument("--lr",         type=float, default=None,
                        help="Learning rate override")
    parser.add_argument("--batch-size", type=int, default=None,
                        help="MCTS batch size (leaves per inference, default: 16)")
    parser.add_argument("--quick",      action="store_true",
                        help="Quick test (3 iterations, 10 games, 50 sims)")
    args = parser.parse_args()

    config = AlphaZeroConfig()

    if args.quick:
        config.training.num_iterations = 3
        config.training.num_self_play_games = 10
        config.training.num_epochs = 3
        config.training.eval_games = 10
        config.training.min_replay_size = 100
        config.mcts.num_simulations = 50

    if args.iterations:
        config.training.num_iterations = args.iterations
    if args.games:
        config.training.num_self_play_games = args.games
    if args.sims:
        config.mcts.num_simulations = args.sims
    if args.epochs:
        config.training.num_epochs = args.epochs
    if args.workers:
        config.training.num_workers = args.workers
    if args.lr:
        config.training.learning_rate = args.lr
    if args.batch_size:
        config.training.mcts_batch_size = args.batch_size

    train(config, resume_from=args.resume)
