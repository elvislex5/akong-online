//! akong-engine — bit-exact Rust port of `services/songoLogic.ts` (Mgpwem).
//!
//! The canonical source of truth for rules is the TypeScript file; this crate
//! exists to give EGTB retrograde analysis and massive self-play a 50-100x
//! speedup over JS while preserving exact game semantics.

pub mod state;
pub mod rules;
pub mod egtb;
pub mod book;
pub mod search;

pub use state::{
    GameState, GameStatus, Player, Variant, WinState, pit_owner,
    INITIAL_SEEDS, PITS_PER_PLAYER, TOTAL_PITS, WINNING_SCORE_CAMEROON, WINNING_SCORE_GABON,
};
pub use rules::{
    MoveOutcome, MoveRejection, execute_move, is_valid_move, valid_moves,
};
pub use egtb::{Binomials, EgtbSolver, Wdl, board_count, position_count};
pub use book::{
    BookEntry, BookIoError, StateHash,
    build_book_shape, read_book, state_hash, write_book,
};
