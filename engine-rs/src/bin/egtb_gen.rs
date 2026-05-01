//! CLI: solve EGTB layers up to a given N, print stats, optionally persist to disk.
//!
//! Usage:
//!   cargo run --release --bin egtb_gen -- <n_max> [--out <dir>] [--no-compress]
//!
//! Uses the memory-efficient dense-Vec solver (M2.5c); cuts peak RAM ~23×
//! vs the earlier HashMap implementation.

use akong_engine::egtb::rank::{position_count, Binomials};
use akong_engine::egtb::storage::LayerData;
use akong_engine::EgtbSolver;
use std::path::PathBuf;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let n_max: u8 = args
        .get(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);

    let mut out_dir: Option<PathBuf> = None;
    let mut compress = true;
    let mut i = 2;
    while i < args.len() {
        match args[i].as_str() {
            "--out" => {
                out_dir = args.get(i + 1).map(PathBuf::from);
                i += 2;
            }
            "--no-compress" => {
                compress = false;
                i += 1;
            }
            other => {
                eprintln!("unknown arg: {other}");
                std::process::exit(2);
            }
        }
    }

    if let Some(ref d) = out_dir {
        std::fs::create_dir_all(d)?;
    }

    let bin = Binomials::new();
    println!("Solving Songo (Mgpwem) EGTB up to N = {n_max} seeds in play");
    if let Some(ref d) = out_dir {
        println!("Output dir: {} (compress={compress})", d.display());
    }
    println!();
    println!(
        "{:>4} {:>14} {:>12} {:>12} {:>12} {:>10} {:>14}",
        "N", "layer_size", "wins", "losses", "draws", "time_ms", "file_size"
    );

    let t_total = Instant::now();
    let mut solver = EgtbSolver::new();

    for n in 0..=n_max {
        let t0 = Instant::now();
        solver.solve_up_to(n);
        let dur_solve = t0.elapsed();

        let layer_size = position_count(n, &bin);
        let (w, l, d) = solver.layer_stats(n);

        let file_info = if let Some(ref dir) = out_dir {
            let path = dir.join(format!("egtb-n{n}.bin"));
            let layer = LayerData::from_solver(&solver, n);
            layer.write(&path, compress)?;
            let size = std::fs::metadata(&path)?.len();
            format!("{} B", size)
        } else {
            String::from("—")
        };

        println!(
            "{:>4} {:>14} {:>12} {:>12} {:>12} {:>10} {:>14}",
            n,
            layer_size,
            w,
            l,
            d,
            dur_solve.as_millis(),
            file_info
        );
    }
    println!();
    println!("Total wall time: {:?}", t_total.elapsed());
    println!("Total entries:   {}", solver.total_entries());
    println!(
        "RAM layers:      {:.1} MB ({} bytes)",
        solver.memory_bytes() as f64 / (1024.0 * 1024.0),
        solver.memory_bytes()
    );
    Ok(())
}
