//! Deterministic 64-bit hash for GameState — used as the opening book's
//! primary key. Collisions over the ~10^6 positions we'll ever enumerate
//! are astronomically unlikely with a well-seeded 64-bit space.
//!
//! We use FNV-1a over a canonical byte-packed representation so the same
//! state always produces the same hash regardless of struct field order.

use crate::state::{GameState, Player, TOTAL_PITS};

pub type StateHash = u64;

const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x100_0000_01b3;

#[inline]
fn fnv1a_update(mut h: u64, byte: u8) -> u64 {
    h ^= byte as u64;
    h = h.wrapping_mul(FNV_PRIME);
    h
}

/// Pack state into bytes and hash with FNV-1a.
///
/// Layout (20 bytes total):
///   [0..14] : pits 0..13 (u8 each, seeds)
///   [14]    : player 1 score
///   [15]    : player 2 score
///   [16]    : current player (0|1)
///   [17]    : variant marker (Gabon=0, Cameroon=1)
///   [18]    : solidarity flags (bit 0 = mode, bits 1-2 = beneficiary encoded)
///   [19]    : reserved (always 0 for future compat)
pub fn state_hash(state: &GameState) -> StateHash {
    let mut h = FNV_OFFSET;
    for i in 0..TOTAL_PITS {
        h = fnv1a_update(h, state.board[i]);
    }
    h = fnv1a_update(h, state.scores[0]);
    h = fnv1a_update(h, state.scores[1]);
    h = fnv1a_update(h, match state.current_player { Player::One => 0, Player::Two => 1 });
    h = fnv1a_update(h, match state.variant {
        crate::state::Variant::Gabon => 0,
        crate::state::Variant::Cameroon => 1,
    });
    let sol = match (state.solidarity_mode, state.solidarity_beneficiary) {
        (false, _) => 0u8,
        (true, Some(Player::One)) => 0b0000_0011,
        (true, Some(Player::Two)) => 0b0000_0101,
        (true, None) => 0b0000_0001,
    };
    h = fnv1a_update(h, sol);
    h = fnv1a_update(h, 0);
    h
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{GameState, Player};

    #[test]
    fn same_state_same_hash() {
        let a = GameState::initial();
        let b = GameState::initial();
        assert_eq!(state_hash(&a), state_hash(&b));
    }

    #[test]
    fn different_player_different_hash() {
        let mut a = GameState::initial();
        let mut b = GameState::initial();
        b.current_player = Player::Two;
        assert_ne!(state_hash(&a), state_hash(&b));
        let _ = &mut a;
    }

    #[test]
    fn different_board_different_hash() {
        let mut a = GameState::initial();
        let mut b = GameState::initial();
        b.board[0] = 4;
        b.board[1] = 6;
        assert_ne!(state_hash(&a), state_hash(&b));
        let _ = &mut a;
    }

    #[test]
    fn different_solidarity_different_hash() {
        let mut a = GameState::initial();
        let mut b = GameState::initial();
        b.solidarity_mode = true;
        b.solidarity_beneficiary = Some(Player::One);
        assert_ne!(state_hash(&a), state_hash(&b));
        let _ = &mut a;
    }
}
