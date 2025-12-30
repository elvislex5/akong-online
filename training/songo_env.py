"""
Songo Game Environment - Python port of songoLogic.ts
Environment compatible with RL training (AlphaZero-style)
"""

import numpy as np
from typing import List, Tuple, Optional
from enum import IntEnum
from dataclasses import dataclass

class Player(IntEnum):
    ONE = 0  # Bottom player, pits 0-6
    TWO = 1  # Top player, pits 7-13

class GameStatus(IntEnum):
    PLAYING = 0
    FINISHED = 1

PITS_PER_PLAYER = 7
TOTAL_PITS = 14
INITIAL_SEEDS = 5
WINNING_SCORE = 36

@dataclass
class GameState:
    """Songo game state"""
    board: np.ndarray  # 14 pits
    scores: np.ndarray  # 2 scores [P1, P2]
    current_player: Player
    status: GameStatus
    winner: Optional[Player]
    is_solidarity_mode: bool
    solidarity_beneficiary: Optional[Player]

    def copy(self):
        """Deep copy of game state"""
        return GameState(
            board=self.board.copy(),
            scores=self.scores.copy(),
            current_player=self.current_player,
            status=self.status,
            winner=self.winner,
            is_solidarity_mode=self.is_solidarity_mode,
            solidarity_beneficiary=self.solidarity_beneficiary
        )

