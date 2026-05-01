//! CLI: annotate each entry of an opening book (built by `book_build`) with a
//! best_move and eval_centi obtained from a depth-limited negamax search.
//!
//! Usage:
//!   cargo run --release --bin book_annotate -- <in.bin> <out.bin> [--depth 8] [--no-compress]

use akong_engine::book::builder::BookEntry;
use akong_engine::book::hash::StateHash;
use akong_engine::book::storage::{read_book, write_book};
use akong_engine::egtb::rank::{rank_position, unrank_board, Binomials};
use akong_engine::search::{search_best, negamax::squash_to_centi_i16};
use akong_engine::state::{GameState, GameStatus, Player, Variant};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;

/// Reconstruct a canonical-form GameState from a BookEntry.
///
/// BookEntry stores only board-derived features (depth, seeds, cp) — we need
/// scores and solidarity flags too. Since this is the opening book, all
/// positions are non-terminal, non-solidarity, and scores are implicit from
/// seeds-in-play (scores sum = 70 − seeds_in_play). We can't perfectly
/// recover individual s0/s1 without the hash-to-state mapping, so we instead
/// iterate BFS again from the root and reconstruct states by replay.
///
/// For simplicity, the annotator re-runs BFS to rebuild (hash → state), then
/// zips with the loaded book entries.
fn rebuild_hash_to_state(max_depth: u8) -> HashMap<StateHash, GameState> {
    use akong_engine::book::hash::state_hash;
    use akong_engine::rules::{execute_move, valid_moves};
    use std::collections::VecDeque;

    let mut out: HashMap<StateHash, GameState> = HashMap::new();
    let mut queue: VecDeque<(GameState, u8)> = VecDeque::new();
    let root = GameState::initial();
    queue.push_back((root, 0));
    while let Some((state, depth)) = queue.pop_front() {
        let h = state_hash(&state);
        if out.contains_key(&h) {
            continue;
        }
        let next_depth = depth + 1;
        out.insert(h, state.clone());
        if depth >= max_depth {
            continue;
        }
        let vm = valid_moves(&state);
        for &m in vm.iter() {
            let (child, _) = execute_move(&state, m as usize);
            let ch = akong_engine::book::hash::state_hash(&child);
            if !out.contains_key(&ch) {
                queue.push_back((child, next_depth));
            }
        }
    }
    out
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        eprintln!("usage: book_annotate <in.bin> <out.bin> [--depth N] [--no-compress]");
        std::process::exit(2);
    }
    let in_path = PathBuf::from(&args[1]);
    let out_path = PathBuf::from(&args[2]);
    let mut depth: u8 = 8;
    let mut compress = true;
    let mut i = 3;
    while i < args.len() {
        match args[i].as_str() {
            "--depth" => {
                depth = args.get(i + 1).and_then(|s| s.parse().ok()).unwrap_or(8);
                i += 2;
            }
            "--no-compress" => { compress = false; i += 1; }
            other => { eprintln!("unknown arg: {other}"); std::process::exit(2); }
        }
    }

    println!("Reading book: {}", in_path.display());
    let (mut entries, root) = read_book(&in_path)?;
    println!("  {} entries, root {:#018x}", entries.len(), root);

    // Determine max depth from the book
    let max_depth = entries.values().map(|e| e.depth).max().unwrap_or(0);
    println!("  max depth in book: {max_depth}");
    println!("Rebuilding (hash → state) via BFS at same depth …");
    let t0 = Instant::now();
    let hash_to_state = rebuild_hash_to_state(max_depth);
    let recon_sec = t0.elapsed();
    println!("  rebuilt {} states in {:?}", hash_to_state.len(), recon_sec);

    if hash_to_state.len() != entries.len() {
        println!(
            "  WARNING: state count {} ≠ book entry count {} — hash reconstruction missed entries",
            hash_to_state.len(),
            entries.len()
        );
    }

    // Annotate
    println!("Annotating @ depth {depth}  (this is O(book_size × branching^depth))");
    let t_search = Instant::now();
    let mut total_nodes: u64 = 0;
    let mut annotated = 0usize;
    let mut progress_every = (entries.len() / 20).max(1);
    let mut i = 0usize;
    let keys: Vec<StateHash> = entries.keys().copied().collect();
    for h in keys {
        if let Some(state) = hash_to_state.get(&h) {
            let result = search_best(state, depth);
            total_nodes += result.nodes;
            if let Some(entry) = entries.get_mut(&h) {
                if result.best_move != u8::MAX {
                    entry.best_move = Some(result.best_move);
                    entry.eval_centi = Some(squash_to_centi_i16(result.eval));
                    annotated += 1;
                }
            }
        }
        i += 1;
        if i % progress_every == 0 {
            let dt = t_search.elapsed().as_secs_f64();
            let rate = i as f64 / dt.max(1e-6);
            println!("  {}/{}  ({:.1} entries/s, {:.0} knodes/s, {:.1}s elapsed)",
                     i, entries.len(), rate, total_nodes as f64 / dt / 1000.0, dt);
        }
    }
    let search_dur = t_search.elapsed();
    println!("  annotated {} / {} entries in {:?}", annotated, entries.len(), search_dur);

    // Write
    println!("Writing annotated book: {}", out_path.display());
    let size = write_book(&entries, root, &out_path, compress)?;
    println!("  {} bytes ({:.1} KB)", size, size as f64 / 1024.0);
    Ok(())
}

// Suppress the reexport-import warnings from the compiler when features are trimmed.
#[allow(dead_code)]
fn _silence(_: &Binomials, _: BookEntry, _: Variant, _: GameStatus, _: Player) {
    let _ = unrank_board;
    let _ = rank_position;
}
