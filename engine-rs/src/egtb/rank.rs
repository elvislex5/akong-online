//! Combinatorial ranking of EGTB positions.
//!
//! A position in the EGTB is defined by (board, scores, current_player,
//! solidarity_mode, solidarity_beneficiary). For a fixed `N = sum(board)`:
//!
//!   - Board: composition of N into 14 non-negative parts ⇒ C(N+13, 13) options.
//!   - Score s1 ∈ [0, 70−N]; s2 = 70−N−s1. ⇒ (71−N) options.
//!   - current_player ∈ {0, 1}. ⇒ 2.
//!   - Solidarity encoding: 0 = inactive, 1 = active+benef=P1, 2 = active+benef=P2. ⇒ 3.
//!
//! Layer size(N) = C(N+13, 13) × (71−N) × 2 × 3.

use crate::state::{GameState, GameStatus, Player, TOTAL_PITS, Variant};

pub type Index = u64;

// For Songo EGTB: max seeds N = 70, parts_left ≤ 13, so we need
// C(n + parts_left - 1, parts_left - 1) with n ≤ 70 and parts_left ≤ 13.
// Upper bound on the first arg: 70 + 13 - 1 = 82. Use 84 for safety.
const MAX_BINOM_N: usize = 84;
const MAX_BINOM_K: usize = 14;

/// Precomputed Pascal table for C(n, k).
pub struct Binomials {
    table: Vec<[u64; MAX_BINOM_K + 1]>,
}

impl Binomials {
    pub fn new() -> Self {
        let mut table = vec![[0u64; MAX_BINOM_K + 1]; MAX_BINOM_N + 1];
        for n in 0..=MAX_BINOM_N {
            table[n][0] = 1;
            for k in 1..=MAX_BINOM_K.min(n) {
                let a = table[n - 1][k - 1];
                let b = if k <= n - 1 { table[n - 1][k] } else { 0 };
                table[n][k] = a + b;
            }
        }
        Self { table }
    }

    #[inline]
    pub fn c(&self, n: i64, k: i64) -> u64 {
        if n < 0 || k < 0 || k > n {
            return 0;
        }
        let nu = n as usize;
        let ku = k as usize;
        debug_assert!(nu <= MAX_BINOM_N && ku <= MAX_BINOM_K);
        self.table[nu][ku]
    }
}

impl Default for Binomials {
    fn default() -> Self {
        Self::new()
    }
}

#[inline]
pub fn board_count(n: u8, bin: &Binomials) -> u64 {
    bin.c(n as i64 + 13, 13)
}

#[inline]
pub fn position_count(n: u8, bin: &Binomials) -> u64 {
    board_count(n, bin) * (71 - n as u64) * 2 * 3
}

/// Ranks a composition of N into 14 non-negative parts into [0, C(N+13, 13)) in lex order.
pub fn rank_board(board: &[u8; TOTAL_PITS], bin: &Binomials) -> u64 {
    let n: i64 = board.iter().map(|&x| x as i64).sum();
    let mut rank = 0u64;
    let mut remaining = n;
    for i in 0..(TOTAL_PITS - 1) {
        let bi = board[i] as i64;
        let parts_left = (TOTAL_PITS - 1 - i) as i64;
        for k in 0..bi {
            rank += bin.c(remaining - k + parts_left - 1, parts_left - 1);
        }
        remaining -= bi;
    }
    rank
}

pub fn unrank_board(n: u8, mut rank: u64, bin: &Binomials) -> [u8; TOTAL_PITS] {
    let mut board = [0u8; TOTAL_PITS];
    let mut remaining = n as i64;
    for i in 0..(TOTAL_PITS - 1) {
        let parts_left = (TOTAL_PITS - 1 - i) as i64;
        let mut bi = 0i64;
        loop {
            if bi > remaining {
                break;
            }
            let block = bin.c(remaining - bi + parts_left - 1, parts_left - 1);
            if rank < block {
                break;
            }
            rank -= block;
            bi += 1;
        }
        board[i] = bi as u8;
        remaining -= bi;
    }
    board[TOTAL_PITS - 1] = remaining as u8;
    board
}

/// Solidarity encoding: (mode, beneficiary) → 0..3.
#[inline]
fn sol_code(mode: bool, benef: Option<Player>) -> u64 {
    match (mode, benef) {
        (false, _) => 0,
        (true, Some(Player::One)) => 1,
        (true, Some(Player::Two)) => 2,
        (true, None) => 0, // treat as inactive (pathological)
    }
}

#[inline]
fn sol_decode(code: u64) -> (bool, Option<Player>) {
    match code {
        0 => (false, None),
        1 => (true, Some(Player::One)),
        2 => (true, Some(Player::Two)),
        _ => (false, None),
    }
}

/// Full EGTB position index within a layer of fixed N.
#[inline]
pub fn rank_position(state: &GameState, bin: &Binomials) -> Index {
    let n: u64 = state.board.iter().map(|&x| x as u64).sum();
    let score_configs = 71u64 - n;
    let br = rank_board(&state.board, bin);
    let s1 = state.scores[0] as u64;
    debug_assert!(s1 < score_configs);
    let player_bit = if state.current_player == Player::One { 0 } else { 1 };
    let sc = sol_code(state.solidarity_mode, state.solidarity_beneficiary);
    (((br * score_configs + s1) * 2) + player_bit) * 3 + sc
}

/// Inverse of `rank_position`. Fixed to Gabon variant (winning_score = 36).
pub fn unrank_position(n: u8, idx: Index, bin: &Binomials) -> GameState {
    let sc = idx % 3;
    let rest = idx / 3;
    let player_bit = rest & 1;
    let rest = rest >> 1;
    let score_configs = 71u64 - n as u64;
    let s1 = (rest % score_configs) as u8;
    let br = rest / score_configs;
    let s2 = 70 - n - s1;
    let board = unrank_board(n, br, bin);
    let (sm, sb) = sol_decode(sc);
    GameState {
        board,
        scores: [s1, s2],
        current_player: if player_bit == 0 { Player::One } else { Player::Two },
        status: GameStatus::Playing,
        winner: None,
        solidarity_mode: sm,
        solidarity_beneficiary: sb,
        variant: Variant::Gabon,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binomial_pascal_identity() {
        let b = Binomials::new();
        assert_eq!(b.c(0, 0), 1);
        assert_eq!(b.c(5, 2), 10);
        assert_eq!(b.c(10, 3), 120);
        assert_eq!(b.c(20, 10), 184_756);
    }

    #[test]
    fn board_rank_roundtrip_small() {
        let b = Binomials::new();
        for n in 0u8..=10 {
            let total = board_count(n, &b);
            for i in 0..total {
                let board = unrank_board(n, i, &b);
                assert_eq!(rank_board(&board, &b), i, "roundtrip failed N={n} idx={i}");
                assert_eq!(board.iter().map(|&x| x as u64).sum::<u64>(), n as u64);
            }
        }
    }

    #[test]
    fn position_rank_roundtrip_small() {
        let b = Binomials::new();
        for n in 0u8..=4 {
            let total = position_count(n, &b);
            for i in 0..total {
                let state = unrank_position(n, i, &b);
                assert_eq!(rank_position(&state, &b), i, "position roundtrip N={n} idx={i}");
            }
        }
    }

    #[test]
    fn board_count_matches_formula() {
        let b = Binomials::new();
        // C(5+13, 13) = C(18, 13) = 8568
        assert_eq!(board_count(5, &b), 8568);
        // C(15+13, 13) = C(28, 13)
        assert_eq!(board_count(15, &b), b.c(28, 13));
    }
}
