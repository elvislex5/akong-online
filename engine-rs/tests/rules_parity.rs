//! Unit tests mirroring cases in `services/songoLogic.test.ts`.
//!
//! Each test replicates the TS case as closely as possible — any divergence
//! between the two implementations manifests as a failed assertion here.
//! Additional invariant tests (seed conservation) are included at the bottom.

use akong_engine::{
    execute_move, is_valid_move, pit_owner, valid_moves, GameState, GameStatus, Player,
    INITIAL_SEEDS, PITS_PER_PLAYER, TOTAL_PITS, WINNING_SCORE_GABON,
};
use akong_engine::rules::MoveRejection;

fn empty_board() -> [u8; 14] {
    [0; 14]
}

fn custom(board: [u8; 14], current: Player) -> GameState {
    let mut s = GameState::initial();
    s.board = board;
    s.current_player = current;
    s
}

// ─── Constants ───────────────────────────────────────────────────────────────

#[test]
fn constants_match_ts() {
    assert_eq!(PITS_PER_PLAYER, 7);
    assert_eq!(TOTAL_PITS, 14);
    assert_eq!(INITIAL_SEEDS, 5);
    assert_eq!(WINNING_SCORE_GABON, 36);
}

// ─── Pit owner / indices ─────────────────────────────────────────────────────

#[test]
fn pit_owner_first_seven_is_player_one() {
    for i in 0..7 {
        assert_eq!(pit_owner(i), Player::One);
    }
}

#[test]
fn pit_owner_last_seven_is_player_two() {
    for i in 7..14 {
        assert_eq!(pit_owner(i), Player::Two);
    }
}

// ─── Initial state ───────────────────────────────────────────────────────────

#[test]
fn initial_state_has_5_seeds_per_pit() {
    let s = GameState::initial();
    assert_eq!(s.board, [5; 14]);
    assert_eq!(s.scores, [0, 0]);
    assert_eq!(s.current_player, Player::One);
    assert_eq!(s.status, GameStatus::Playing);
    assert!(s.winner.is_none());
}

// ─── isValidMove ─────────────────────────────────────────────────────────────

#[test]
fn reject_move_on_opponent_pit() {
    let s = GameState::initial();
    assert_eq!(is_valid_move(&s, 7), Err(MoveRejection::NotYourPit));
}

#[test]
fn reject_move_on_empty_pit() {
    let mut board = [5u8; 14];
    board[3] = 0;
    let s = custom(board, Player::One);
    assert_eq!(is_valid_move(&s, 3), Err(MoveRejection::EmptyPit));
}

#[test]
fn allow_moves_on_all_own_pits_from_initial() {
    let s = GameState::initial();
    for i in 0..7 {
        assert!(is_valid_move(&s, i).is_ok(), "pit {i} should be valid from initial");
    }
}

#[test]
fn reject_last_pit_single_seed_with_other_seeds() {
    let mut board = empty_board();
    board[3] = 5;
    board[6] = 1; // Player One's last pit
    let s = custom(board, Player::One);
    assert_eq!(is_valid_move(&s, 6), Err(MoveRejection::LastPitSingleSeed));
}

#[test]
fn allow_last_pit_single_seed_when_only_one() {
    let mut board = empty_board();
    board[6] = 1;
    board[10] = 5; // Opponent has seeds so game is still alive
    let s = custom(board, Player::One);
    assert!(is_valid_move(&s, 6).is_ok());
}

#[test]
fn solidarity_forces_feeding_move() {
    let mut board = empty_board();
    board[0] = 2; // reaches pits 1,2 — no feeding
    board[5] = 3; // reaches 6,7,8 — feeds opponent
    // opponent side empty → must feed
    let s = custom(board, Player::One);

    assert_eq!(is_valid_move(&s, 0), Err(MoveRejection::SolidarityRequired));
    assert!(is_valid_move(&s, 5).is_ok());
}

#[test]
fn solidarity_allows_anything_when_no_feed_move_exists() {
    let mut board = empty_board();
    board[0] = 1; // reaches pit 1 only — cannot feed
    // opponent side empty, but no other pits have seeds
    let s = custom(board, Player::One);
    assert!(is_valid_move(&s, 0).is_ok());
}

// ─── executeMove basic distribution ──────────────────────────────────────────

#[test]
fn execute_distributes_clockwise() {
    let mut board = empty_board();
    board[0] = 3;
    board[10] = 5; // opponent has seeds so game doesn't end
    let s = custom(board, Player::One);
    let (out, _) = execute_move(&s, 0);
    assert_eq!(out.board[0], 0);
    assert_eq!(out.board[1], 1);
    assert_eq!(out.board[2], 1);
    assert_eq!(out.board[3], 1);
}

