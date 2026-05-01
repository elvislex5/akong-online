//! Retrograde analysis solver for Songo EGTB.
//!
//! Layers are indexed by `N = seeds_in_play`. Captures strictly decrease N,
//! non-capture moves preserve N. We process N from 0 upward; within a layer,
//! we fix-point iterate classifying positions as WIN/LOSS until stabilization.
//! Any position that remains unclassified after the fixed point is a DRAW
//! (perfect-play cyclic equilibrium).
//!
//! Storage: **dense u8 array per layer**, indexed by `rank_position`. This
//! replaced the previous HashMap<(u8, u64), Wdl> (roughly 24 B/entry) with
//! a single byte per position, cutting peak memory ~23× and unlocking
//! solving up to N ≈ 12 on a 16-GB workstation.
//!
//! WDL codes on disk & in memory:
//!   0 = unset (pending in fixed-point, or unreachable)
//!   1 = Win  2 = Loss  3 = Draw
//!
//! Perspective convention: WDL is always expressed from the current player's
//! point of view at that position.

use crate::egtb::rank::{
    Binomials, Index, position_count, rank_position, unrank_position,
};
use crate::rules::{execute_move, valid_moves};
use crate::state::{GameState, Player, TOTAL_PITS, WinState};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Wdl {
    Win,
    Loss,
    Draw,
}

impl Wdl {
    #[inline]
    pub fn invert(self) -> Self {
        match self {
            Wdl::Win => Wdl::Loss,
            Wdl::Loss => Wdl::Win,
            Wdl::Draw => Wdl::Draw,
        }
    }
}

pub const WDL_UNSET: u8 = 0;
pub const WDL_WIN: u8 = 1;
pub const WDL_LOSS: u8 = 2;
pub const WDL_DRAW: u8 = 3;

#[inline]
pub fn encode_wdl(w: Wdl) -> u8 {
    match w {
        Wdl::Win => WDL_WIN,
        Wdl::Loss => WDL_LOSS,
        Wdl::Draw => WDL_DRAW,
    }
}

#[inline]
pub fn decode_wdl(code: u8) -> Option<Wdl> {
    match code {
        WDL_WIN => Some(Wdl::Win),
        WDL_LOSS => Some(Wdl::Loss),
        WDL_DRAW => Some(Wdl::Draw),
        _ => None,
    }
}

/// Legacy HashMap alias kept for backward compatibility with `LayerData::from_table`
/// and anywhere old code iterates (N, idx) → Wdl. The solver itself no longer
/// uses this representation internally.
pub type EgtbTable = std::collections::HashMap<(u8, Index), Wdl>;

pub struct EgtbSolver {
    pub bin: Binomials,
    /// `layers[n][idx]` = WDL code byte. All layers up to `max_solved` are
    /// fully populated; layers not yet allocated have `Vec::len() == 0`.
    pub layers: Vec<Vec<u8>>,
    /// Max N the solver has fully processed.
    pub max_solved: Option<u8>,
}

impl Default for EgtbSolver {
    fn default() -> Self {
        Self::new()
    }
}

impl EgtbSolver {
    pub fn new() -> Self {
        Self {
            bin: Binomials::new(),
            layers: Vec::new(),
            max_solved: None,
        }
    }

    /// Solve layers N = 0..=n_max sequentially. Idempotent — layers already
    /// solved are skipped. Allocates storage on demand.
    pub fn solve_up_to(&mut self, n_max: u8) {
        self.ensure_layers_up_to(n_max);
        for n in 0..=n_max {
            let already = self.max_solved.map_or(false, |m| n <= m);
            if already {
                continue;
            }
            self.solve_layer(n);
            self.max_solved = Some(n);
        }
    }

    /// Allocate dense arrays for every layer up to (and including) `n_max`.
    fn ensure_layers_up_to(&mut self, n_max: u8) {
        while self.layers.len() <= n_max as usize {
            let n = self.layers.len() as u8;
            let count = position_count(n, &self.bin) as usize;
            self.layers.push(vec![WDL_UNSET; count]);
        }
    }

    /// Query WDL for a state (from `state.current_player`'s perspective).
    /// Returns `None` if the layer is not loaded or the position is unset.
    pub fn query(&self, state: &GameState) -> Option<Wdl> {
        if state.is_terminal() {
            return Some(terminal_wdl(state, state.current_player));
        }
        let n: usize = state.board.iter().map(|&b| b as usize).sum();
        let layer = self.layers.get(n)?;
        let idx = rank_position(state, &self.bin) as usize;
        layer.get(idx).and_then(|&c| decode_wdl(c))
    }

    /// Borrow a whole layer's WDL byte payload. Primarily useful for
    /// serialisation (`LayerData::from_solver`) and statistics.
    pub fn layer_payload(&self, n: u8) -> &[u8] {
        &self.layers[n as usize]
    }

    /// Count Win / Loss / Draw occurrences in a solved layer.
    pub fn layer_stats(&self, n: u8) -> (u64, u64, u64) {
        let mut w = 0u64;
        let mut l = 0u64;
        let mut d = 0u64;
        for &c in self.layers[n as usize].iter() {
            match c {
                WDL_WIN => w += 1,
                WDL_LOSS => l += 1,
                WDL_DRAW => d += 1,
                _ => {}
            }
        }
        (w, l, d)
    }

