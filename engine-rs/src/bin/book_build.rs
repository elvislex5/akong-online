//! CLI: build the opening book by BFS from the initial Songo position.
//!
//! Usage:
//!   cargo run --release --bin book_build -- <max_depth> [--out <path>] [--no-compress]
//!
//! For now this produces the book *shape* only (reachable positions + move
//! tree). Annotating entries with "best moves" from a strong oracle is a
//! follow-up step in M5.x.

use akong_engine::book::builder::{build_book_shape, stats};
use akong_engine::book::storage::write_book;
use std::path::PathBuf;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let max_depth: u8 = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(4);

    let mut out_path = PathBuf::from(format!("book-d{max_depth}.bin"));
    let mut compress = true;
    let mut i = 2;
    while i < args.len() {
        match args[i].as_str() {
            "--out" => {
                if let Some(v) = args.get(i + 1) {
                    out_path = PathBuf::from(v);
                }
                i += 2;
            }
            "--no-compress" => { compress = false; i += 1; }
            other => { eprintln!("unknown arg: {other}"); std::process::exit(2); }
        }
    }

    println!("Building opening book — BFS depth ≤ {max_depth}");
    let t0 = Instant::now();
    let (entries, root) = build_book_shape(max_depth);
    let dur = t0.elapsed();
    let s = stats(&entries);

    println!();
    println!("Stats:");
    println!("  total unique positions : {}", s.total_entries);
    println!("  avg branching factor   : {:.2}", s.avg_branching_factor);
    println!("  root hash              : {:#018x}", root);
    println!("  BFS wall time          : {:?}", dur);
    println!();
    println!("Positions per depth:");
    for (d, count) in s.positions_by_depth.iter().enumerate() {
        println!("  depth {:>2} : {}", d, count);
    }

    if let Some(parent) = out_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let size = write_book(&entries, root, &out_path, compress)?;
    println!();
    println!("Wrote {} ({} bytes, compress={})", out_path.display(), size, compress);
    Ok(())
}
