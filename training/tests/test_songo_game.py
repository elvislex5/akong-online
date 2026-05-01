"""
Tests unitaires pour le moteur de jeu Songo.
Vérifie la parité avec l'implémentation TypeScript.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from songo_game import SongoGame


def test_initial_state():
    """Test initial game state."""
    game = SongoGame()
    
    assert len(game.board) == 14
    assert all(game.board[i] == 5 for i in range(14)), "All pits should have 5 seeds"
    assert game.scores[0] == 0
    assert game.scores[1] == 0
    assert game.current_player == 0
    assert not game.is_terminal
    assert game.winner is None
    print("✓ test_initial_state")


def test_pit_owner():
    """Test pit owner detection."""
    for i in range(7):
        assert SongoGame.get_pit_owner(i) == 0, f"Pit {i} should belong to P1"
    for i in range(7, 14):
        assert SongoGame.get_pit_owner(i) == 1, f"Pit {i} should belong to P2"
    print("✓ test_pit_owner")


def test_valid_moves_initial():
    """Test valid moves at game start."""
    game = SongoGame()
    valid = game.get_valid_moves()
    
    # P1 should be able to play pits 0-5 (pit 6 has 5 seeds, not restricted)
    # Actually pit 6 with 5 seeds is fine (restriction is only for 1 seed)
    assert len(valid) == 7, f"Expected 7 valid moves, got {len(valid)}: {valid}"
    print("✓ test_valid_moves_initial")


def test_simple_move():
    """Test a simple seed distribution."""
    game = SongoGame()
    
    # Play pit 0 (5 seeds)
    game.execute_move(0)
    
    assert game.board[0] == 0, "Pit 0 should be empty after playing"
    assert game.board[1] == 6, "Pit 1 should have 6 seeds"
    assert game.board[2] == 6, "Pit 2 should have 6 seeds"
    assert game.board[3] == 6, "Pit 3 should have 6 seeds"
    assert game.board[4] == 6, "Pit 4 should have 6 seeds"
    assert game.board[5] == 6, "Pit 5 should have 6 seeds"
    assert game.board[6] == 5, "Pit 6 should still have 5 seeds"
    assert game.current_player == 1, "Should be P2's turn"
    print("✓ test_simple_move")


def test_cross_boundary_move():
    """Test distribution that crosses into opponent's territory."""
    game = SongoGame()
    
    # Play pit 5 (5 seeds) → distributes to 6, 7, 8, 9, 10
    game.execute_move(5)
    
    assert game.board[5] == 0
    assert game.board[6] == 6
    assert game.board[7] == 6
    assert game.board[8] == 6
    assert game.board[9] == 6
    assert game.board[10] == 6
    print("✓ test_cross_boundary_move")


def test_capture():
    """Test basic capture (landing on opponent's pit with 2-4 seeds)."""
    game = SongoGame()
    
    # Setup: put 1 seed in opponent pit 8, play from pit that lands on 8
    game.board = np.zeros(14, dtype=np.int32)
    game.board[7] = 1  # opponent pit 7: 1 seed
    game.board[0] = 1  # our pit 0: 1 seed → lands on pit 1 (our side, no capture)
    
    # Now: pit 6 with 2 seeds → lands on pit 8
    game.board[6] = 0  # clear
    game.board[5] = 0
    
    # Better test: pit 5 with 3 seeds → 6, 7, 8
    # pit 8 has 1 seed → after drop it has 2 → capture!
    game.board = np.zeros(14, dtype=np.int32)
    game.board[5] = 3  # P1: 3 seeds in pit 5
    game.board[8] = 1  # P2: 1 seed in pit 8
    game.current_player = 0
    
    game.execute_move(5)
    
    # Distribution: pit 6, 7, 8
    # pit 8 now has 1+1 = 2 → capturable
    assert game.board[8] == 0, f"Pit 8 should be captured, got {game.board[8]}"
    assert game.scores[0] == 2, f"P1 should have 2 points from capture, got {game.scores[0]}"
    print("✓ test_capture")


def test_capture_chain():
    """Test consecutive captures going backwards."""
    game = SongoGame()
    game.board = np.zeros(14, dtype=np.int32)
    
    # Setup: pits 8, 9 have 1 seed each; play 2 seeds from pit 6 → lands on 8
    # After drop: pit 7 has 1, pit 8 has 2 → capture pit 8 (2 seeds)
    # Going back: pit 7 has 1 → stop (not 2-4)
    game.board[6] = 2
    game.board[8] = 1
    game.current_player = 0
    
    game.execute_move(6)
    
    # pit 7 gets 1 seed (total 1), pit 8 gets 1 seed (total 2) → capture 8
    assert game.board[8] == 0, f"Pit 8 captured, got {game.board[8]}"
    assert game.scores[0] == 2, f"Score should be 2, got {game.scores[0]}"
    print("✓ test_capture_chain")


def test_last_pit_restriction():
    """Test: can't play 1 seed from last pit (6 or 13) unless it's the only seed."""
    game = SongoGame()
    game.board = np.zeros(14, dtype=np.int32)
    game.board[6] = 1  # Last pit with 1 seed
    game.board[3] = 5  # Other seeds exist
    game.current_player = 0
    
    valid = game.get_valid_moves()
    assert 6 not in valid, "Pit 6 with 1 seed should be forbidden when other seeds exist"
    print("✓ test_last_pit_restriction")


