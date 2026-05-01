"""
AlphaZero for Songo — Self-Play Data Generation

v2: GPU-accelerated self-play with batched MCTS.

Plays complete games using MCTS + NN, collecting training data:
- (encoded_state, mcts_policy, game_result) triplets

Key changes from v1:
- Main process uses GPU with batched MCTS (much faster than CPU workers)
- Parallel CPU workers available as fallback
- ReplayBuffer can be persisted to disk
"""
import os
import pickle
import numpy as np
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import List, Tuple
from tqdm import tqdm

from songo_game import SongoGame
from neural_network import SongoNet
from mcts import MCTS, mirror_encoded_state, mirror_policy
from config import MCTSConfig, NetworkConfig, TrainingConfig


# Type alias for training samples
# (state_encoding, mcts_policy, result_from_current_player_perspective)
TrainingSample = Tuple[np.ndarray, np.ndarray, float]

# Return type for a single self-play game: (samples, winner)
GameResult = Tuple[List[TrainingSample], int]


def _worker_play_games(
    model_state_dict: dict,
    network_config: NetworkConfig,
    mcts_config: MCTSConfig,
    num_games: int,
    batch_size: int = 8,
    use_symmetry: bool = True,
) -> Tuple[List[TrainingSample], dict]:
    """
    Module-level worker for parallel self-play (CPU fallback).
    Each worker process recreates the model from its state dict.
    """
    from neural_network import create_network
    model = create_network(network_config, device="cpu")
    model.load_state_dict(model_state_dict)
    model.eval()
    engine = MCTS(model, mcts_config, device="cpu",
                  batch_size=batch_size, use_symmetry=use_symmetry)
    samples: List[TrainingSample] = []
    game_results = {0: 0, 1: 0, -1: 0}
    for _ in range(num_games):
        game_samples, winner = play_self_play_game(engine, mcts_config)
        samples.extend(game_samples)
        if winner == 0:
            game_results[0] += 1
        elif winner == 1:
            game_results[1] += 1
        else:
            game_results[-1] += 1
    return samples, game_results


def play_self_play_game(
    mcts_engine: MCTS,
    config: MCTSConfig,
    max_moves: int = 300,
    augment: bool = True,
) -> GameResult:
    """
    Play a single self-play game and collect training data.
    If augment=True, also adds mirror-augmented samples.

    Returns:
        (samples, winner)
    """
    game = SongoGame()
    history: List[Tuple[np.ndarray, np.ndarray, int]] = []

    move_num = 0

    while not game.is_terminal and move_num < max_moves:
        if move_num < config.temperature_threshold:
            temperature = config.temperature_start
        else:
            temperature = config.temperature_end

        state = game.encode_state()
        current_player = game.current_player

        action, action_probs = mcts_engine.get_action(
            game,
            temperature=temperature,
            add_noise=True
        )

        history.append((state, action_probs, current_player))

        pit_index = game.action_to_pit_index(action)
        game.execute_move(pit_index)
        move_num += 1

    if not game.is_terminal:
        game._resolve_stalemate()

    # Assign results to all positions
    samples: List[TrainingSample] = []
    for state, policy, player in history:
        result = game.get_result(player)
        samples.append((state, policy, result))

        # Mirror augmentation: double the data
        if augment:
            m_state = mirror_encoded_state(state)
            m_policy = mirror_policy(policy)
            samples.append((m_state, m_policy, result))

    winner = game.winner if game.winner is not None else -1
    return samples, winner


def generate_self_play_data(
    model: SongoNet,
    num_games: int,
    mcts_config: MCTSConfig,
    device: str = "cpu",
    show_progress: bool = True,
    num_workers: int = 1,
    network_config: NetworkConfig = None,
    batch_size: int = 16,
    use_symmetry: bool = True,
) -> List[TrainingSample]:
    """
    Generate training data from self-play games.

    Strategy:
    - num_workers > 1: parallel CPU workers (best for Python-heavy MCTS)
      Each worker gets its own model copy on CPU. Linear speedup with cores.
      The GPU is NOT the bottleneck — Python tree operations are.
    - num_workers <= 1: single-process on specified device (GPU or CPU)
    """
    # Parallel CPU workers: use all cores for MCTS tree operations
    if num_workers > 1:
        return _generate_parallel(
            model, num_games, mcts_config, num_workers,
            network_config or NetworkConfig(), show_progress,
            batch_size, use_symmetry
        )

    # Single-process (GPU batched or CPU sequential)
    return _generate_gpu(
        model, num_games, mcts_config, device,
        show_progress, batch_size, use_symmetry
    )


