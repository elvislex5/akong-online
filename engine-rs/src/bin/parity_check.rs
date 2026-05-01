//! Parity check CLI.
//!
//! Reads JSONL from stdin. Each line is one trace:
//!   { "moves": [pit,...], "final": { board, scores, currentPlayer, status, winner, solidarityMode, solidarityBeneficiary } }
//!
//! Starts from the canonical initial Songo (Mgpwem) state and replays each
//! move sequentially through the Rust engine, comparing the resulting state
//! to the TS-produced `final`. Exits 0 iff every trace matches.

use akong_engine::{execute_move, is_valid_move, GameState, GameStatus, Player, WinState};
use serde::Deserialize;
use std::io::{self, BufRead, Write};

#[derive(Deserialize, Debug)]
struct TraceFinal {
    board: [u8; 14],
    scores: [u8; 2],
    #[serde(rename = "currentPlayer")]
    current_player: u8,
    status: String,
    winner: Option<u8>,
    #[serde(rename = "solidarityMode")]
    solidarity_mode: bool,
    #[serde(rename = "solidarityBeneficiary")]
    solidarity_beneficiary: Option<u8>,
}

#[derive(Deserialize, Debug)]
struct Trace {
    moves: Vec<u8>,
    #[serde(rename = "final")]
    final_state: TraceFinal,
}

fn player_code(p: Player) -> u8 {
    match p {
        Player::One => 0,
        Player::Two => 1,
    }
}

/// Encodes TS `Player | 'Draw' | null` into a single Option<u8>:
///   null → None, P1 → Some(0), P2 → Some(1), Draw → Some(2).
fn winner_code(w: Option<WinState>) -> Option<u8> {
    match w {
        None => None,
        Some(WinState::Player(Player::One)) => Some(0),
        Some(WinState::Player(Player::Two)) => Some(1),
        Some(WinState::Draw) => Some(2),
    }
}

fn run_trace(trace: &Trace) -> Result<(), String> {
    let mut state = GameState::initial();
    for (i, &pit) in trace.moves.iter().enumerate() {
        if let Err(e) = is_valid_move(&state, pit as usize) {
            return Err(format!("invalid move at ply {i}: pit={pit} reason={e:?}"));
        }
        let (next, _) = execute_move(&state, pit as usize);
        state = next;
    }

    let exp = &trace.final_state;
    if state.board != exp.board {
        return Err(format!("board: rust={:?} ts={:?}", state.board, exp.board));
    }
    if state.scores != exp.scores {
        return Err(format!("scores: rust={:?} ts={:?}", state.scores, exp.scores));
    }
    let rcp = player_code(state.current_player);
    if rcp != exp.current_player {
        return Err(format!("currentPlayer: rust={} ts={}", rcp, exp.current_player));
    }
    let rstatus = match state.status {
        GameStatus::Playing => "Playing",
        GameStatus::Finished => "Finished",
    };
    if rstatus != exp.status {
        return Err(format!("status: rust={} ts={}", rstatus, exp.status));
    }
    let rw = winner_code(state.winner);
    if rw != exp.winner {
        return Err(format!("winner: rust={:?} ts={:?}", rw, exp.winner));
    }
    if state.solidarity_mode != exp.solidarity_mode {
        return Err(format!(
            "solidarityMode: rust={} ts={}",
            state.solidarity_mode, exp.solidarity_mode
        ));
    }
    let rb = state.solidarity_beneficiary.map(player_code);
    if rb != exp.solidarity_beneficiary {
        return Err(format!(
            "solidarityBeneficiary: rust={:?} ts={:?}",
            rb, exp.solidarity_beneficiary
        ));
    }
    Ok(())
}

fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout = stdout.lock();
    let mut total = 0usize;
    let mut ok = 0usize;
    let mut errs = 0usize;
    let mut first_err: Option<String> = None;

    for line in stdin.lock().lines() {
        let line = line?;
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let trace: Trace = match serde_json::from_str(line) {
            Ok(t) => t,
            Err(e) => {
                writeln!(stdout, "parse error: {e}")?;
                std::process::exit(2);
            }
        };
        total += 1;
        match run_trace(&trace) {
            Ok(()) => ok += 1,
            Err(e) => {
                errs += 1;
                if first_err.is_none() {
                    first_err = Some(format!(
                        "trace #{total} ({} plies): {e}",
                        trace.moves.len()
                    ));
                }
            }
        }
    }
    writeln!(stdout, "traces: {total}, ok: {ok}, mismatches: {errs}")?;
    if let Some(e) = first_err {
        writeln!(stdout, "first mismatch: {e}")?;
        std::process::exit(1);
    }
    Ok(())
}