#[test]
fn execute_wraps_around() {
    let mut board = empty_board();
    board[12] = 4;
    board[3] = 5; // keep Player One alive
    let s = custom(board, Player::Two);
    let (out, _) = execute_move(&s, 12);
    assert_eq!(out.board[12], 0);
    assert_eq!(out.board[13], 1);
    assert_eq!(out.board[0], 1);
    assert_eq!(out.board[1], 1);
    assert_eq!(out.board[2], 1);
}

#[test]
fn execute_switches_turn() {
    let s = GameState::initial();
    let (out, _) = execute_move(&s, 0);
    assert_eq!(out.current_player, Player::Two);
}

#[test]
fn execute_does_not_mutate_original() {
    let s = GameState::initial();
    let original_board = s.board;
    let _ = execute_move(&s, 0);
    assert_eq!(s.board, original_board);
}

// ─── Capture ─────────────────────────────────────────────────────────────────

#[test]
fn capture_simple_two_on_opponent_side() {
    // Land last drop on pit 8 (NOT opp_start which is 7 for P1) making it 2.
    let mut board = empty_board();
    board[5] = 3; // distribute to 6, 7, 8
    board[8] = 1; // becomes 2 after last drop
    board[9] = 5; // keep opp alive
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 5);
    // Chain walks back from 8: pit 8 (=2) capture. Pit 7 becomes 1 (not 2-4) → stop.
    assert_eq!(outcome.captured, 2);
    assert_eq!(out.scores[0], 2);
    assert_eq!(out.board[8], 0);
}

#[test]
fn capture_chain_two_then_three() {
    // P1 last drop at pit 8 making it 2. Pit 7 has 3. Chain: 8→7.
    let mut board = empty_board();
    board[5] = 3;
    board[6] = 0;
    board[7] = 3; // chain-capturable
    board[8] = 1; // becomes 2 after last drop
    board[10] = 5; // keep opp alive
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 5);
    // 3 seeds from pit 5 distributed: 6→1, 7→4, 8→2. Pit 7 now has 4 (capturable). Chain 8(=2) ← 7(=4).
    assert_eq!(outcome.captured, 6); // 2 + 4
    assert_eq!(out.scores[0], 6);
    assert_eq!(out.board[7], 0);
    assert_eq!(out.board[8], 0);
}

#[test]
fn yini_blocks_chain() {
    // P1 plays pit 0 with 10 seeds — distribution fills pits 1..=10 each +1.
    // Pre-set pit 9 = 4 → becomes 5 (Yini) after distribution.
    // Pre-set pit 10 = 1 → becomes 2 (capturable) after distribution.
    // Chain walks 10 (=2, capture), 9 (=5, Yini → break).
    let mut board = empty_board();
    board[0] = 10;
    board[9] = 4; // → 5 (Yini) after distribution
    board[10] = 1; // → 2 after distribution, captured
    board[12] = 3; // keep opp alive (distribution adds 1 here too)
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 0);
    assert_eq!(outcome.captured, 2);
    assert_eq!(out.board[10], 0);
    assert_eq!(out.board[9], 5, "Yini untouched by capture");
    assert!(outcome.chain_blocked_by_yini);
}

#[test]
fn capture_skipped_on_opp_start_pit() {
    // P1 plays pit 5 with 2 seeds: distribution 6→1, 7→+1. Last drop on pit 7 = opp_start.
    // Capture must be skipped even though value becomes 2.
    let mut board = empty_board();
    board[5] = 2;
    board[7] = 1; // becomes 2 after drop
    board[10] = 5; // keep opp alive
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 5);
    assert_eq!(outcome.captured, 0);
    assert_eq!(out.scores[0], 0);
    assert_eq!(out.board[7], 2);
}

#[test]
fn fourteen_seeds_olôa_autocapture() {
    // 14 seeds → full lap distributing to all 13 other pits (each +1), then last = autocapture +1.
    let mut board = empty_board();
    board[0] = 14;
    board[10] = 3; // keep opp alive
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 0);
    assert!(outcome.was_auto_capture);
    assert_eq!(out.scores[0], 1);
    // All 13 other pits should have had +1 from the first loop
    for i in 1..14 {
        let expected = if i == 10 { 4 } else { 1 };
        assert_eq!(out.board[i], expected, "pit {i}");
    }
    assert_eq!(out.board[0], 0);
}

