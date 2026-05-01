//! Bit-exact port of `services/songoLogic.ts` — Mgpwem rules.
//!
//! The TypeScript file is the canonical reference. Any divergence here is a bug.
//! This module intentionally mirrors the TS control flow (including redundant
//! checks) to simplify parity verification via JSON round-trip tests.

use crate::state::{
    GameState, GameStatus, Player, TOTAL_PITS, WinState, pit_owner,
};

/// Outcome of a successful move. Mirrors the `state.message` discriminants
/// from `songoLogic.ts` at the semantic level; the explain layer can
/// reconstruct French text from this structure.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MoveOutcome {
    pub captured: u8,
    pub was_auto_capture: bool,
    pub was_desperate: bool,
    pub chain_blocked_by_yini: bool,
    pub capture_protected: bool,
    pub solidarity_failed: bool,
}

impl MoveOutcome {
    const fn default_outcome() -> Self {
        Self {
            captured: 0,
            was_auto_capture: false,
            was_desperate: false,
            chain_blocked_by_yini: false,
            capture_protected: false,
            solidarity_failed: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MoveRejection {
    NotYourPit,
    EmptyPit,
    LastPitSingleSeed,
    SolidarityRequired,
}

/// TS parity: mirrors `isValidMove` in `songoLogic.ts`.
pub fn is_valid_move(state: &GameState, pit_index: usize) -> Result<(), MoveRejection> {
    if pit_index >= TOTAL_PITS {
        return Err(MoveRejection::NotYourPit);
    }
    let owner = pit_owner(pit_index);
    if owner != state.current_player {
        return Err(MoveRejection::NotYourPit);
    }
    let seeds = state.board[pit_index];
    if seeds == 0 {
        return Err(MoveRejection::EmptyPit);
    }

    let current = state.current_player;
    let opp_start = current.opp_start();
    let opp_seeds_now: u16 = (0..7).map(|i| state.board[opp_start + i] as u16).sum();

    let enforce_feeding = (state.solidarity_mode && state.solidarity_beneficiary.is_some())
        || opp_seeds_now == 0;

    if enforce_feeding {
        // Target indices to "feed": opponent side, unless the explicit
        // solidarity beneficiary is set (then feed that player's side — which
        // may even be the current player in edge-case setups).
        let target_start = if let Some(beneficiary) = state.solidarity_beneficiary {
            if state.solidarity_mode {
                beneficiary.my_start()
            } else {
                opp_start
            }
        } else {
            opp_start
        };

        let move_feeds = move_reaches_target(pit_index, seeds, target_start);

        if !move_feeds {
            // Check if any OTHER move could feed. If yes → current move is invalid.
            let my_start = current.my_start();
            let mut exists_feeding_move = false;
            for i in 0..7 {
                let idx = my_start + i;
                let s = state.board[idx];
                if s > 0 && move_reaches_target(idx, s, target_start) {
                    exists_feeding_move = true;
                    break;
                }
            }
            if exists_feeding_move {
                return Err(MoveRejection::SolidarityRequired);
            }
            // Else: allowed (starvation unavoidable)
        }
    }

    // Desperate last-pit exception
    let is_last_pit = pit_index == current.last_pit();
    if is_last_pit && seeds == 1 {
        let my_start = current.my_start();
        let total: u16 = (0..7).map(|i| state.board[my_start + i] as u16).sum();
        if total == 1 {
            return Ok(()); // Desperate auto-capture allowed
        } else {
            return Err(MoveRejection::LastPitSingleSeed);
        }
    }

    Ok(())
}

/// Returns `true` iff seeding from `pit_index` with `seeds` seeds would
/// reach at least one pit in `target_start..target_start+7`.
#[inline]
fn move_reaches_target(pit_index: usize, seeds: u8, target_start: usize) -> bool {
    if seeds >= 14 {
        return true; // 14+ always touches every pit
    }
    for i in 1..=(seeds as usize) {
        let target = (pit_index + i) % TOTAL_PITS;
        if target >= target_start && target < target_start + 7 {
            return true;
        }
    }
    false
}

/// Returns the list of valid pit indices for the current player.
pub fn valid_moves(state: &GameState) -> arrayvec::ArrayVec<u8, 7> {
    let mut out = arrayvec::ArrayVec::<u8, 7>::new();
    let my_start = state.current_player.my_start();
    for i in 0..7 {
        let idx = my_start + i;
        if is_valid_move(state, idx).is_ok() {
            out.push(idx as u8);
        }
    }
    out
}

/// Core move execution. TS parity: mirrors `executeMove` in `songoLogic.ts`.
/// `pit_index` is assumed to satisfy `is_valid_move`; caller should check.
///
/// Returns the new state AND a structured outcome (captured seeds, flags).
/// The input state is NOT mutated (TS executeMove also returns a clone).
pub fn execute_move(current_state: &GameState, pit_index: usize) -> (GameState, MoveOutcome) {
    let mut state = current_state.clone();
    let mut outcome = MoveOutcome::default_outcome();

    let current = state.current_player;
    let my_start = current.my_start();
    let opp_start = current.opp_start();
    let is_last_pit = pit_index == current.last_pit();

    // Total seeds BEFORE pickup (for desperate check)
    let total_seeds_on_side: u16 = (0..7).map(|i| state.board[my_start + i] as u16).sum();

    let mut seeds = state.board[pit_index];
    state.board[pit_index] = 0;

    // --- Desperate auto-capture: only seed on my side, in my last pit ---
    if total_seeds_on_side == 1 && is_last_pit {
        state.scores[current.score_slot()] += 1;
        state.solidarity_mode = true;
        state.solidarity_beneficiary = Some(current);
        state.current_player = current.opponent();
        outcome.was_desperate = true;
        check_win_condition(&mut state, false);
        return (state, outcome);
    }

    // --- Distribution ---
    let mut current_idx = pit_index;
    let initial_seed_count = seeds; // retained for capture gating

    if seeds >= 14 {
        let remaining_after_13 = seeds - 13;
        let is_auto_capture = remaining_after_13 % 7 == 1;

        // First 13 seeds: one per pit, skipping origin naturally (13 = TOTAL_PITS-1)
        for _ in 0..13 {
            current_idx = (current_idx + 1) % TOTAL_PITS;
            state.board[current_idx] += 1;
        }
        seeds -= 13;

        if is_auto_capture {
            // Distribute (seeds - 1) into opponent side cycling the 7 opp pits,
            // auto-capture the final seed.
            let seeds_to_distribute = seeds - 1;
            let mut op_offset = 0usize;
            for _ in 0..seeds_to_distribute {
                let target = opp_start + op_offset;
                state.board[target] += 1;
                current_idx = target;
                op_offset = (op_offset + 1) % 7;
            }
            state.scores[current.score_slot()] += 1;
            outcome.was_auto_capture = true;
            // Fall through to end-of-turn checks (NO capture phase).
        } else {
            // Distribute remaining into opponent side
            let mut op_offset = 0usize;
            while seeds > 0 {
                let target = opp_start + op_offset;
                state.board[target] += 1;
                current_idx = target;
                op_offset = (op_offset + 1) % 7;
                seeds -= 1;
            }
        }
    } else {
        // Simple distribution wrapping all pits
        while seeds > 0 {
            current_idx = (current_idx + 1) % TOTAL_PITS;
            state.board[current_idx] += 1;
            seeds -= 1;
        }
    }

    // --- Capture ---
    // Skip capture entirely if we auto-captured.
    let was_auto_capture_flag =
        initial_seed_count >= 14 && ((initial_seed_count - 13) % 7 == 1);

    if !was_auto_capture_flag {
        let owner_of_last = pit_owner(current_idx);
        if owner_of_last != current
            && state.board[current_idx] >= 2
            && state.board[current_idx] <= 4
        {
            // Opponent's start pit is protected from single captures
            let is_opp_start = current_idx == opp_start;
            if !is_opp_start {
                // Build capture queue by walking backward while on opp side and in 2..=4
                let mut capture_queue: arrayvec::ArrayVec<usize, 7> = arrayvec::ArrayVec::new();
                let mut check_idx = current_idx;
                let mut chain_blocked_by_yini = false;
                loop {
                    if pit_owner(check_idx) == current {
                        break;
                    }
                    let count = state.board[check_idx];
                    if (2..=4).contains(&count) {
                        capture_queue.push(check_idx);
                    } else {
                        if pit_owner(check_idx) != current && count == 5 {
                            chain_blocked_by_yini = true;
                        }
                        break;
                    }
                    check_idx = (check_idx + TOTAL_PITS - 1) % TOTAL_PITS;
                }

                // Grand-slam protection: would capture all opp pits that had seeds
                let mut opp_pits_with_seeds = 0u8;
                for i in 0..7 {
                    if state.board[opp_start + i] > 0 {
                        opp_pits_with_seeds += 1;
                    }
                }
                let capturing_all_7 = capture_queue.len() == 7;
                let is_protected = opp_pits_with_seeds == 7 && capturing_all_7;

                if !is_protected && !capture_queue.is_empty() {
                    let mut captured: u16 = 0;
                    for &idx in &capture_queue {
                        captured += state.board[idx] as u16;
                        state.board[idx] = 0;
                    }
                    state.scores[current.score_slot()] += captured as u8;
                    outcome.captured = captured as u8;
                    outcome.chain_blocked_by_yini = chain_blocked_by_yini;
                } else if is_protected {
                    outcome.capture_protected = true;
                }
            }
        }
    }

    // --- End turn / solidarity resolution ---
    let opp = current.opponent();
    let opp_side = opp.my_start();
    let opp_seeds_before_move: u16 =
        (0..7).map(|i| current_state.board[opp_side + i] as u16).sum();

    if state.solidarity_mode
        || (opp_seeds_before_move == 0 && current_state.board[pit_index] > 0)
    {
        let fed = (0..7).any(|i| state.board[opp_side + i] > 0);
        if fed {
            state.solidarity_mode = false;
            state.solidarity_beneficiary = None;
        } else {
            // Opp still starving → collect my rest, end game
            let mut remaining: u16 = 0;
            for i in 0..7 {
                remaining += state.board[my_start + i] as u16;
                state.board[my_start + i] = 0;
            }
            state.scores[current.score_slot()] += remaining as u8;
            outcome.solidarity_failed = true;
            check_win_condition(&mut state, true);
            return (state, outcome);
        }
    }

    // --- Pre-switch turn checks ---
    let next = current.opponent();
    let next_side = next.my_start();
    let next_seeds: u16 = (0..7).map(|i| state.board[next_side + i] as u16).sum();

    if next_seeds == 0 {
        // Opp starved — current player sweeps own side, end game
        let mut remaining: u16 = 0;
        for i in 0..7 {
            remaining += state.board[my_start + i] as u16;
            state.board[my_start + i] = 0;
        }
        state.scores[current.score_slot()] += remaining as u8;
        check_win_condition(&mut state, true);
        return (state, outcome);
    }

    // Stalemate: opponent has seeds but no valid move
    let mut probe = state.clone();
    probe.current_player = next;
    let next_has_moves = (0..7).any(|i| is_valid_move(&probe, next_side + i).is_ok());

    if !next_has_moves {
        resolve_stalemate(&mut state);
        return (state, outcome);
    }

    state.current_player = next;
    check_win_condition(&mut state, false);
    (state, outcome)
}

fn resolve_stalemate(state: &mut GameState) {
    let win_score = state.winning_score();
    for i in 0..TOTAL_PITS {
        if state.board[i] > 0 {
            let owner = pit_owner(i);
            state.scores[owner.score_slot()] += state.board[i];
            state.board[i] = 0;
        }
    }
    state.status = GameStatus::Finished;
    state.winner = Some(determine_winner(&state.scores, win_score));
}

fn check_win_condition(state: &mut GameState, force_end: bool) {
    let win_score = state.winning_score();
    if state.scores[0] >= win_score {
        state.status = GameStatus::Finished;
        state.winner = Some(WinState::Player(Player::One));
        return;
    }
    if state.scores[1] >= win_score {
        state.status = GameStatus::Finished;
        state.winner = Some(WinState::Player(Player::Two));
        return;
    }

    if force_end {
        state.status = GameStatus::Finished;
        state.winner = Some(determine_winner(&state.scores, win_score));
        return;
    }

    let current = state.current_player;
    let my_start = current.my_start();
    let can_play = (0..7).any(|i| is_valid_move(state, my_start + i).is_ok());
    if !can_play {
        for i in 0..TOTAL_PITS {
            if state.board[i] > 0 {
                let owner = pit_owner(i);
                state.scores[owner.score_slot()] += state.board[i];
                state.board[i] = 0;
            }
        }
        state.status = GameStatus::Finished;
        state.winner = Some(determine_winner(&state.scores, win_score));
    }
}

fn determine_winner(scores: &[u8; 2], _win_score: u8) -> WinState {
    if scores[0] > scores[1] {
        WinState::Player(Player::One)
    } else if scores[1] > scores[0] {
        WinState::Player(Player::Two)
    } else {
        WinState::Draw
    }
}
