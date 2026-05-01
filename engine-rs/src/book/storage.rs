//! On-disk format for the opening book.
//!
//! Layout:
//!   magic 8B   "AKBOK01\n"
//!   root 8B    u64 LE — hash of the initial state (entry point)
//!   count 8B   u64 LE — number of entries
//!   flags 1B   bit 0 = zstd compressed payload
//!   reserved 7B
//!   payload    zstd-compressed sequence of entries
//!
//! Each entry in the uncompressed payload:
//!   hash 8B    u64 LE
//!   depth 1B
//!   seeds_in_play 1B
//!   current_player 1B (0|1)
//!   is_annotated 1B  (bit 0 = best_move set, bit 1 = eval_centi set)
//!   best_move 1B     (0 if not annotated, else absolute pit 0..13)
//!   eval_centi 2B    i16 LE (0 if not annotated)
//!   num_moves 1B
//!   moves          (num_moves × 1B, absolute pit indices)
//!   child_hashes   (num_moves × 8B, u64 LE)

use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;

use crate::book::builder::BookEntry;
use crate::book::hash::StateHash;

pub const MAGIC: &[u8; 8] = b"AKBOK01\n";

#[derive(Debug, thiserror::Error)]
pub enum BookIoError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("bad magic: {0:?}")]
    BadMagic([u8; 8]),
    #[error("truncated payload")]
    Truncated,
}

pub fn write_book(
    entries: &HashMap<StateHash, BookEntry>,
    root: StateHash,
    path: &Path,
    compress: bool,
) -> Result<u64, BookIoError> {
    // Serialize payload first
    let mut payload: Vec<u8> = Vec::with_capacity(entries.len() * 48);
    for (&h, e) in entries.iter() {
        payload.extend_from_slice(&h.to_le_bytes());
        payload.push(e.depth);
        payload.push(e.seeds_in_play);
        payload.push(e.current_player);
        let annot = (e.best_move.is_some() as u8) | ((e.eval_centi.is_some() as u8) << 1);
        payload.push(annot);
        payload.push(e.best_move.unwrap_or(0));
        payload.extend_from_slice(&e.eval_centi.unwrap_or(0).to_le_bytes());
        payload.push(e.valid_moves.len() as u8);
        for &m in &e.valid_moves {
            payload.push(m);
        }
        for &ch in &e.child_hashes {
            payload.extend_from_slice(&ch.to_le_bytes());
        }
    }

    let (body, flags) = if compress {
        (zstd::encode_all(&payload[..], 19)?, 1u8)
    } else {
        (payload, 0u8)
    };

    let mut f = std::fs::File::create(path)?;
    f.write_all(MAGIC)?;
    f.write_all(&root.to_le_bytes())?;
    f.write_all(&(entries.len() as u64).to_le_bytes())?;
    f.write_all(&[flags])?;
    f.write_all(&[0u8; 7])?;
    f.write_all(&body)?;

    Ok(std::fs::metadata(path)?.len())
}

pub fn read_book(path: &Path)
    -> Result<(HashMap<StateHash, BookEntry>, StateHash), BookIoError>
{
    let mut f = std::fs::File::open(path)?;
    let mut magic = [0u8; 8];
    f.read_exact(&mut magic)?;
    if &magic != MAGIC {
        return Err(BookIoError::BadMagic(magic));
    }
    let mut buf8 = [0u8; 8];
    f.read_exact(&mut buf8)?;
    let root = u64::from_le_bytes(buf8);
    f.read_exact(&mut buf8)?;
    let count = u64::from_le_bytes(buf8);
    let mut flags = [0u8; 1];
    f.read_exact(&mut flags)?;
    let compressed = flags[0] & 1 != 0;
    let mut reserved = [0u8; 7];
    f.read_exact(&mut reserved)?;

    let mut body: Vec<u8> = Vec::new();
    f.read_to_end(&mut body)?;
    let payload: Vec<u8> = if compressed {
        zstd::decode_all(&body[..])?
    } else {
        body
    };

    let mut entries = HashMap::with_capacity(count as usize);
    let mut idx = 0usize;
    let bytes = &payload[..];
    for _ in 0..count {
        if idx + 16 > bytes.len() {
            return Err(BookIoError::Truncated);
        }
        let h = u64::from_le_bytes(bytes[idx..idx + 8].try_into().unwrap());
        idx += 8;
        let depth = bytes[idx]; idx += 1;
        let seeds = bytes[idx]; idx += 1;
        let cp = bytes[idx]; idx += 1;
        let annot = bytes[idx]; idx += 1;
        let bm = bytes[idx]; idx += 1;
        let ev = i16::from_le_bytes(bytes[idx..idx + 2].try_into().unwrap()); idx += 2;
        let nm = bytes[idx] as usize; idx += 1;

        if idx + nm + nm * 8 > bytes.len() {
            return Err(BookIoError::Truncated);
        }
        let moves: Vec<u8> = bytes[idx..idx + nm].to_vec();
        idx += nm;
        let mut child_hashes: Vec<StateHash> = Vec::with_capacity(nm);
        for _ in 0..nm {
            let c = u64::from_le_bytes(bytes[idx..idx + 8].try_into().unwrap());
            idx += 8;
            child_hashes.push(c);
        }
        let best_move = if annot & 1 != 0 { Some(bm) } else { None };
        let eval_centi = if annot & 2 != 0 { Some(ev) } else { None };
        entries.insert(h, BookEntry {
            depth, seeds_in_play: seeds, current_player: cp,
            valid_moves: moves, child_hashes, best_move, eval_centi,
        });
    }
    Ok((entries, root))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::book::builder::build_book_shape;

    #[test]
    fn roundtrip_uncompressed() {
        let (entries, root) = build_book_shape(2);
        let tmp = std::env::temp_dir().join("akong-book-rt-raw.bin");
        let size = write_book(&entries, root, &tmp, false).unwrap();
        assert!(size > 0);
        let (loaded, lroot) = read_book(&tmp).unwrap();
        assert_eq!(lroot, root);
        assert_eq!(loaded.len(), entries.len());
        for (k, v) in entries.iter() {
            let lv = loaded.get(k).expect("entry lost");
            assert_eq!(lv.depth, v.depth);
            assert_eq!(lv.valid_moves, v.valid_moves);
            assert_eq!(lv.child_hashes, v.child_hashes);
        }
        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn roundtrip_compressed() {
        let (entries, root) = build_book_shape(2);
        let tmp = std::env::temp_dir().join("akong-book-rt-zst.bin");
        let size_raw = write_book(&entries, root, &tmp, false).unwrap();
        let size_zst = write_book(&entries, root, &tmp, true).unwrap();
        assert!(size_zst <= size_raw, "compressed not smaller: {size_zst} vs {size_raw}");
        let (loaded, lroot) = read_book(&tmp).unwrap();
        assert_eq!(lroot, root);
        assert_eq!(loaded.len(), entries.len());
        let _ = std::fs::remove_file(&tmp);
    }
}
