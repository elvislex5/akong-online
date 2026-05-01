//! Depth-limited negamax search with α-β pruning.
//!
//! Used by the opening-book annotator (M5.5) to assign (best_move, eval)
//! labels to each entry. The search is intentionally Rust-only and free of
//! NN dependencies so it can run headlessly as part of the book pipeline.
//!
//! Evaluation is in **centipoints**: 1000 ≈ "certain win", -1000 ≈ "certain
//! loss". Intermediate values are heuristic combinations of score differential
//! + light tactical signals (greniers, vulnerable opponent pits).

pub mod eval;
pub mod negamax;

pub use eval::{leaf_eval, EVAL_MAX, EVAL_WIN};
pub use negamax::{search_best, SearchResult};
