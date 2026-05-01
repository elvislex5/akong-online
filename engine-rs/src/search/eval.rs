//! Static evaluation for leaves of the minimax search.
//!
//! Convention: positive = good for the mover (state.current_player).
//! Scale: centipoints, where ~1000 ≈ "certain win" and 10 = 0.1 seeds of
//! material advantage. The heuristic mirrors the concepts already proven
//! in services/fastSongo.ts (score diff, greniers, vulnerable pits).

use crate::state::{GameState, Player, TOTAL_PITS, WinState};

pub const EVAL_WIN: i32 = 100_000;
pub const EVAL_MAX: i32 = 1_000_000;

/// Evaluate a position from the current mover's perspective.
pub fn leaf_eval(state: &GameState) -> i32 {
    // Terminal → use winner field
    if state.is_terminal() {
        let mover = state.current_player;
        return match state.winner {
            Some(WinState::Player(p)) if p == mover => EVAL_WIN,
            Some(WinState::Player(_)) => -EVAL_WIN,
            Some(WinState::Draw) => 0,
            None => score_diff_centi(state),
        };
    }

    // Winning score reached (pre-terminal-classification)
    let win_score = state.winning_score() as i32;
    let my_score = state.scores[player_slot(state.current_player)] as i32;
    let op_score = state.scores[player_slot(state.current_player.opponent())] as i32;
    if my_score >= win_score {
        return EVAL_WIN;
    }
    if op_score >= win_score {
        return -EVAL_WIN;
    }

    // Base: score differential
    let mut value = (my_score - op_score) * 100;

    // Material on board — mover's side minus opponent's side
    let (my_side, op_side) = sides(state);
    let my_material: i32 = my_side.iter().map(|&b| b as i32).sum();
    let op_material: i32 = op_side.iter().map(|&b| b as i32).sum();
    value += (my_material - op_material) * 5;

    // Greniers (>= 14 seeds in a single pit) — strategic reserve
    let my_greniers = my_side.iter().filter(|&&b| b >= 14).count() as i32;
    let op_greniers = op_side.iter().filter(|&&b| b >= 14).count() as i32;
    value += (my_greniers - op_greniers) * 60;

    // Vulnerability — number of pits with 2-4 seeds the opponent could capture on their next move
    // (lightweight: just counts, doesn't verify reachability).
    let my_vulnerable = my_side.iter().filter(|&&b| (2..=4).contains(&b)).count() as i32;
    let op_vulnerable = op_side.iter().filter(|&&b| (2..=4).contains(&b)).count() as i32;
    value -= my_vulnerable * 8;
    value += op_vulnerable * 8;

    // Yini (pit with exactly 5 seeds) — stable "mother" pits, small bonus
    let my_yini = my_side.iter().filter(|&&b| b == 5).count() as i32;
    let op_yini = op_side.iter().filter(|&&b| b == 5).count() as i32;
    value += (my_yini - op_yini) * 3;

    value
}

fn score_diff_centi(state: &GameState) -> i32 {
    let mover = state.current_player;
    let my = state.scores[player_slot(mover)] as i32;
    let op = state.scores[player_slot(mover.opponent())] as i32;
    (my - op) * 100
}

#[inline]
fn player_slot(p: Player) -> usize {
    match p {
        Player::One => 0,
        Player::Two => 1,
    }
}

fn sides(state: &GameState) -> (&[u8], &[u8]) {
    let (a, b) = state.board.split_at(7);
    match state.current_player {
        Player::One => (a, b),
        Player::Two => (b, a),
    }
}

// Silence unused import warning when building without tests
#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::GameState;

    #[test]
    fn initial_position_is_close_to_zero() {
        let s = GameState::initial();
        let e = leaf_eval(&s);
        assert!(e.abs() < 100, "initial eval {e} not near zero");
    }

    #[test]
    fn score_advantage_dominates() {
        let mut s = GameState::initial();
        s.scores = [20, 5];
        assert!(leaf_eval(&s) > 1000, "P1 ahead by 15 should be > 10 eval");
        s.current_player = crate::state::Player::Two;
        assert!(leaf_eval(&s) < -1000, "from P2 perspective should be very negative");
    }

    #[test]
    fn winning_score_returns_eval_win() {
        let mut s = GameState::initial();
        s.scores = [36, 10];
        assert_eq!(leaf_eval(&s), EVAL_WIN);
    }

    // Silence dead-code warning on TOTAL_PITS which we import transitively via state.
    #[test]
    fn total_pits_constant_import() {
        assert_eq!(TOTAL_PITS, 14);
    }
}