def _generate_gpu(
    model: SongoNet,
    num_games: int,
    mcts_config: MCTSConfig,
    device: str,
    show_progress: bool,
    batch_size: int,
    use_symmetry: bool,
) -> List[TrainingSample]:
    """GPU-accelerated self-play: single process, batched inference."""
    mcts_engine = MCTS(model, mcts_config, device=device,
                       batch_size=batch_size, use_symmetry=use_symmetry)
    all_samples: List[TrainingSample] = []

    game_results = {0: 0, 1: 0, -1: 0}
    total_moves = 0

    iterator = range(num_games)
    if show_progress:
        iterator = tqdm(iterator, desc=f"Self-play ({device})", unit="game")

    for _ in iterator:
        samples, winner = play_self_play_game(mcts_engine, mcts_config)
        all_samples.extend(samples)
        total_moves += len(samples)

        if winner == 0:
            game_results[0] += 1
        elif winner == 1:
            game_results[1] += 1
        else:
            game_results[-1] += 1

        if show_progress:
            games_done = iterator.n if hasattr(iterator, 'n') else 1
            avg_moves = total_moves / max(games_done, 1)
            iterator.set_postfix({
                'samples': len(all_samples),
                'avg_len': f'{avg_moves:.0f}',
                'P1': game_results[0],
                'P2': game_results[1],
                'D': game_results[-1]
            })

    print(f"\n[Self-Play] Generated {len(all_samples)} samples from {num_games} games")
    print(f"[Self-Play] Results: P1={game_results[0]} P2={game_results[1]} Draw={game_results[-1]}")
    actual_games = sum(game_results.values())
    print(f"[Self-Play] Avg game length: {total_moves / max(actual_games, 1):.1f} samples/game")

    return all_samples


def _generate_parallel(
    model: SongoNet,
    num_games: int,
    mcts_config: MCTSConfig,
    num_workers: int,
    network_config: NetworkConfig,
    show_progress: bool,
    batch_size: int,
    use_symmetry: bool,
) -> List[TrainingSample]:
    """Parallel self-play using ProcessPoolExecutor (CPU workers)."""
    import torch
    import sys

    base = num_games // num_workers
    remainder = num_games % num_workers
    games_per_worker = [base + (1 if i < remainder else 0) for i in range(num_workers)]
    games_per_worker = [n for n in games_per_worker if n > 0]
    actual_workers = len(games_per_worker)

    model_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    print(f"[Self-Play] Parallel mode: {actual_workers} workers x ~{games_per_worker[0]} games")

    all_samples: List[TrainingSample] = []
    total_moves = 0
    games_done = 0
    total_results = {0: 0, 1: 0, -1: 0}

    bar = tqdm(total=num_games, desc="Self-play (parallel)", unit="game") if show_progress else None

    # Use 'spawn' context on Linux/Colab to avoid CUDA fork issues
    mp_context = mp.get_context('spawn') if sys.platform != 'win32' else None

    with ProcessPoolExecutor(max_workers=actual_workers, mp_context=mp_context) as executor:
        futures = {
            executor.submit(
                _worker_play_games, model_state_dict, network_config,
                mcts_config, n, batch_size, use_symmetry
            ): n
            for n in games_per_worker
        }
        for future in as_completed(futures):
            batch_games = futures[future]
            batch_samples, batch_results = future.result()
            all_samples.extend(batch_samples)
            total_moves += len(batch_samples)
            games_done += batch_games
            for k, v in batch_results.items():
                total_results[k] += v
            if bar is not None:
                bar.update(batch_games)
                avg_len = total_moves / max(games_done, 1)
                bar.set_postfix({
                    'samples': len(all_samples),
                    'avg_len': f'{avg_len:.0f}',
                    'P1': total_results[0],
                    'P2': total_results[1],
                    'D': total_results[-1],
                })

    if bar is not None:
        bar.close()

    print(f"\n[Self-Play] Generated {len(all_samples)} samples from {num_games} games")
    print(f"[Self-Play] Results: P1={total_results[0]} P2={total_results[1]} Draw={total_results[-1]}")
    print(f"[Self-Play] Avg game length: {total_moves / num_games:.1f} samples/game")

    return all_samples