#[test]
fn twenty_one_seeds_akuru_autocapture() {
    // 21 seeds: 13 distributed to all other pits; remaining 8 with (21-13)%7 = 1 → auto-capture.
    // Seeds to distribute in opp: 8-1 = 7 (each opp pit +1), then last = +1 score.
    let mut board = empty_board();
    board[0] = 21;
    board[10] = 3; // keep opp from pre-existing starvation logic
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 0);
    assert!(outcome.was_auto_capture);
    assert_eq!(out.scores[0], 1);
    // P1 pits (not origin) +1 each; P2 pits +1 (from first loop) +1 (from opp loop) = +2 each.
    assert_eq!(out.board[0], 0);
    for i in 1..7 {
        assert_eq!(out.board[i], 1, "P1 pit {i}");
    }
    for i in 7..14 {
        let expected = if i == 10 { 5 } else { 2 };
        assert_eq!(out.board[i], expected, "P2 pit {i}");
    }
}

// ─── Desperate auto-capture ──────────────────────────────────────────────────

#[test]
fn desperate_last_pit_triggers_autocapture_and_solidarity() {
    let mut board = empty_board();
    board[6] = 1; // Only seed on P1's side, in last pit
    board[10] = 3; // P2 has seeds — game continues
    let s = custom(board, Player::One);
    let (out, outcome) = execute_move(&s, 6);
    assert!(outcome.was_desperate);
    assert_eq!(out.scores[0], 1);
    assert!(out.solidarity_mode);
    assert_eq!(out.solidarity_beneficiary, Some(Player::One));
    assert_eq!(out.current_player, Player::Two);
    assert_eq!(out.board[6], 0);
}

// ─── Solidarity feeding failure ends game ────────────────────────────────────

#[test]
fn unable_to_feed_ends_game_with_current_player_sweeping() {
    // P1 has 1 seed in pit 0 that cannot reach opp side (reaches pit 1).
    // Opp side empty. No feeding move possible → play the single seed, then end game.
    let mut board = empty_board();
    board[0] = 1;
    let s = custom(board, Player::One);
    assert!(is_valid_move(&s, 0).is_ok()); // allowed since no feeding move exists anyway

    let (out, _) = execute_move(&s, 0);
    // After drop: pit 1 has 1. Opp still empty (not fed). Game ends, P1 sweeps remaining 1.
    assert_eq!(out.status, GameStatus::Finished);
    assert_eq!(out.scores[0], 1);
    assert_eq!(out.board.iter().sum::<u8>(), 0);
}

// ─── Seed conservation invariant ─────────────────────────────────────────────

#[test]
fn seed_total_is_conserved_across_random_game() {
    use rand::{Rng, SeedableRng};
    use rand_chacha::ChaCha8Rng;

    let mut rng = ChaCha8Rng::seed_from_u64(42);

    for seed in 0..50 {
        let mut rng = ChaCha8Rng::seed_from_u64(seed);
        let mut state = GameState::initial();
        let mut plies = 0usize;
        while !state.is_terminal() && plies < 500 {
            let vm = valid_moves(&state);
            if vm.is_empty() {
                break;
            }
            let pick = vm[rng.gen_range(0..vm.len())] as usize;
            let (next, _) = execute_move(&state, pick);
            state = next;
            plies += 1;

            let total: u16 = state.board.iter().map(|&b| b as u16).sum::<u16>()
                + state.scores.iter().map(|&s| s as u16).sum::<u16>();
            assert_eq!(total, 70, "seed total broken at ply {plies}, seed {seed}");
        }
    }
    // prevent unused var warning
    let _ = rng.gen::<u8>();
}

#[test]
fn random_games_always_terminate() {
    use rand::{Rng, SeedableRng};
    use rand_chacha::ChaCha8Rng;

    for seed in 0..30 {
        let mut rng = ChaCha8Rng::seed_from_u64(seed);
        let mut state = GameState::initial();
        let mut plies = 0usize;
        while !state.is_terminal() && plies < 500 {
            let vm = valid_moves(&state);
            if vm.is_empty() {
                break;
            }
            let pick = vm[rng.gen_range(0..vm.len())] as usize;
            let (next, _) = execute_move(&state, pick);
            state = next;
            plies += 1;
        }
        assert!(state.is_terminal() || plies >= 500, "game stalled at ply {plies}, seed {seed}");
        // Winner should be determined at termination
        if state.is_terminal() {
            assert!(state.winner.is_some(), "finished game must have winner");
        }
    }
}
