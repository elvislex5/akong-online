//! CLI: dump EGTB layer(s) as JSONL training samples for neural network distillation.
//!
//! Usage:
//!   cargo run --release --bin egtb_dump_samples -- <n_max> <out_path.jsonl>
//!
//! For each non-terminal position in layers 1..=n_max (layer 0 is a trivial
//! terminal, skipped), emits one line of JSON:
//!
//!   {
//!     "board": [b0..b13],         // u8 per pit, absolute coordinates
//!     "scores": [s0, s1],         // absolute
//!     "cp": 0|1,                  // current player
//!     "sm": bool, "sb": 0|1|null, // solidarity state
//!     "value": -1 | 0 | +1,       // WDL from current player's perspective
//!     "wdl_class": 0|1|2,         // 0=Win, 1=Draw, 2=Loss (matches cross-entropy classes)
//!     "policy": [p0..p6],         // soft policy target: uniform over moves whose
//!                                 // child preserves the optimal WDL. Sums to 1.
//!     "valid": [m0..mk]           // absolute pit indices of legal moves (for sanity)
//!   }
//!
//! Positions with no legal moves (pure stalemate) are skipped — they don't
//! produce useful policy targets.

use akong_engine::egtb::rank::{position_count, unrank_position, Binomials};
use akong_engine::{
    execute_move, valid_moves, EgtbSolver, GameState, Player, Wdl, WinState,
};
use std::io::{BufWriter, Write};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let n_max: u8 = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(4);
    let out_path = args
        .get(2)
        .cloned()
        .unwrap_or_else(|| format!("egtb-samples-n{n_max}.jsonl"));

    eprintln!("Solving EGTB up to N={n_max} …");
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(n_max);
    eprintln!("EGTB solved. Dumping samples to {out_path}");

    let file = std::fs::File::create(&out_path)?;
    let mut w = BufWriter::new(file);
    let bin = Binomials::new();

    let mut total = 0u64;
    let mut skipped_no_moves = 0u64;
    let mut skipped_already_terminal = 0u64;

    // Skip layer 0: pure terminal, no moves. Start at N=1.
    for n in 1u8..=n_max {
        let count = position_count(n, &bin);
        for idx in 0..count {
            let state = unrank_position(n, idx, &bin);

            // Skip positions that are already scoring-terminal (score ≥ winning)
            if state.scores[0] >= state.winning_score()
                || state.scores[1] >= state.winning_score()
            {
                skipped_already_terminal += 1;
                continue;
            }

            let vm = valid_moves(&state);
            if vm.is_empty() {
                skipped_no_moves += 1;
                continue;
            }

            let parent_wdl = solver
                .query(&state)
                .expect("position should be in solved table");
            let value = match parent_wdl {
                Wdl::Win => 1i8,
                Wdl::Draw => 0,
                Wdl::Loss => -1,
            };
            let wdl_class = match parent_wdl {
                Wdl::Win => 0u8,
                Wdl::Draw => 1,
                Wdl::Loss => 2,
            };

            // Compute policy target: distribute mass uniformly over moves whose
            // child WDL (inverted to mover's perspective) equals parent_wdl.
            let mover = state.current_player;
            let mover_start = mover.my_start();
            let mut optimal_pits: Vec<u8> = Vec::new();
            for &m in vm.iter() {
                let (child, _) = execute_move(&state, m as usize);
                let child_for_mover = if child.is_terminal() {
                    terminal_wdl_for(&child, mover)
                } else {
                    invert(
                        solver
                            .query(&child)
                            .expect("child should be solved or terminal"),
                    )
                };
                if child_for_mover == parent_wdl {
                    optimal_pits.push(m);
                }
            }
            if optimal_pits.is_empty() {
                // Defensive: shouldn't happen for a correctly classified position,
                // but could occur on pathological states. Fall back to uniform.
                optimal_pits.extend(vm.iter().copied());
            }

            let mut policy = [0f32; 7];
            let w_each = 1.0 / optimal_pits.len() as f32;
            for p in &optimal_pits {
                let rel = (*p as usize).saturating_sub(mover_start);
                if rel < 7 {
                    policy[rel] += w_each;
                }
            }

            write_sample(
                &mut w,
                &state,
                value,
                wdl_class,
                &policy,
                vm.iter().copied().collect::<Vec<u8>>().as_slice(),
            )?;
            total += 1;
        }
        eprintln!(
            "  N={n}: dumped {} rows so far (skipped {} no-moves, {} already-terminal)",
            total, skipped_no_moves, skipped_already_terminal
        );
    }

    w.flush()?;
    eprintln!("\nDONE. Total samples written: {total}");
    eprintln!(
        "  skipped (no valid moves)    : {skipped_no_moves}\n  \
         skipped (score already wins): {skipped_already_terminal}"
    );
    Ok(())
}

fn write_sample<W: Write>(
    w: &mut W,
    state: &GameState,
    value: i8,
    wdl_class: u8,
    policy: &[f32; 7],
    valid: &[u8],
) -> std::io::Result<()> {
    // Hand-roll JSON — predictable, fast, no serde struct overhead.
    write!(w, "{{\"board\":[")?;
    for (i, b) in state.board.iter().enumerate() {
        if i > 0 {
            write!(w, ",")?;
        }
        write!(w, "{}", b)?;
    }
    write!(
        w,
        "],\"scores\":[{},{}],\"cp\":{},\"sm\":{},\"sb\":",
        state.scores[0],
        state.scores[1],
        match state.current_player {
            Player::One => 0,
            Player::Two => 1,
        },
        state.solidarity_mode
    )?;
    match state.solidarity_beneficiary {
        Some(Player::One) => write!(w, "0")?,
        Some(Player::Two) => write!(w, "1")?,
        None => write!(w, "null")?,
    }
    write!(
        w,
        ",\"value\":{},\"wdl_class\":{},\"policy\":[",
        value, wdl_class
    )?;
    for (i, p) in policy.iter().enumerate() {
        if i > 0 {
            write!(w, ",")?;
        }
        write!(w, "{:.6}", p)?;
    }
    write!(w, "],\"valid\":[")?;
    for (i, v) in valid.iter().enumerate() {
        if i > 0 {
            write!(w, ",")?;
        }
        write!(w, "{}", v)?;
    }
    writeln!(w, "]}}")?;
    Ok(())
}

fn terminal_wdl_for(state: &GameState, perspective: Player) -> Wdl {
    match state.winner {
        Some(WinState::Player(p)) if p == perspective => Wdl::Win,
        Some(WinState::Player(_)) => Wdl::Loss,
        Some(WinState::Draw) => Wdl::Draw,
        None => Wdl::Draw,
    }
}

fn invert(w: Wdl) -> Wdl {
    match w {
        Wdl::Win => Wdl::Loss,
        Wdl::Loss => Wdl::Win,
        Wdl::Draw => Wdl::Draw,
    }
}
