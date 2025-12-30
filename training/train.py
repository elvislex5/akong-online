"""
Training Script for Songo RL Agent
AlphaZero-style reinforcement learning
"""

import torch
import sys
import torch.optim as optim
import numpy as np
from datetime import datetime
import os
import argparse

from songo_env import SongoEnv
from songo_net import SongoNet, SongoNetSmall, train_step, save_checkpoint, load_checkpoint
from self_play import SelfPlayEngine, augment_data, GameExample
from mcts import MCTS

class ReplayBuffer:
    """Experience replay buffer"""

    def __init__(self, max_size=50000):
        self.buffer = []
        self.max_size = max_size

    def add(self, examples):
        """Add examples to buffer"""
        self.buffer.extend(examples)
        # Keep only most recent examples
        if len(self.buffer) > self.max_size:
            self.buffer = self.buffer[-self.max_size:]

    def sample(self, batch_size):
        """Sample random batch"""
        indices = np.random.choice(len(self.buffer), min(batch_size, len(self.buffer)), replace=False)
        return [self.buffer[i] for i in indices]

    def size(self):
        return len(self.buffer)


def train_iteration(network, optimizer, replay_buffer, config):
    """
    One training iteration
    Returns: avg_total_loss, avg_policy_loss, avg_value_loss
    """
    network.train()

    total_losses = []
    policy_losses = []
    value_losses = []

    # Determine device from model parameters
    device = next(network.parameters()).device

    for _ in range(config['train_steps_per_iteration']):
        # Sample batch
        batch = replay_buffer.sample(config['batch_size'])

        if len(batch) == 0:
            continue

        # Prepare tensors (avoid creating tensors from list of np.ndarrays)
        states_np = np.asarray([ex.state_features for ex in batch], dtype=np.float32)
        policies_np = np.asarray([ex.policy for ex in batch], dtype=np.float32)
        values_np = np.asarray([ex.outcome for ex in batch], dtype=np.float32)

        states = torch.from_numpy(states_np).to(device)
        policies = torch.from_numpy(policies_np).to(device)
        values = torch.from_numpy(values_np).to(device)

        # Training step
        total_loss, policy_loss, value_loss = train_step(network, optimizer, states, policies, values)

        total_losses.append(total_loss)
        policy_losses.append(policy_loss)
        value_losses.append(value_loss)

    if len(total_losses) == 0:
        return 0.0, 0.0, 0.0

    return np.mean(total_losses), np.mean(policy_losses), np.mean(value_losses)


def evaluate_vs_random(network, env, num_games=20):
    """
    Evaluate network against random player
    Returns: (wins, draws, losses)
    """
    wins = 0
    draws = 0
    losses = 0

    mcts = MCTS(env, network, c_puct=1.0, num_simulations=50)

    for game in range(num_games):
        env.reset()
        network_is_p1 = (game % 2 == 0)  # Alternate sides

        while env.state.status.value == 0:  # PLAYING
            if (env.state.current_player.value == 0 and network_is_p1) or \
               (env.state.current_player.value == 1 and not network_is_p1):
                # Network's turn
                action = mcts.get_action_with_temp(env.state, temperature=0.0)  # Greedy
            else:
                # Random player's turn
                valid_moves = env.get_valid_moves()
                action = np.random.choice(valid_moves)

            env.step(action)

        # Check result
        if env.state.winner is None:
            draws += 1
        elif (env.state.winner.value == 0 and network_is_p1) or \
             (env.state.winner.value == 1 and not network_is_p1):
            wins += 1
        else:
            losses += 1

    return wins, draws, losses