class SongoEnv:
    """Songo game environment for RL training"""

    def __init__(self):
        self.state = self.reset()

    def reset(self) -> GameState:
        """Reset to initial game state"""
        self.state = GameState(
            board=np.full(TOTAL_PITS, INITIAL_SEEDS, dtype=np.int32),
            scores=np.zeros(2, dtype=np.int32),
            current_player=Player.ONE,
            status=GameStatus.PLAYING,
            winner=None,
            is_solidarity_mode=False,
            solidarity_beneficiary=None
        )
        return self.state

    @staticmethod
    def get_pit_owner(index: int) -> Player:
        """Get which player owns a pit"""
        return Player.ONE if 0 <= index < 7 else Player.TWO

    @staticmethod
    def get_player_indices(player: Player) -> List[int]:
        """Get pit indices for a player"""
        return list(range(0, 7)) if player == Player.ONE else list(range(7, 14))

    @staticmethod
    def get_opponent_indices(player: Player) -> List[int]:
        """Get opponent's pit indices"""
        return list(range(7, 14)) if player == Player.ONE else list(range(0, 7))

    def get_valid_moves(self, state: Optional[GameState] = None) -> List[int]:
        """Get all valid moves for current player"""
        if state is None:
            state = self.state

        indices = self.get_player_indices(state.current_player)
        valid = []

        for idx in indices:
            if self.is_valid_move(state, idx):
                valid.append(idx)

        return valid

    def is_valid_move(self, state: GameState, pit_index: int) -> bool:
        """Check if a move is valid"""
        board = state.board
        current_player = state.current_player

        # Must be player's pit
        if self.get_pit_owner(pit_index) != current_player:
            return False

        # Must have seeds
        seeds = board[pit_index]
        if seeds == 0:
            return False

        # Solidarity logic
        opponent = Player.TWO if current_player == Player.ONE else Player.ONE
        opponent_indices = self.get_opponent_indices(current_player)
        opponent_seeds = board[opponent_indices].sum()

        enforce_feeding = (state.is_solidarity_mode and state.solidarity_beneficiary is not None) or opponent_seeds == 0

        if enforce_feeding:
            target_indices = opponent_indices
            if state.is_solidarity_mode and state.solidarity_beneficiary is not None:
                target_indices = self.get_player_indices(state.solidarity_beneficiary)

            # Check if this move feeds
            move_feeds = False
            if seeds >= 14:
                move_feeds = True
            else:
                for i in range(1, seeds + 1):
                    target = (pit_index + i) % TOTAL_PITS
                    if target in target_indices:
                        move_feeds = True
                        break

            if not move_feeds:
                # Check if ANY move can feed
                my_indices = self.get_player_indices(current_player)
                exists_feeding_move = False

                for idx in my_indices:
                    if board[idx] > 0:
                        seeds_in_pit = board[idx]
                        if seeds_in_pit >= 14:
                            exists_feeding_move = True
                            break
                        for i in range(1, seeds_in_pit + 1):
                            target = (idx + i) % TOTAL_PITS
                            if target in target_indices:
                                exists_feeding_move = True
                                break
                    if exists_feeding_move:
                        break

                # If can feed with another move, this move is invalid
                if exists_feeding_move:
                    return False

        # Last pit restriction
        my_indices = self.get_player_indices(current_player)
        total_seeds = board[my_indices].sum()
        is_last_pit = (current_player == Player.ONE and pit_index == 6) or \
                      (current_player == Player.TWO and pit_index == 13)

        if is_last_pit and seeds == 1:
            if total_seeds == 1:
                return True  # Desperate auto-capture
            else:
                return False  # Cannot play last pit with 1 seed

        return True

    def execute_move(self, state: GameState, pit_index: int) -> GameState:
        """Execute a move and return new state (pure function)"""
        new_state = state.copy()
        board = new_state.board
        current_player = new_state.current_player
        opponent = Player.TWO if current_player == Player.ONE else Player.ONE

        seeds = board[pit_index]
        board[pit_index] = 0

        # Check for desperate auto-capture
        player_indices = self.get_player_indices(current_player)
        total_seeds_on_side = board[player_indices].sum() + seeds
        is_last_pit = (current_player == Player.ONE and pit_index == 6) or \
                      (current_player == Player.TWO and pit_index == 13)

        if total_seeds_on_side == 1 and is_last_pit:
            # Auto-capture
            new_state.scores[current_player] += 1
            new_state.is_solidarity_mode = True
            new_state.solidarity_beneficiary = current_player
            new_state.current_player = opponent
            return self._check_game_over(new_state)

        # Normal distribution
        current_idx = pit_index
        opponent_indices = self.get_opponent_indices(current_player)

        if seeds >= 14:
            remaining_after_13 = seeds - 13
            is_auto_capture = remaining_after_13 % 7 == 1

            # Distribute first 13 seeds
            for _ in range(13):
                current_idx = (current_idx + 1) % TOTAL_PITS
                board[current_idx] += 1

            seeds = remaining_after_13

            if is_auto_capture:
                # Auto-capture
                new_state.scores[current_player] += seeds
                new_state.current_player = opponent
                new_state.is_solidarity_mode = False
                new_state.solidarity_beneficiary = None
                return self._check_game_over(new_state)

            # Continue distribution
            for _ in range(seeds):
                landing_idx = opponent_indices[(_ % 7)]
                board[landing_idx] += 1

            landing_idx = opponent_indices[(seeds - 1) % 7]
        else:
            # Simple distribution
            for _ in range(seeds):
                current_idx = (current_idx + 1) % TOTAL_PITS
                board[current_idx] += 1

            landing_idx = current_idx

        # Check for captures
        if self.get_pit_owner(landing_idx) == opponent:
            captured = 0
            check_idx = landing_idx

            while self.get_pit_owner(check_idx) == opponent:
                count = board[check_idx]
                if 2 <= count <= 4:
                    captured += count
                    board[check_idx] = 0
                    check_idx = (check_idx - 1) % TOTAL_PITS
                else:
                    break

            # Check drought prevention
            opponent_remaining = board[opponent_indices].sum()
            if captured > 0 and opponent_remaining == 0:
                # Would leave opponent with no seeds - undo capture
                check_idx = landing_idx
                temp_captured = 0
                while self.get_pit_owner(check_idx) == opponent:
                    count_before = (new_state.board[check_idx] if temp_captured == 0
                                   else board[check_idx])
                    if temp_captured < captured:
                        restoration = min(captured - temp_captured, 4)
                        board[check_idx] = restoration
                        temp_captured += restoration
                        check_idx = (check_idx - 1) % TOTAL_PITS
                    else:
                        break
            else:
                new_state.scores[current_player] += captured

        # Clear solidarity mode if it was active
        new_state.is_solidarity_mode = False
        new_state.solidarity_beneficiary = None

        # Switch player
        new_state.current_player = opponent

        return self._check_game_over(new_state)

    def _check_game_over(self, state: GameState) -> GameState:
        """Check if game is over and update state"""
        # Check win by score
        if state.scores[Player.ONE] >= WINNING_SCORE:
            state.status = GameStatus.FINISHED
            state.winner = Player.ONE
            return state

        if state.scores[Player.TWO] >= WINNING_SCORE:
            state.status = GameStatus.FINISHED
            state.winner = Player.TWO
            return state

        # Check if current player has valid moves
        valid_moves = self.get_valid_moves(state)
        if len(valid_moves) == 0:
            # Stalemate - count remaining seeds
            p1_indices = self.get_player_indices(Player.ONE)
            p2_indices = self.get_player_indices(Player.TWO)

            state.scores[Player.ONE] += state.board[p1_indices].sum()
            state.scores[Player.TWO] += state.board[p2_indices].sum()

            state.board.fill(0)
            state.status = GameStatus.FINISHED

            if state.scores[Player.ONE] > state.scores[Player.TWO]:
                state.winner = Player.ONE
            elif state.scores[Player.TWO] > state.scores[Player.ONE]:
                state.winner = Player.TWO
            else:
                state.winner = None  # Draw

        return state

    def step(self, action: int) -> Tuple[GameState, float, bool]:
        """
        Execute action and return (new_state, reward, done)
        Reward from perspective of player who just moved
        """
        if self.state.status != GameStatus.PLAYING:
            return self.state, 0.0, True

        if not self.is_valid_move(self.state, action):
            # Invalid move - heavy penalty
            return self.state, -1.0, True

        player_before = self.state.current_player
        self.state = self.execute_move(self.state, action)

        done = self.state.status == GameStatus.FINISHED

        if done:
            if self.state.winner == player_before:
                reward = 1.0  # Win
            elif self.state.winner is None:
                reward = 0.0  # Draw
            else:
                reward = -1.0  # Loss
        else:
            # Reward based on score differential
            score_diff = self.state.scores[player_before] - self.state.scores[1 - player_before]
            reward = score_diff / 70.0  # Normalize (max score is 70)

        return self.state, reward, done

    def get_state_representation(self, state: Optional[GameState] = None) -> np.ndarray:
        """
        Get neural network input representation
        Returns: [board(14), scores(2), current_player(1)] = 17 features
        """
        if state is None:
            state = self.state

        features = np.zeros(17, dtype=np.float32)
        features[0:14] = state.board / 70.0  # Normalize (max total seeds = 70)
        features[14:16] = state.scores / 70.0  # Normalize scores
        features[16] = float(state.current_player)

        return features

    def render(self, state: Optional[GameState] = None):
        """Print game state (for debugging)"""
        if state is None:
            state = self.state

        print("\n" + "="*50)
        print(f"Current Player: {'Player 1 (↑)' if state.current_player == Player.ONE else 'Player 2 (↓)'}")
        print(f"Scores: P1={state.scores[Player.ONE]}  P2={state.scores[Player.TWO]}")
        print("-"*50)

        # Player 2 pits (top, reversed for display)
        print("P2: ", end="")
        for i in range(13, 6, -1):
            print(f"[{state.board[i]:2d}]", end=" ")
        print()

        print("    ", end="")
        for i in range(13, 6, -1):
            print(f" {i:2d} ", end=" ")
        print()

        print("-"*50)

        # Player 1 pits (bottom)
        print("    ", end="")
        for i in range(0, 7):
            print(f" {i:2d} ", end=" ")
        print()

        print("P1: ", end="")
        for i in range(0, 7):
            print(f"[{state.board[i]:2d}]", end=" ")
        print()

        print("="*50)

        if state.status == GameStatus.FINISHED:
            if state.winner == Player.ONE:
                print("🏆 Player 1 WINS!")
            elif state.winner == Player.TWO:
                print("🏆 Player 2 WINS!")
            else:
                print("🤝 DRAW!")


if __name__ == "__main__":
    # Test the environment
    env = SongoEnv()
    env.render()

    print("\nTesting a few random moves...")
    for turn in range(5):
        valid_moves = env.get_valid_moves()
        if len(valid_moves) == 0:
            break

        move = np.random.choice(valid_moves)
        print(f"\nTurn {turn + 1}: Player {env.state.current_player + 1} plays pit {move}")

        state, reward, done = env.step(move)
        env.render()

        if done:
            print(f"Game over! Reward: {reward}")
            break
