//! Integration test: after `book_annotate` runs, the on-disk file should be
//! readable and every entry should carry best_move + eval_centi.
//!
//! The test only runs if `../egtb-data/book-d4-annot.bin` exists (produced by
//! the CLI on a prior machine). It's marked as an opt-in sanity check —
//! building+annotating a book from scratch inside `cargo test` would be
//! too slow.

use akong_engine::book::storage::read_book;
use std::path::Path;

#[test]
fn annotated_book_roundtrip() {
    let path = Path::new("../egtb-data/book-d4-annot.bin");
    if !path.exists() {
        eprintln!("skipping: {path:?} missing (run book_annotate first)");
        return;
    }
    let (entries, root) = read_book(path).expect("read annotated book");
    assert!(!entries.is_empty(), "book empty");
    assert!(entries.contains_key(&root), "root missing from book");

    let total = entries.len();
    let annotated = entries.values().filter(|e| e.best_move.is_some()).count();
    let with_eval = entries.values().filter(|e| e.eval_centi.is_some()).count();

    assert_eq!(
        annotated, total,
        "expected every entry annotated; got {annotated}/{total}"
    );
    assert_eq!(
        with_eval, total,
        "expected every entry with eval; got {with_eval}/{total}"
    );

    let root_entry = &entries[&root];
    assert_eq!(root_entry.depth, 0, "root must have depth 0");
    let bm = root_entry.best_move.expect("root best_move");
    assert!(bm < 14, "best_move must be a pit index 0..13");
    let ev = root_entry.eval_centi.expect("root eval");
    assert!((-1000..=1000).contains(&ev), "eval_centi out of range: {ev}");
}
