//! Opening book for Songo (Mgpwem).
//!
//! Enumerates all positions reachable from the initial state within K plies
//! via BFS, records their structure, and (optionally) assigns a "best move"
//! produced by a strong oracle (minimax, NN-MCTS, or EGTB when the endgame
//! layer reaches that depth).
//!
//! The book sits in Oracle layer A alongside the EGTB. For opening positions
//! (N seeds in play ≈ 70), EGTB coverage is impossible in the near term, so
//! the book is the only source of "exact" opening knowledge.

pub mod hash;
pub mod builder;
pub mod storage;

pub use hash::{state_hash, StateHash};
pub use builder::{build_book_shape, BookEntry};
pub use storage::{write_book, read_book, BookIoError};