def main(config):
    """Main training loop"""

    print("="*70)
    print("SONGO REINFORCEMENT LEARNING TRAINING")
    print("="*70)
    print(f"Configuration:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    print("="*70 + "\n")

    # Setup
    env = SongoEnv()

    # Create network
    if config['network_size'] == 'small':
        network = SongoNetSmall(hidden_size=config['hidden_size'])
    else:
        network = SongoNet(hidden_size=config['hidden_size'])

    # Device selection (CUDA → MPS → DirectML → CPU)
    backend = "CPU"
    if torch.cuda.is_available():
        device = torch.device('cuda')
        backend = "CUDA"
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        # Apple Silicon (macOS 12.3+)
        device = torch.device('mps')
        backend = "MPS"
    else:
        # Try DirectML on Windows (requires torch-directml)
        try:
            import torch_directml  # type: ignore
            device = torch_directml.device()
            backend = "DirectML"
        except Exception:
            device = torch.device('cpu')
            backend = "CPU"

    # Move model to device
    network = network.to(device)

    # Log device information
    print(f"Network: {config['network_size']}")
    print(f"Parameters: {sum(p.numel() for p in network.parameters()):,}\n")
    print("Device selection:")
    print(f"  torch.cuda.is_available(): {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        try:
            print(f"  CUDA device count: {torch.cuda.device_count()}")
            current_idx = torch.cuda.current_device()
            print(f"  Current device index: {current_idx}")
            print(f"  Current device name: {torch.cuda.get_device_name(current_idx)}")
        except Exception as e:
            print(f"  [WARN] Unable to query CUDA device info: {e}")
    else:
        # Provide hints when CUDA is not available
        try:
            cuda_ver = getattr(torch.version, 'cuda', None)
            print(f"  CUDA build in this torch: {cuda_ver}")
        except Exception:
            pass
        if sys.platform.startswith('win'):
            print("  Tip (Windows): Install a CUDA-enabled PyTorch (if NVIDIA GPU) or torch-directml for DirectML.")
            print("    - CUDA example: pip install torch --index-url https://download.pytorch.org/whl/cu121")
            print("    - DirectML:     pip install torch-directml")
    print(f"  Using backend: {backend}")
    print(f"  Using device: {device}\n")

    optimizer = optim.Adam(network.parameters(), lr=config['learning_rate'])
    replay_buffer = ReplayBuffer(max_size=config['replay_buffer_size'])

    # Load checkpoint if resuming
    start_iteration = 0
    if config['resume_from'] is not None:
        start_iteration = load_checkpoint(network, optimizer, config['resume_from'])

    # Create checkpoints directory
    os.makedirs('checkpoints', exist_ok=True)
    os.makedirs('logs', exist_ok=True)

    # Training loop
    for iteration in range(start_iteration, config['num_iterations']):
        print(f"\n{'='*70}")
        print(f"ITERATION {iteration + 1}/{config['num_iterations']}")
        print(f"{'='*70}")

        # Self-play
        print(f"\n[1/3] Self-Play ({config['games_per_iteration']} games, "
              f"{config['mcts_simulations']} MCTS sims/move)")

        engine = SelfPlayEngine(env, network, mcts_simulations=config['mcts_simulations'])
        examples = engine.generate_games(
            num_games=config['games_per_iteration'],
            temperature=config['temperature'],
            verbose=True
        )

        # Data augmentation
        if config['use_augmentation']:
            print(f"\n[Augmentation] {len(examples)} -> ", end="")
            examples = augment_data(examples)
            print(f"{len(examples)} examples")

        # Add to replay buffer
        replay_buffer.add(examples)
        print(f"[Replay Buffer] Size: {replay_buffer.size()}")

        # Training
        print(f"\n[2/3] Training ({config['train_steps_per_iteration']} steps, "
              f"batch size {config['batch_size']})")

        avg_total_loss, avg_policy_loss, avg_value_loss = train_iteration(
            network, optimizer, replay_buffer, config
        )

        print(f"  Total Loss: {avg_total_loss:.4f}")
        print(f"  Policy Loss: {avg_policy_loss:.4f}")
        print(f"  Value Loss: {avg_value_loss:.4f}")

        # Evaluation
        if (iteration + 1) % config['eval_frequency'] == 0:
            print(f"\n[3/3] Evaluation (vs Random, {config['eval_games']} games)")
            network.eval()

            wins, draws, losses = evaluate_vs_random(network, env, num_games=config['eval_games'])

            print(f"  Results: W{wins} D{draws} L{losses}")
            print(f"  Win rate: {wins / config['eval_games'] * 100:.1f}%")

        # Save checkpoint
        if (iteration + 1) % config['checkpoint_frequency'] == 0:
            checkpoint_path = f"checkpoints/songo_iter{iteration + 1}.pt"
            save_checkpoint(network, optimizer, iteration + 1, checkpoint_path)

        # Save latest
        save_checkpoint(network, optimizer, iteration + 1, "checkpoints/songo_latest.pt")

    print(f"\n{'='*70}")
    print("TRAINING COMPLETED!")
    print(f"{'='*70}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train Songo RL Agent')

    # Network config
    parser.add_argument('--network-size', type=str, default='standard', choices=['small', 'standard'],
                        help='Network size')
    parser.add_argument('--hidden-size', type=int, default=256,
                        help='Hidden layer size')

    # Training config
    parser.add_argument('--num-iterations', type=int, default=100,
                        help='Number of training iterations')
    parser.add_argument('--games-per-iteration', type=int, default=50,
                        help='Self-play games per iteration')
    parser.add_argument('--mcts-simulations', type=int, default=100,
                        help='MCTS simulations per move')
    parser.add_argument('--temperature', type=float, default=1.0,
                        help='MCTS temperature')

    parser.add_argument('--batch-size', type=int, default=128,
                        help='Training batch size')
    parser.add_argument('--train-steps-per-iteration', type=int, default=100,
                        help='Training steps per iteration')
    parser.add_argument('--learning-rate', type=float, default=0.001,
                        help='Learning rate')

    parser.add_argument('--replay-buffer-size', type=int, default=50000,
                        help='Replay buffer size')
    parser.add_argument('--use-augmentation', action='store_true', default=True,
                        help='Use data augmentation')

    # Evaluation & checkpointing
    parser.add_argument('--eval-frequency', type=int, default=5,
                        help='Evaluate every N iterations')
    parser.add_argument('--eval-games', type=int, default=20,
                        help='Number of evaluation games')
    parser.add_argument('--checkpoint-frequency', type=int, default=10,
                        help='Save checkpoint every N iterations')

    # Resume training
    parser.add_argument('--resume-from', type=str, default=None,
                        help='Resume from checkpoint file')

    args = parser.parse_args()

    config = vars(args)

    main(config)
