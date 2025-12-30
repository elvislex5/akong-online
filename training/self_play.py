"""
Self-Play Engine for Songo
Generate training data by having the agent play against itself
"""

import numpy as np
from typing import List, Tuple
from songo_env import SongoEnv, GameState, Player
from mcts import MCTS
import pickle
from datetime import datetime

class GameExample:
    """Single training example from self-play"""

    def __init__(self, state_features, policy, outcome):
        self.state_features = state_features  # (17,)
        self.policy = policy  # (14,) MCTS visit counts
        self.outcome = outcome  # 1.0 (win), 0.0 (draw), -1.0 (loss)

class SelfPlayEngine:
    """Self-play engine for generating training data"""

    def __init__(self, env: SongoEnv, network, mcts_simulations=100):
        """
        Args:
            env: SongoEnv instance
            network: Neural network
            mcts_simulations: Number of MCTS simulations per move
        """
        self.env = env
        self.network = network
        self.mcts_simulations = mcts_simulations

    def play_game(self, temperature=1.0, temperature_threshold=30) -> Tuple[List[GameExample], str]:
        """
        Play one self-play game
        Args:
            temperature: MCTS temperature for move selection
            temperature_threshold: After this many moves, use greedy selection
        Returns:
            (examples, result_str)
        """
        examples = []
        self.env.reset()
        move_count = 0

        mcts = MCTS(self.env, self.network, c_puct=1.0, num_simulations=self.mcts_simulations)

        while self.env.state.status.value == 0:  # PLAYING
            move_count += 1

            # Get current state features
            state_features = self.env.get_state_representation()
            current_player = self.env.state.current_player

            # Adjust temperature: use temperature for first N moves, then greedy
            temp = temperature if move_count < temperature_threshold else 0.0

            # Run MCTS to get action probabilities
            action_probs = mcts.search(self.env.state)

            # Store example (outcome will be filled later)
            examples.append({
                'state_features': state_features.copy(),
                'policy': action_probs.copy(),
                'player': current_player,
                'move_num': move_count
            })

            # Select and execute action
            action = mcts.get_action_with_temp(self.env.state, temperature=temp)
            self.env.step(action)

        # Game finished - assign outcomes to all examples
        winner = self.env.state.winner
        training_examples = []

        for ex in examples:
            player = ex['player']

            if winner is None:
                outcome = 0.0  # Draw
            elif winner == player:
                outcome = 1.0  # Win
            else:
                outcome = -1.0  # Loss

            training_examples.append(GameExample(
                state_features=ex['state_features'],
                policy=ex['policy'],
                outcome=outcome
            ))

        # Result string
        if winner == Player.ONE:
            result_str = "1-0"
        elif winner == Player.TWO:
            result_str = "0-1"
        else:
            result_str = "1/2-1/2"

        return training_examples, result_str

    def generate_games(self, num_games: int, temperature=1.0, verbose=True) -> List[GameExample]:
        """
        Generate multiple self-play games
        Args:
            num_games: Number of games to play
            temperature: MCTS temperature
            verbose: Print progress
        Returns:
            List of training examples
        """
        all_examples = []
        results = {'1-0': 0, '0-1': 0, '1/2-1/2': 0}

        for game_num in range(num_games):
            examples, result = self.play_game(temperature=temperature)
            all_examples.extend(examples)
            results[result] += 1

            if verbose and (game_num + 1) % 10 == 0:
                print(f"Game {game_num + 1}/{num_games} - "
                      f"Moves: {len(examples)} - Result: {result} - "
                      f"Total examples: {len(all_examples)}")

        if verbose:
            print(f"\n{'='*60}")
            print(f"Self-play completed: {num_games} games")
            print(f"Results: P1 wins: {results['1-0']}, "
                  f"P2 wins: {results['0-1']}, "
                  f"Draws: {results['1/2-1/2']}")
            print(f"Total training examples: {len(all_examples)}")
            print(f"{'='*60}\n")

        return all_examples

    def save_examples(self, examples: List[GameExample], filename: str):
        """Save training examples to file"""
        with open(filename, 'wb') as f:
            pickle.dump(examples, f)
        print(f"Saved {len(examples)} examples to {filename}")

    def load_examples(self, filename: str) -> List[GameExample]:
        """Load training examples from file"""
        with open(filename, 'rb') as f:
            examples = pickle.load(f)
        print(f"Loaded {len(examples)} examples from {filename}")
        return examples


def augment_data(examples: List[GameExample]) -> List[GameExample]:
    """
    Data augmentation for Songo
    Mirror the board (swap player 1 and player 2 perspectives)
    """
    augmented = []

    for ex in examples:
        # Original example
        augmented.append(ex)

        # Mirrored example
        state_features = ex.state_features.copy()
        policy = ex.policy.copy()

        # Mirror board (reverse pits 0-6 with 7-13)
        mirrored_board = np.concatenate([
            state_features[7:14][::-1],  # P2 pits reversed -> P1 position
            state_features[0:7][::-1]    # P1 pits reversed -> P2 position
        ])

        # Mirror scores
        mirrored_scores = np.array([state_features[15], state_features[14]])

        # Mirror current player
        mirrored_player = 1.0 - state_features[16]

        mirrored_state = np.concatenate([
            mirrored_board,
            mirrored_scores,
            [mirrored_player]
        ])

        # Mirror policy
        mirrored_policy = np.concatenate([
            policy[7:14][::-1],
            policy[0:7][::-1]
        ])

        # Outcome stays the same (from mirrored player's perspective)
        augmented.append(GameExample(
            state_features=mirrored_state,
            policy=mirrored_policy,
            outcome=ex.outcome
        ))

    return augmented


if __name__ == "__main__":
    # Test self-play
    from songo_net import SongoNetSmall
    import torch

    print("Testing Self-Play Engine...")

    env = SongoEnv()
    network = SongoNetSmall(hidden_size=128)
    network.eval()

    engine = SelfPlayEngine(env, network, mcts_simulations=25)

    print("\nPlaying 3 self-play games (25 MCTS sims per move)...")
    examples = engine.generate_games(num_games=3, temperature=1.0, verbose=True)

    print(f"\nTotal examples collected: {len(examples)}")
    print(f"Example 1:")
    print(f"  State features shape: {examples[0].state_features.shape}")
    print(f"  Policy shape: {examples[0].policy.shape}")
    print(f"  Outcome: {examples[0].outcome}")

    # Test augmentation
    print("\nTesting data augmentation...")
    augmented = augment_data(examples[:10])
    print(f"Original: {len(examples[:10])} examples")
    print(f"Augmented: {len(augmented)} examples")

    # Test save/load
    print("\nTesting save/load...")
    engine.save_examples(examples, "test_examples.pkl")
    loaded = engine.load_examples("test_examples.pkl")
    print(f"Loaded {len(loaded)} examples")

    print("\n✓ Self-play test passed!")
