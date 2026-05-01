//! BFS enumerator that discovers all reachable positions within K plies
//! from the initial state and records their move structure.
//!
//! The output is a map from state hash → BookEntry. Transpositions (same
//! state reached via different move orders) collapse to the same key.

use std::collections::{HashMap, VecDeque};

use crate::book::hash::{state_hash, StateHash};
use crate::rules::{execute_move, valid_moves};
use crate::state::{GameState, Player};

/// One entry in the book. The `best_move` field is filled by a later
/// "strong oracle" pass (NN-MCTS, EGTB, or deep minimax); at BFS time it is
/// left as `None` so clients can distinguish "shape only" from "annotated".
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookEntry {
    /// Depth (ply from root) at which this state was first reached.
    pub depth: u8,
    /// Total seeds in play at this state (derivable but cached for fast filtering).
    pub seeds_in_play: u8,
    /// Whose turn: 0 = Player One, 1 = Player Two.
    pub current_player: u8,
    /// Absolute pit indices of legal moves.
    pub valid_moves: Vec<u8>,
    /// For each legal move, the hash of the resulting child state.
    /// Parallel to `valid_moves` (same length, same order).
    pub child_hashes: Vec<StateHash>,
    /// Oracle-assigned best move (absolute pit index), if annotated.
    pub best_move: Option<u8>,
    /// Oracle-assigned value in [-1000, 1000] (fixed-point, ÷1000 = [-1, 1]),
    /// if annotated.
    pub eval_centi: Option<i16>,
}

impl BookEntry {
    pub const fn is_annotated(&self) -> bool {
        self.best_move.is_some()
    }
}

/// Build the book shape by BFS.
///
/// Returns:
///   - `entries`: map hash → BookEntry for every state reached with depth ≤ max_depth
///   - `root_hash`: hash of the initial state (entry point)
///
/// Note: positions with depth == max_depth are still recorded (with their
/// valid moves and child hashes filled in), but their children beyond the
/// frontier are NOT enumerated. Use those as stitch points for a deeper
/// pass (e.g. NN-MCTS to depth 30) later.
pub fn build_book_shape(max_depth: u8) -> (HashMap<StateHash, BookEntry>, StateHash) {
    let root = GameState::initial();
    let root_hash = state_hash(&root);
    let mut entries: HashMap<StateHash, BookEntry> = HashMap::new();
    let mut queue: VecDeque<(StateHash, GameState, u8)> = VecDeque::new();
    queue.push_back((root_hash, root, 0));

    while let Some((h, state, depth)) = queue.pop_front() {
        if entries.contains_key(&h) {
            // Transposition — already visited
            continue;
        }

        let vm = valid_moves(&state);
        let mut child_hashes: Vec<StateHash> = Vec::with_capacity(vm.len());
        let mut move_list: Vec<u8> = Vec::with_capacity(vm.len());

        for &m in vm.iter() {
            let (child, _) = execute_move(&state, m as usize);
            let ch = state_hash(&child);
            child_hashes.push(ch);
            move_list.push(m);

            // Enqueue child if not yet visited and we still have budget
            if depth + 1 <= max_depth && !entries.contains_key(&ch) {
                queue.push_back((ch, child, depth + 1));
            }
        }

        let seeds_in_play: u8 = state.board.iter().map(|&b| b as u16).sum::<u16>() as u8;
        let cp = match state.current_player { Player::One => 0u8, Player::Two => 1 };

        entries.insert(h, BookEntry {
            depth,
            seeds_in_play,
            current_player: cp,
            valid_moves: move_list,
            child_hashes,
            best_move: None,
            eval_centi: None,
        });
    }

    (entries, root_hash)
}

/// Statistics over the built book — handy for CLI output and tests.
pub fn stats(entries: &HashMap<StateHash, BookEntry>) -> BookStats {
    let mut by_depth: Vec<u64> = Vec::new();
    let mut total_branching: u64 = 0;
    for e in entries.values() {
        let d = e.depth as usize;
        if by_depth.len() <= d {
            by_depth.resize(d + 1, 0);
        }
        by_depth[d] += 1;
        total_branching += e.valid_moves.len() as u64;
    }
    let avg_branching = if entries.is_empty() {
        0.0
    } else {
        total_branching as f64 / entries.len() as f64
    };
    BookStats {
        total_entries: entries.len() as u64,
        positions_by_depth: by_depth,
        avg_branching_factor: avg_branching,
    }
}

#[derive(Debug, Clone)]
pub struct BookStats {
    pub total_entries: u64,
    pub positions_by_depth: Vec<u64>,
    pub avg_branching_factor: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_depth_0_returns_only_root() {
        let (entries, root) = build_book_shape(0);
        assert_eq!(entries.len(), 1);
        assert!(entries.contains_key(&root));
        assert_eq!(entries[&root].depth, 0);
        // Initial position: 7 valid moves for P1
        assert_eq!(entries[&root].valid_moves.len(), 7);
        assert_eq!(entries[&root].child_hashes.len(), 7);
    }

    #[test]
    fn build_depth_1_has_root_plus_children() {
        let (entries, root) = build_book_shape(1);
        // Root plus up to 7 children (may collapse via mirror-symmetric transpositions —
        // Mgpwem does not have such symmetry in general, so expect exactly 8).
        assert!(entries.len() >= 2);
        assert!(entries.contains_key(&root));
        let s = stats(&entries);
        assert_eq!(s.positions_by_depth[0], 1);
        assert!(s.positions_by_depth[1] >= 1);
    }

    #[test]
    fn build_depth_2_larger_than_depth_1() {
        let (e1, _) = build_book_shape(1);
        let (e2, _) = build_book_shape(2);
        assert!(e2.len() > e1.len());
    }

    #[test]
    fn every_entry_has_consistent_child_hashes() {
        let (entries, _) = build_book_shape(2);
        for (_h, entry) in entries.iter() {
            assert_eq!(entry.valid_moves.len(), entry.child_hashes.len());
            // All children (if within the enumerated depth) must be present
            if entry.depth < 2 {
                for &ch in &entry.child_hashes {
                    assert!(entries.contains_key(&ch),
                            "child hash {ch:#x} not in book at depth {}", entry.depth + 1);
                }
            }
        }
    }
}
