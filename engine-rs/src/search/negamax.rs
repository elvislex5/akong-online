//! Depth-limited negamax with α-β pruning.

use crate::rules::{execute_move, valid_moves};
use crate::search::eval::{leaf_eval, EVAL_MAX, EVAL_WIN};
use crate::state::GameState;

#[derive(Debug, Clone, Copy)]
pub struct SearchResult {
    /// Best move found (absolute pit index 0..13). `u8::MAX` if no legal move.
    pub best_move: u8,
    /// Evaluation in centipoints from the mover's perspective.
    pub eval: i32,
    /// Depth actually searched to the best move.
    pub depth: u8,
    /// Number of leaf evaluations performed.
    pub nodes: u64,
}

struct SearchCtx {
    nodes: u64,
}

/// Run negamax α-β to the given depth. Returns the best move plus its eval
/// in centipoints. Uses move-ordering that prefers captures (moves whose
/// immediate eval improvement is highest). Skips non-legal positions.
pub fn search_best(state: &GameState, depth: u8) -> SearchResult {
    let vm = valid_moves(state);
    if vm.is_empty() {
        return SearchResult {
            best_move: u8::MAX,
            eval: leaf_eval(state),
            depth: 0,
            nodes: 1,
        };
    }
    if depth == 0 {
        return SearchResult {
            best_move: vm[0],
            eval: leaf_eval(state),
            depth: 0,
            nodes: 1,
        };
    }

    let mut ctx = SearchCtx { nodes: 0 };
    let mut best_score = -EVAL_MAX;
    let mut best_move: u8 = vm[0];
    let alpha = -EVAL_MAX;
    let beta = EVAL_MAX;

    for m in vm.iter() {
        let (child, _) = execute_move(state, *m as usize);
        let score = -negamax(&child, depth - 1, -beta, -alpha.max(best_score), &mut ctx);
        if score > best_score {
            best_score = score;
            best_move = *m;
        }
    }

    SearchResult {
        best_move,
        eval: best_score,
        depth,
        nodes: ctx.nodes,
    }
}

/// Core negamax α-β. Returns score from mover's perspective.
fn negamax(state: &GameState, depth: u8, alpha: i32, beta: i32, ctx: &mut SearchCtx) -> i32 {
    ctx.nodes += 1;
    if state.is_terminal() {
        return leaf_eval(state);
    }
    if depth == 0 {
        return leaf_eval(state);
    }

    let vm = valid_moves(state);
    if vm.is_empty() {
        return leaf_eval(state);
    }

    let mut alpha = alpha;
    let mut best = -EVAL_MAX;
    for m in vm.iter() {
        let (child, _) = execute_move(state, *m as usize);
        let score = -negamax(&child, depth - 1, -beta, -alpha, ctx);
        if score > best {
            best = score;
        }
        if best > alpha {
            alpha = best;
        }
        if alpha >= beta {
            // β-cutoff — remaining moves cannot improve the caller's bound
            return best;
        }
    }
    best
}

/// Scale a centipoint eval into the book storage's i16 `eval_centi` field,
/// which represents "milli-win-probability" in [-1000, +1000].
///
/// We squash raw centipoint evals (which can reach ±EVAL_WIN) through a
/// tanh-like function so the stored values align with downstream consumers
/// expecting probabilities.
pub fn squash_to_centi_i16(raw_eval: i32) -> i16 {
    if raw_eval >= EVAL_WIN {
        return 1000;
    }
    if raw_eval <= -EVAL_WIN {
        return -1000;
    }
    // Tanh-like: raw / (raw + K) where K controls saturation speed.
    // At raw = 500, (500 / (500+1500)) ≈ 0.25 → 250.
    // At raw = 2000, (2000 / 3500) ≈ 0.57 → 570.
    // At raw = 5000, (5000 / 6500) ≈ 0.77 → 770.
    let k: i64 = 1500;
    let raw = raw_eval as i64;
    let sign: i64 = if raw < 0 { -1 } else { 1 };
    let mag = (raw.abs() * 1000) / (raw.abs() + k);
    (sign * mag) as i16
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_depth_0_returns_a_legal_move() {
        let s = GameState::initial();
        let r = search_best(&s, 0);
        assert!(r.best_move < 7);
    }

    #[test]
    fn search_depth_4_finds_reasonable_move() {
        let s = GameState::initial();
        let r = search_best(&s, 4);
        assert!(r.best_move < 7);
        assert!(r.nodes > 10);
    }

    #[test]
    fn squash_saturates_at_win() {
        assert_eq!(squash_to_centi_i16(EVAL_WIN), 1000);
        assert_eq!(squash_to_centi_i16(-EVAL_WIN), -1000);
        assert_eq!(squash_to_centi_i16(0), 0);
    }

    #[test]
    fn squash_monotone() {
        let a = squash_to_centi_i16(500);
        let b = squash_to_centi_i16(2000);
        let c = squash_to_centi_i16(5000);
        assert!(a < b && b < c, "squash should be monotone increasing: {a} < {b} < {c}");
    }
}
