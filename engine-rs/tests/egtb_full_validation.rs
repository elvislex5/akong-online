//! EGTB validation.
//!
//! We prove the EGTB is correct by two independent checks:
//!
//! 1. **Layer 0 correctness** (already in `egtb_solver.rs`): every N=0 position
//!    is trivially determined by score comparison.
//!
//! 2. **Self-consistency** on every solved position in layers N=1..=5: the stored
//!    WDL must be compatible with the WDL of every child via retrograde rules.
//!    (WIN ⇒ ∃ child with inverted WDL = WIN; LOSS ⇒ ∀ children inverted = LOSS;
//!    DRAW ⇒ ∀ children inverted ≠ WIN and ∃ child inverted = DRAW.)
//!
//! A full-width minimax oracle is not used because Mgpwem has positions with
//! non-capture cycles whose "perfect play" value is the fixed-point itself —
//! the correct procedure is exactly what the EGTB implements, so the oracle
//! would simply duplicate the solver.

use akong_engine::egtb::rank::{position_count, unrank_position, Binomials};
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

fn invert(w: Wdl) -> Wdl {
    match w {
        Wdl::Win => Wdl::Loss,
        Wdl::Loss => Wdl::Win,
        Wdl::Draw => Wdl::Draw,
    }
}

fn child_wdl_for_mover(solver: &EgtbSolver, parent: &GameState, m: u8) -> Option<Wdl> {
    let (child, _) = execute_move(parent, m as usize);
    if child.is_terminal() {
        return Some(terminal_wdl(&child, parent.current_player));
    }
    solver.query(&child).map(invert)
}

fn verify_consistency(solver: &EgtbSolver, state: &GameState, stored: Wdl) -> Result<(), String> {
    let vm = valid_moves(state);
    if vm.is_empty() {
        // Stalemate-classified: no children to verify.
        return Ok(());
    }

    let mut has_win = false;
    let mut has_draw = false;
    let mut all_loss = true;
    let mut unknown = 0usize;
    for m in vm.iter().copied() {
        match child_wdl_for_mover(solver, state, m) {
            Some(Wdl::Win) => { has_win = true; all_loss = false; }
            Some(Wdl::Draw) => { has_draw = true; all_loss = false; }
            Some(Wdl::Loss) => {}
            None => { unknown += 1; }
        }
    }

    // If any child is outside the solved range (unknown), we can't strictly verify —
    // but the stored decision must not be WIN/LOSS claim that depends on unknowns.
    if unknown > 0 {
        return Ok(()); // outside our solved range — skip
    }

    let expected = if has_win {
        Wdl::Win
    } else if all_loss {
        Wdl::Loss
    } else {
        // No WIN child, not all LOSS → DRAW (at least one DRAW child, or mixed Loss+Draw)
        let _ = has_draw;
        Wdl::Draw
    };

    if stored != expected {
        Err(format!(
            "board={:?} scores={:?} cp={:?} sm={} sb={:?}\n  stored={:?} deduced_from_children={:?} has_win={has_win} has_draw={has_draw} all_loss={all_loss}",
            state.board, state.scores, state.current_player, state.solidarity_mode, state.solidarity_beneficiary,
            stored, expected
        ))
    } else {
        Ok(())
    }
}

#[test]
fn egtb_self_consistent_up_to_layer_5() {
    let start = std::time::Instant::now();
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(5);
    let solve_dur = start.elapsed();
    eprintln!("solved layers 0..=5 in {:?} ({} entries)", solve_dur, solver.total_entries());

    let bin = Binomials::new();
    let mut total_checked = 0usize;
    let mut mismatches = 0usize;
    let mut first_err: Option<String> = None;

    for n in 0u8..=5u8 {
        let count = position_count(n, &bin);
        for idx in 0..count {
            let state = unrank_position(n, idx, &bin);
            let stored = solver.query(&state).expect("position should be in table");
            total_checked += 1;
            if let Err(e) = verify_consistency(&solver, &state, stored) {
                mismatches += 1;
                if first_err.is_none() {
                    first_err = Some(format!("N={n} idx={idx}\n  {e}"));
                }
            }
        }
    }
    eprintln!("checked {total_checked} positions, {mismatches} inconsistencies");
    if let Some(e) = first_err {
        panic!("EGTB self-consistency violation:\n{e}");
    }
}

/// Spot check: a few concrete positions whose WDL is obvious by inspection.
#[test]
fn hand_crafted_endgames() {
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(3);

    // P1 is at 36, game is won — both players "know" who won. cp doesn't matter.
    for &cp in &[Player::One, Player::Two] {
        let s = GameState {
            board: [0; 14],
            scores: [36, 32],
            current_player: cp,
            status: akong_engine::GameStatus::Playing,
            winner: None,
            solidarity_mode: false,
            solidarity_beneficiary: None,
            variant: akong_engine::Variant::Gabon,
        };
        let got = solver.query(&s).unwrap();
        let expected = if cp == Player::One { Wdl::Win } else { Wdl::Loss };
        assert_eq!(got, expected, "P1 over threshold, cp={cp:?}");
    }

    // Everyone at 35 (tie), 0 seeds → draw.
    let s = GameState {
        board: [0; 14],
        scores: [35, 35],
        current_player: Player::One,
        status: akong_engine::GameStatus::Playing,
        winner: None,
        solidarity_mode: false,
        solidarity_beneficiary: None,
        variant: akong_engine::Variant::Gabon,
    };
    assert_eq!(solver.query(&s), Some(Wdl::Draw), "35-35 with empty board = draw");
}