    /// Total in-memory bytes held by all layer payloads.
    pub fn memory_bytes(&self) -> usize {
        self.layers.iter().map(|l| l.len()).sum()
    }

    /// Total entries (= sum of layer sizes). Matches the old
    /// `solver.table.len()` for back-compat in tests / telemetry.
    pub fn total_entries(&self) -> usize {
        self.memory_bytes()
    }

    // ─── Internals ────────────────────────────────────────────────────────

    fn solve_layer(&mut self, n: u8) {
        let total = position_count(n, &self.bin);
        let mut pending: Vec<(Index, GameState)> = Vec::new();

        // First pass: handle positions resolvable without looking at children
        for idx in 0..total {
            let state = unrank_position(n, idx, &self.bin);

            if let Some(w) = classify_by_score(&state) {
                self.layers[n as usize][idx as usize] = encode_wdl(w);
                continue;
            }

            let vm = valid_moves(&state);
            if vm.is_empty() {
                let wdl = classify_stalemate(&state);
                self.layers[n as usize][idx as usize] = encode_wdl(wdl);
                continue;
            }

            pending.push((idx, state));
        }

        // Fixed-point within the layer
        loop {
            let mut changed = false;
            let mut carry: Vec<(Index, GameState)> = Vec::with_capacity(pending.len());

            for (idx, state) in pending.drain(..) {
                match self.try_classify(&state) {
                    Some(w) => {
                        self.layers[n as usize][idx as usize] = encode_wdl(w);
                        changed = true;
                    }
                    None => {
                        carry.push((idx, state));
                    }
                }
            }

            pending = carry;
            if !changed {
                break;
            }
        }

        // Remaining unsolved = cyclic equilibria = Draw
        for (idx, _) in pending {
            self.layers[n as usize][idx as usize] = encode_wdl(Wdl::Draw);
        }
    }

    fn try_classify(&self, state: &GameState) -> Option<Wdl> {
        let mover = state.current_player;
        let vm = valid_moves(state);
        let mut seen_winning = false;
        let mut seen_drawing = false;
        let mut seen_unknown = false;
        let mut all_losing = true;

        for m in vm {
            let (child, _) = execute_move(state, m as usize);
            let wdl_for_mover: Option<Wdl> = if child.is_terminal() {
                Some(terminal_wdl(&child, mover))
            } else {
                let child_n: usize = child.board.iter().map(|&b| b as usize).sum();
                let child_idx = rank_position(&child, &self.bin) as usize;
                self.layers
                    .get(child_n)
                    .and_then(|layer| layer.get(child_idx))
                    .and_then(|&c| decode_wdl(c))
                    .map(|w| w.invert())
            };
            match wdl_for_mover {
                Some(Wdl::Win) => {
                    seen_winning = true;
                }
                Some(Wdl::Draw) => {
                    seen_drawing = true;
                    all_losing = false;
                }
                Some(Wdl::Loss) => {
                    /* this move is bad for the mover */
                }
                None => {
                    seen_unknown = true;
                    all_losing = false;
                }
            }
        }

        if seen_winning {
            Some(Wdl::Win)
        } else if seen_unknown {
            None
        } else if all_losing {
            Some(Wdl::Loss)
        } else {
            let _ = seen_drawing;
            Some(Wdl::Draw)
        }
    }
}

/// Terminal state → WDL from `perspective` player's viewpoint.
pub fn terminal_wdl(state: &GameState, perspective: Player) -> Wdl {
    match state.winner {
        Some(WinState::Player(p)) if p == perspective => Wdl::Win,
        Some(WinState::Player(_)) => Wdl::Loss,
        Some(WinState::Draw) => Wdl::Draw,
        None => {
            let s = state.scores;
            if s[0] > s[1] {
                if perspective == Player::One { Wdl::Win } else { Wdl::Loss }
            } else if s[1] > s[0] {
                if perspective == Player::Two { Wdl::Win } else { Wdl::Loss }
            } else {
                Wdl::Draw
            }
        }
    }
}

fn classify_by_score(state: &GameState) -> Option<Wdl> {
    let win = state.winning_score();
    if state.scores[0] >= win {
        return Some(if state.current_player == Player::One { Wdl::Win } else { Wdl::Loss });
    }
    if state.scores[1] >= win {
        return Some(if state.current_player == Player::Two { Wdl::Win } else { Wdl::Loss });
    }
    None
}

/// Classify a no-valid-moves position by sweeping seeds to owners.
fn classify_stalemate(state: &GameState) -> Wdl {
    let win = state.winning_score();
    let mut scores = state.scores;
    for i in 0..TOTAL_PITS {
        if state.board[i] > 0 {
            let slot = if i < 7 { 0 } else { 1 };
            scores[slot] += state.board[i];
        }
    }
    let cp = state.current_player;
    if scores[0] >= win {
        if cp == Player::One { Wdl::Win } else { Wdl::Loss }
    } else if scores[1] >= win {
        if cp == Player::Two { Wdl::Win } else { Wdl::Loss }
    } else if scores[0] > scores[1] {
        if cp == Player::One { Wdl::Win } else { Wdl::Loss }
    } else if scores[1] > scores[0] {
        if cp == Player::Two { Wdl::Win } else { Wdl::Loss }
    } else {
        Wdl::Draw
    }
}
