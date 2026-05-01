//! Roundtrip tests for the per-layer EGTB file format.

use akong_engine::egtb::rank::{position_count, rank_position, unrank_position, Binomials};
use akong_engine::egtb::storage::LayerData;
use akong_engine::EgtbSolver;

#[test]
fn roundtrip_uncompressed_layer_3() {
    roundtrip(3, false);
}

#[test]
fn roundtrip_compressed_layer_3() {
    roundtrip(3, true);
}

#[test]
fn roundtrip_compressed_layer_5() {
    roundtrip(5, true);
}

fn roundtrip(n: u8, compressed: bool) {
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(n);

    let bin = Binomials::new();
    let layer = LayerData::from_solver(&solver, n);
    assert_eq!(layer.n, n);
    assert_eq!(layer.payload.len() as u64, position_count(n, &bin));

    let tmpdir = std::env::temp_dir();
    let path = tmpdir.join(format!("akong-egtb-n{n}-c{}.bin", compressed as u8));
    layer.write(&path, compressed).expect("write");

    let size = std::fs::metadata(&path).unwrap().len();
    eprintln!(
        "N={n} compressed={compressed}: {} bytes ({} KB)  uncompressed_ref={} KB",
        size,
        size / 1024,
        layer.payload.len() / 1024
    );

    let loaded = LayerData::read(&path).expect("read");
    assert_eq!(loaded.n, n);
    assert_eq!(loaded.payload.len(), layer.payload.len());

    // Spot-check: every rank agrees with solver query
    let total = position_count(n, &bin);
    let stride = (total / 1000).max(1);
    let mut checked = 0;
    for idx in (0..total).step_by(stride as usize) {
        let state = unrank_position(n, idx, &bin);
        let from_solver = solver.query(&state).expect("should be solved");
        let from_file = loaded.query(idx).expect("should have WDL");
        assert_eq!(from_file, from_solver, "N={n} idx={idx}");
        checked += 1;
    }
    eprintln!("  verified {checked} samples");

    // Full byte equality
    assert_eq!(loaded.payload, layer.payload);

    std::fs::remove_file(&path).ok();
}

#[test]
fn query_by_state_roundtrip_layer_3() {
    let mut solver = EgtbSolver::new();
    solver.solve_up_to(3);
    let bin = Binomials::new();
    let layer = LayerData::from_solver(&solver, 3);

    // Pick a couple states and verify rank→query pathway matches solver
    let total = position_count(3, &bin);
    for idx in (0..total).step_by((total / 200).max(1) as usize) {
        let state = unrank_position(3, idx, &bin);
        let rank = rank_position(&state, &bin);
        assert_eq!(rank, idx);
        assert_eq!(layer.query(rank), solver.query(&state));
    }
}
