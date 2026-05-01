"""
AlphaZero for Songo — Configuration & Hyperparameters
"""
from dataclasses import dataclass, field


@dataclass
class GameConfig:
    """Songo game constants."""
    pits_per_player: int = 7
    total_pits: int = 14
    initial_seeds: int = 5
    winning_score: int = 36  # > 35 to win
    max_game_length: int = 300  # Safety limit for game length


@dataclass
class NetworkConfig:
    """Neural network architecture."""
    input_size: int = 80  # v2: 64 base + 16 book features (landing pos, Yini, Olôa, Akuru)
    hidden_size: int = 512   # Phase 1 : 128→512 (3.4M params). Phase 2 : 1024 (21M params).
    num_res_blocks: int = 8  # Phase 1 : 4→8. Phase 2 : 10.
    policy_size: int = 7  # 7 possible actions (one per pit)
    dropout: float = 0.1


@dataclass
class MCTSConfig:
    """Monte Carlo Tree Search parameters."""
    num_simulations: int = 400  # 200→400: meilleure qualité self-play pour dépasser Hard
    c_puct: float = 1.5  # Exploration constant in PUCT formula
    dirichlet_alpha: float = 0.3   # Réduit : 0.5 trop bruité pour 7 actions (Go=0.03, Chess=0.3)
    dirichlet_epsilon: float = 0.25 # Augmenté 0.20→0.25 : champion solide, besoin de plus d'exploration pour le dépasser
    temperature_start: float = 0.9  # Augmenté 0.8→0.9 : diversifier les parties self-play sans revenir au chaos 1.0
    temperature_end: float = 0.1   # Inchangé : déterministe en fin de partie
    temperature_threshold: int = 15  # Move number to switch from start to end temp


@dataclass
class TrainingConfig:
    """Training loop parameters."""
    num_iterations: int = 100  # 50→100: extended training with 400 sims
    num_self_play_games: int = 100  # Games per iteration (100 × ~100 moves = ~10K samples)
    num_epochs: int = 10  # Training epochs per iteration
    batch_size: int = 256
    learning_rate: float = 0.0008  # Warm restart: 0.0005→0.0008 pour sortir du plateau (policy loss figé ~0.95)
    weight_decay: float = 1e-4  # L2 regularization
    lr_scheduler_step: int = 15  # Step LR every N iterations
    lr_scheduler_gamma: float = 0.5  # LR decay factor
    replay_buffer_size: int = 150_000  # Max samples in replay buffer (50K trop petit, flush en 6 iter)
    min_replay_size: int = 2_000  # Min samples before training starts

    # Evaluation
    eval_games: int = 40  # Games to play for evaluation
    eval_mcts_sims: int = 100  # MCTS sims during evaluation
    win_threshold: float = 0.55  # New model needs > 55% win rate

    # Checkpointing
    checkpoint_dir: str = "checkpoints"
    save_every: int = 5  # Save checkpoint every N iterations

    # Parallelism
    num_workers: int = 0  # Self-play workers (0 = auto-detect CPU cores)

    # MCTS batching (v2)
    mcts_batch_size: int = 16  # Leaves evaluated per batched inference call

    # Device
    device: str = "cuda"  # Will auto-detect in train.py


@dataclass
class AlphaZeroConfig:
    """Combined configuration."""
    game: GameConfig = field(default_factory=GameConfig)
    network: NetworkConfig = field(default_factory=NetworkConfig)
    mcts: MCTSConfig = field(default_factory=MCTSConfig)
    training: TrainingConfig = field(default_factory=TrainingConfig)
