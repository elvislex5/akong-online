//! Integration tests for the EGTB solver.
//!
//! Runs retrograde analysis on small layers (N=0..=6) and cross-checks
//! a sample of positions against an independent full-width minimax search
//! on the live engine.

use akong_engine::{
    execute_move, valid_moves, EgtbSolver, GameState, Player, Wdl, WinState,
};

fn terminal_wdl(state: &GameState, perspective: Player) -> Wdl {
    match state.winner {
        Some(WinState::Player(p)) if p == perspective => Wdl::Win,
        Some(WinState::Player(_)) => Wdl::Loss,
        Some(WinState::Draw) => Wdl::Draw,
        None => Wdl::Draw,
    }
}

/// Independent minimax WDL oracle (full-width, memoized). Used to cross-check
/// the EGTB on small layers. Slow, so only use on ≤ a few thousand positions.
fn minimax_wdl(
    state: &GameState,
    memo: &mut std::collections::HashMap<(Vec<u8>, [u8; 2], u8, bool, u8), Wdl>,
    depth_budget: u32,
) -> Option<Wdl> {
    if state.is_terminal() {
        return Some(terminal_wdl(state, state.current_player));
    }
    if depth_budget == 0 {
        return None; // exceeded budget
    }
    let key = (
        state.board.to_vec(),
        state.scores,
        if state.current_player == Player::One { 0u8 } else { 1 },
        state.solidarity_mode,
        state.solidarity_beneficiary.map_or(3, |p| if p == Player::One { 0 } else { 1 }),
    );
    if let Some(&w) = memo.get(&key) {
        return Some(w);
    }
    let vm = valid_moves(state);
    if vm.is_empty() {
        // Stalemate: let the engine show us — play any move? No, there are none.
        // We simulate stalemate manually. But we can detect: no valid moves means
        // game effectively ends here with owner-sweep.
        let mut s = state.clone();
        let mut scores = s.scores;
        for i in 0..14 {
            if s.board[i] > 0 {
                let slot = if i < 7 { 0 } else { 1 };
                scores[slot] += s.board[i];
                s.board[i] = 0;
            }
        }
        let win = s.winning_score();
        let cp = s.current_player;
        let wdl = if scores[0] >= win {
            if cp == Player::One { Wdl::Win } else { Wdl::Loss }
        } else if scores[1] >= win {
            if cp == Player::Two { Wdl::Win } else { Wdl::Loss }
        } else if scores[0] > scores[1] {
            if cp == Player::One { Wdl::Win } else { Wdl::Loss }
        } else if scores[1] > scores[0] {
            if cp == Player::Two { Wdl::Win } else { Wdl::Loss }
        } else {
            Wdl::Draw
        };
        memo.insert(key, wdl);
        return Some(wdl);
    }
    let mut has_win = false;
    let mut has_draw = false;
    let mut all_loss = true;
    let mut had_unknown = false;
    for m in vm {
        let (child, _) = execute_move(state, m as usize);
        let wdl_for_mover = if child.is_terminal() {
            terminal_wdl(&child, state.current_player)
        } else {
            match minimax_wdl(&child, memo, depth_budget - 1) {
                Some(w) => w.invert_opp(),
                None => {
                    had_unknown = true;
                    continue;
                }
            }
        };
        match wdl_for_mover {
            Wdl::Win => { has_win = true; all_loss = false; }
            Wdl::Draw => { has_draw = true; all_loss = false; }
            Wdl::Loss => {}
        }
    }
    let w = if has_win {
        Wdl::Win
    } else if had_unknown {
        return None;
    } else if has_draw {
        Wdl::Draw
    } else if all_loss {
        Wdl::Loss
    } else {
        Wdl::Draw
    };
    memo.insert(key, w);
    Some(w)
}

trait WdlExt {
    fn invert_opp(self) -> Wdl;
}
impl WdlExt for Wdl {
    fn invert_opp(self) -> Wdl {
        match self {
            Wdl::Win => Wdl::Loss,
            Wdl::Loss => Wdl::Win,
            Wdl::Draw => Wdl::Draw,
        }
    }
}

#[test]
fn solver_handles_empty_board_layer() {
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(0);

    // Layer 0: board all zeros. Score sums to 70. Winner by score.
    for s1 in 0..=70u8 {
        let s2 = 70 - s1;
        for &cp in &[Player::One, Player::Two] {
            let state = GameState {
                board: [0; 14],
                scores: [s1, s2],
                current_player: cp,
                status: akong_engine::GameStatus::Playing, // EGTB stores non-terminal encoding
                winner: None,
                solidarity_mode: false,
                solidarity_beneficiary: None,
                variant: akong_engine::Variant::Gabon,
            };
            let got = solver.query(&state).expect("layer 0 should be solved");
            // With 0 seeds in play, the game ended. Winner = whoever has more score (36 threshold).
            let expected = if s1 >= 36 {
                if cp == Player::One { Wdl::Win } else { Wdl::Loss }
            } else if s2 >= 36 {
                if cp == Player::Two { Wdl::Win } else { Wdl::Loss }
            } else if s1 > s2 {
                if cp == Player::One { Wdl::Win } else { Wdl::Loss }
            } else if s2 > s1 {
                if cp == Player::Two { Wdl::Win } else { Wdl::Loss }
            } else {
                Wdl::Draw
            };
            assert_eq!(got, expected, "s1={s1} cp={cp:?}");
        }
    }
}

#[test]
fn solver_matches_minimax_on_tiny_positions() {
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(4);

    let mut memo = std::collections::HashMap::new();
    let mut checked = 0usize;
    let mut mismatches = 0usize;

    // Sample positions from layer N=3 with scores near mid-game
    for s1 in [20u8, 30, 34] {
        for n in 1u8..=3 {
            let s2 = 70 - n - s1;
            // A few hand-picked board distributions for N seeds
            let boards: Vec<[u8; 14]> = match n {
                1 => vec![
                    {
                        let mut b = [0; 14];
                        b[0] = 1;
                        b
                    },
                    {
                        let mut b = [0; 14];
                        b[13] = 1;
                        b
                    },
                ],
                2 => vec![
                    {
                        let mut b = [0; 14];
                        b[0] = 2;
                        b
                    },
                    {
                        let mut b = [0; 14];
                        b[5] = 1;
                        b[8] = 1;
                        b
                    },
                ],
                3 => vec![
                    {
                        let mut b = [0; 14];
                        b[3] = 3;
                        b
                    },
                    {
                        let mut b = [0; 14];
                        b[2] = 1;
                        b[7] = 1;
                        b[11] = 1;
                        b
                    },
                ],
                _ => unreachable!(),
            };
            for board in boards {
                for &cp in &[Player::One, Player::Two] {
                    let state = GameState {
                        board,
                        scores: [s1, s2],
                        current_player: cp,
                        status: akong_engine::GameStatus::Playing,
                        winner: None,
                        solidarity_mode: false,
                        solidarity_beneficiary: None,
                        variant: akong_engine::Variant::Gabon,
                    };
                    let egtb_wdl = solver.query(&state);
                    let mm_wdl = minimax_wdl(&state, &mut memo, 200);
                    match (egtb_wdl, mm_wdl) {
                        (Some(a), Some(b)) => {
                            checked += 1;
                            if a != b {
                                mismatches += 1;
                                eprintln!(
                                    "MISMATCH: board={:?} scores=[{},{}] cp={:?} egtb={:?} minimax={:?}",
                                    state.board, s1, s2, cp, a, b
                                );
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }
    assert!(checked > 0, "no positions checked");
    assert_eq!(mismatches, 0, "{mismatches}/{checked} disagreements");
}
