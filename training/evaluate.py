"""
AlphaZero for Songo — Evaluation Module

Evaluates trained models against baseline opponents:
- Random player
- Greedy player (captures when possible)
- Minimax player (if available)
"""
import numpy as np
import torch
from typing import Optional
from tqdm import tqdm

from songo_game import SongoGame
from neural_network import SongoNet
from mcts import MCTS
from config import MCTSConfig


class RandomPlayer:
    """Plays random valid moves."""
    
    def get_action(self, game: SongoGame) -> int:
        valid_moves = game.get_valid_moves()
        if len(valid_moves) == 0:
            return -1
        pit_index = np.random.choice(valid_moves)
        return game.pit_index_to_action(pit_index)


class GreedyPlayer:
    """Plays the move that captures the most seeds, or random if no capture."""
    
    def get_action(self, game: SongoGame) -> int:
        valid_moves = game.get_valid_moves()
        if len(valid_moves) == 0:
            return -1
        
        best_action = None
        best_capture = -1
        
        for pit_index in valid_moves:
            # Simulate the move
            sim_game = game.clone()
            score_before = sim_game.scores[game.current_player]
            sim_game.execute_move(pit_index)
            score_after = sim_game.scores[game.current_player]
            captured = score_after - score_before
            
            if captured > best_capture:
                best_capture = captured
                best_action = game.pit_index_to_action(pit_index)
        
        if best_action is None:
            pit_index = np.random.choice(valid_moves)
            best_action = game.pit_index_to_action(pit_index)
            
        return best_action


class MCTSPlayer:
    """Plays using MCTS + NN."""
    
    def __init__(self, model: SongoNet, mcts_config: MCTSConfig, device: str = "cpu"):
        self.mcts = MCTS(model, mcts_config, device=device)
    
    def get_action(self, game: SongoGame) -> int:
        action, _ = self.mcts.get_action(game, temperature=0.1, add_noise=False)
        return action


def play_evaluation_game(
    player_a,  # Plays as Player 0
    player_b,  # Plays as Player 1
    max_moves: int = 300
) -> tuple[int, int, int]:
    """
    Play a single evaluation game.
    
    Returns:
        (winner, score_0, score_1) where winner is 0, 1, or -1 (draw)
    """
    game = SongoGame()
    move_count = 0
    
    while not game.is_terminal and move_count < max_moves:
        if game.current_player == 0:
            action = player_a.get_action(game)
        else:
            action = player_b.get_action(game)
        
        if action == -1:
            break
        
        pit_index = game.action_to_pit_index(action)
        
        # Validate move
        valid_moves = game.get_valid_moves()
        if pit_index not in valid_moves:
            # Invalid move, skip turn (shouldn't happen with proper implementation)
            break
            
        game.execute_move(pit_index)
        move_count += 1
    
    if not game.is_terminal:
        game._resolve_stalemate()
    
    return game.winner, int(game.scores[0]), int(game.scores[1])


def evaluate_against_random(
    model: SongoNet,
    mcts_config: MCTSConfig,
    device: str = "cpu",
    num_games: int = 40,
    show_progress: bool = False
) -> float:
    """
    Evaluate model against random player.
    Plays num_games/2 as P1 and num_games/2 as P2.
    
    Returns:
        Win rate (0.0 to 1.0)
    """
    eval_config = MCTSConfig(
        num_simulations=max(mcts_config.num_simulations // 2, 20),
        c_puct=mcts_config.c_puct,
        dirichlet_alpha=mcts_config.dirichlet_alpha,
        dirichlet_epsilon=0.0,  # No noise during evaluation
    )
    
    mcts_player = MCTSPlayer(model, eval_config, device)
    random_player = RandomPlayer()
    
    wins = 0
    half = num_games // 2
    
    iterator = range(num_games)
    if show_progress:
        iterator = tqdm(iterator, desc="vs Random")
    
    for i in iterator:
        if i < half:
            # MCTS as P1
            winner, _, _ = play_evaluation_game(mcts_player, random_player)
            if winner == 0:
                wins += 1
        else:
            # MCTS as P2
            winner, _, _ = play_evaluation_game(random_player, mcts_player)
            if winner == 1:
                wins += 1
    
    return wins / num_games


def evaluate_against_greedy(
    model: SongoNet,
    mcts_config: MCTSConfig,
    device: str = "cpu",
    num_games: int = 40,
    show_progress: bool = False
) -> float:
    """
    Evaluate model against greedy player.
    Plays num_games/2 as P1 and num_games/2 as P2.
    
    Returns:
        Win rate (0.0 to 1.0)
    """
    eval_config = MCTSConfig(
        num_simulations=max(mcts_config.num_simulations // 2, 20),
        c_puct=mcts_config.c_puct,
        dirichlet_alpha=mcts_config.dirichlet_alpha,
        dirichlet_epsilon=0.0,
    )
    
    mcts_player = MCTSPlayer(model, eval_config, device)
    greedy_player = GreedyPlayer()
    
    wins = 0
    half = num_games // 2
    
    iterator = range(num_games)
    if show_progress:
        iterator = tqdm(iterator, desc="vs Greedy")
    
    for i in iterator:
        if i < half:
            winner, _, _ = play_evaluation_game(mcts_player, greedy_player)
            if winner == 0:
                wins += 1
        else:
            winner, _, _ = play_evaluation_game(greedy_player, mcts_player)
            if winner == 1:
                wins += 1
    
    return wins / num_games


def evaluate_models(
    model_a: SongoNet,
    model_b: SongoNet,
    mcts_config: MCTSConfig,
    device: str = "cpu",
    num_games: int = 40,
    show_progress: bool = True
) -> float:
    """
    Pit two models against each other.
    
    Returns:
        Win rate of model_a
    """
    player_a = MCTSPlayer(model_a, mcts_config, device)
    player_b = MCTSPlayer(model_b, mcts_config, device)
    
    wins_a = 0
    half = num_games // 2
    
    iterator = range(num_games)
    if show_progress:
        iterator = tqdm(iterator, desc="Model vs Model")
    
    for i in iterator:
        if i < half:
            winner, _, _ = play_evaluation_game(player_a, player_b)
            if winner == 0:
                wins_a += 1
        else:
            winner, _, _ = play_evaluation_game(player_b, player_a)
            if winner == 1:
                wins_a += 1
    
    return wins_a / num_games


if __name__ == "__main__":
    from neural_network import create_network
    from config import NetworkConfig, MCTSConfig

    print("Testing evaluation module...")
    
    # Test random vs random
    random_a = RandomPlayer()
    random_b = RandomPlayer()
    
    wins_a = 0
    games = 100
    for _ in tqdm(range(games), desc="Random vs Random"):
        winner, s0, s1 = play_evaluation_game(random_a, random_b)
        if winner == 0:
            wins_a += 1
    
    print(f"Random vs Random: P1 wins {wins_a}/{games} ({wins_a/games:.1%})")
    
    # Test greedy vs random
    greedy = GreedyPlayer()
    wins_g = 0
    for _ in tqdm(range(games), desc="Greedy vs Random"):
        winner, s0, s1 = play_evaluation_game(greedy, random_a)
        if winner == 0:
            wins_g += 1
    
    print(f"Greedy vs Random: Greedy wins {wins_g}/{games} ({wins_g/games:.1%})")