class ReplayBuffer:
    """Fixed-size replay buffer with disk persistence."""

    def __init__(self, max_size: int = 150_000):
        self.max_size = max_size
        self.buffer: List[TrainingSample] = []

    def add(self, samples: List[TrainingSample]):
        """Add samples to buffer, evicting oldest if full."""
        self.buffer.extend(samples)
        if len(self.buffer) > self.max_size:
            self.buffer = self.buffer[-self.max_size:]

    def sample_batch(self, batch_size: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Sample a random batch from the buffer."""
        indices = np.random.choice(
            len(self.buffer),
            size=min(batch_size, len(self.buffer)),
            replace=False
        )

        states = np.array([self.buffer[i][0] for i in indices], dtype=np.float32)
        policies = np.array([self.buffer[i][1] for i in indices], dtype=np.float32)
        values = np.array([self.buffer[i][2] for i in indices], dtype=np.float32)

        return states, policies, values

    def save(self, path: str):
        """Persist replay buffer to disk."""
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump({
                'buffer': self.buffer,
                'max_size': self.max_size,
            }, f, protocol=pickle.HIGHEST_PROTOCOL)
        print(f"[ReplayBuffer] Saved {len(self.buffer)} samples to {path}")

    def load(self, path: str) -> bool:
        """Load replay buffer from disk. Returns True if loaded successfully."""
        if not os.path.exists(path):
            return False
        try:
            with open(path, 'rb') as f:
                data = pickle.load(f)
            self.buffer = data['buffer']
            self.max_size = data.get('max_size', self.max_size)
            print(f"[ReplayBuffer] Loaded {len(self.buffer)} samples from {path}")
            return True
        except Exception as e:
            print(f"[ReplayBuffer] Failed to load {path}: {e}")
            return False

    def __len__(self):
        return len(self.buffer)


if __name__ == "__main__":
    import argparse
    import json
    import uuid
    import datetime
    import torch
    from neural_network import create_network
    from config import NetworkConfig, MCTSConfig

    parser = argparse.ArgumentParser(description="Self-play data generation")
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to model checkpoint (.pt)")
    parser.add_argument("--games",      type=int, default=10,  help="Number of games to play")
    parser.add_argument("--sims",       type=int, default=200, help="MCTS simulations per move")
    parser.add_argument("--output",     type=str, default="human_games_queue", help="Output directory")
    parser.add_argument("--batch-size", type=int, default=16,  help="MCTS batch size")
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Self-Play] Device: {device}")

    def load_checkpoint(path, model, device):
        if path and os.path.exists(path):
            ckpt = torch.load(path, map_location=device, weights_only=False)
            model.load_state_dict(ckpt['model_state_dict'])
            model.eval()
            return os.path.getmtime(path)
        return None

    model = create_network(NetworkConfig(), device=device)
    ckpt_mtime = load_checkpoint(args.checkpoint, model, device)
    if ckpt_mtime:
        print(f"[Self-Play] Loaded checkpoint: {args.checkpoint}")

    mcts_config = MCTSConfig(num_simulations=args.sims)
    mcts_engine = MCTS(model, mcts_config, device=device,
                       batch_size=args.batch_size, use_symmetry=True)

    os.makedirs(args.output, exist_ok=True)
    saved = 0

    bar = tqdm(range(args.games), desc="Self-play", unit="game")
    for _ in bar:
        if args.checkpoint and os.path.exists(args.checkpoint):
            current_mtime = os.path.getmtime(args.checkpoint)
            if ckpt_mtime is None or current_mtime > ckpt_mtime:
                ckpt_mtime = load_checkpoint(args.checkpoint, model, device)
                mcts_engine = MCTS(model, mcts_config, device=device,
                                   batch_size=args.batch_size, use_symmetry=True)
                bar.write(f"[Self-Play] Nouveau champion detecte — modele recharge.")

        game = SongoGame()
        moves = []
        policies = []
        move_num = 0

        while not game.is_terminal and move_num < 300:
            temperature = mcts_config.temperature_start if move_num < mcts_config.temperature_threshold else mcts_config.temperature_end
            action, action_probs = mcts_engine.get_action(game, temperature=temperature, add_noise=True)
            pit_index = game.action_to_pit_index(action)
            valid = game.get_valid_moves()
            if pit_index not in valid:
                pit_index = int(valid[0]) if len(valid) > 0 else pit_index
            moves.append(int(pit_index))
            policies.append(action_probs.tolist())
            game.execute_move(pit_index)
            move_num += 1

        if not game.is_terminal:
            game._resolve_stalemate()

        winner = game.winner if game.winner is not None else -1

        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S%f")
        out_file = os.path.join(args.output, f"selfplay_{ts}_{uuid.uuid4().hex[:6]}.json")
        record = {
            "player1": "Neural (selfplay)",
            "player2": "Neural (selfplay)",
            "moves":    moves,
            "policies": policies,
            "winner":   winner,
        }
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(record, f)
        saved += 1
        bar.set_postfix({'saved': saved, 'moves': len(moves), 'winner': winner})

    print(f"\n[Self-Play] {saved} parties sauvegardees dans '{args.output}'.")