def test_last_pit_desperate():
    """Test: last pit with 1 seed IS allowed if it's the only seed (desperate auto-capture)."""
    game = SongoGame()
    game.board = np.zeros(14, dtype=np.int32)
    game.board[6] = 1  # Only seed
    game.current_player = 0
    
    valid = game.get_valid_moves()
    assert 6 in valid, "Pit 6 should be valid when it's the only seed"
    
    game.execute_move(6)
    assert game.scores[0] == 1, "Should auto-capture the desperate seed"
    assert game.solidarity_mode, "Should activate solidarity mode"
    print("✓ test_last_pit_desperate")


def test_feeding_rule():
    """Test: must feed opponent if they have 0 seeds (solidarity)."""
    game = SongoGame()
    game.board = np.zeros(14, dtype=np.int32)
    
    # P2 has 0 seeds, P1 has seeds
    game.board[0] = 3  # Can reach opponent (lands on 1, 2, 3 - all ours, no feed)
    game.board[4] = 5  # Can reach opponent (lands on 5, 6, 7, 8, 9 - feeds!)
    game.current_player = 0
    
    valid = game.get_valid_moves()
    # Only pit 4 feeds the opponent
    assert 4 in valid, "Pit 4 should be valid (feeds opponent)"
    assert 0 not in valid, "Pit 0 should be invalid (doesn't feed)"
    print("✓ test_feeding_rule")


def test_game_end_by_score():
    """Test game ends when score > 35."""
    game = SongoGame()
    game.scores[0] = 35
    game.board = np.zeros(14, dtype=np.int32)
    game.board[8] = 1  # opponent has 1 seed in pit 8
    game.board[5] = 3  # lands on 6, 7, 8 → pit 8 becomes 2 → capture
    game.current_player = 0
    
    game.execute_move(5)
    
    assert game.scores[0] >= 36, f"Score should be >= 36, got {game.scores[0]}"
    assert game.is_terminal, "Game should be over"
    assert game.winner == 0, "P1 should win"
    print("✓ test_game_end_by_score")


def test_clone():
    """Test that clone creates independent copy."""
    game = SongoGame()
    game.execute_move(0)
    
    clone = game.clone()
    clone.execute_move(7)
    
    assert game.current_player != clone.current_player or \
           not np.array_equal(game.board, clone.board), "Clone should be independent"
    print("✓ test_clone")


def test_encode_state():
    """Test state encoding shape and values."""
    game = SongoGame()
    state = game.encode_state()
    
    assert state.shape == (32,), f"Expected shape (32,), got {state.shape}"
    assert state.dtype == np.float32
    assert np.all(np.isfinite(state)), "All values should be finite"
    print("✓ test_encode_state")


def test_valid_moves_mask():
    """Test valid moves mask."""
    game = SongoGame()
    mask = game.get_valid_moves_mask()
    
    assert mask.shape == (7,), f"Expected shape (7,), got {mask.shape}"
    assert mask.sum() == 7, "All 7 pits should be valid at start"
    print("✓ test_valid_moves_mask")


def test_full_game():
    """Test a complete game plays to termination."""
    game = SongoGame()
    moves = 0
    
    while not game.is_terminal and moves < 500:
        valid = game.get_valid_moves()
        if len(valid) == 0:
            break
        pit_index = np.random.choice(valid)
        game.execute_move(pit_index)
        moves += 1
    
    # Game should have ended
    assert game.is_terminal or moves >= 300, "Game should terminate"
    assert game.scores[0] + game.scores[1] + sum(game.board) == 70, \
        f"Total seeds should be 70, got {game.scores[0] + game.scores[1] + sum(game.board)}"
    print(f"✓ test_full_game (ended in {moves} moves, "
          f"score: {game.scores[0]}-{game.scores[1]}, winner: {game.winner})")


def test_many_random_games():
    """Stress test: play 100 random games, check seed conservation."""
    for i in range(100):
        game = SongoGame()
        moves = 0
        while not game.is_terminal and moves < 500:
            valid = game.get_valid_moves()
            if len(valid) == 0:
                break
            pit_index = np.random.choice(valid)
            game.execute_move(pit_index)
            moves += 1
        
        total = game.scores[0] + game.scores[1] + sum(game.board)
        assert total == 70, f"Game {i}: seed conservation violated! Total={total}"
    
    print("✓ test_many_random_games (100 games, all seeds conserved)")


if __name__ == "__main__":
    print("=" * 50)
    print("  Songo Game Engine Tests")
    print("=" * 50)
    
    test_initial_state()
    test_pit_owner()
    test_valid_moves_initial()
    test_simple_move()
    test_cross_boundary_move()
    test_capture()
    test_capture_chain()
    test_last_pit_restriction()
    test_last_pit_desperate()
    test_feeding_rule()
    test_game_end_by_score()
    test_clone()
    test_encode_state()
    test_valid_moves_mask()
    test_full_game()
    test_many_random_games()
    
    print("\n" + "=" * 50)
    print("  All tests passed! ✓")
    print("=" * 50)
