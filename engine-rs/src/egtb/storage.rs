//! Persistent storage for EGTB layers.
//!
//! File format (per layer, one file per N):
//!
//!   ┌──────────────┬───────────────────────────────────────────────┐
//!   │ magic 8B     │ "AKGTB01\n" — version marker                 │
//!   │ n u8         │ seeds_in_play for this layer                  │
//!   │ flags u8     │ bit 0 = zstd-compressed payload               │
//!   │ reserved 6B  │ zero                                          │
//!   │ count u64 LE │ payload length in WDL cells (== position_count)│
//!   │ payload      │ count bytes: 0=unset 1=Win 2=Loss 3=Draw       │
//!   │              │ (compressed with zstd if flags&1)              │
//!   └──────────────┴───────────────────────────────────────────────┘
//!
//! The payload is a flat dense array indexed by `rank_position`. This avoids
//! a perfect-hash step (the rank already is the perfect index into a layer).
//! Unreachable positions get WDL = Draw (harmless — they are never queried).

use std::io::{Read, Write};
use std::path::Path;

use crate::egtb::rank::{Binomials, Index, position_count};
use crate::egtb::solver::Wdl;
use crate::egtb::EgtbTable;

pub const MAGIC: &[u8; 8] = b"AKGTB01\n";
pub const HEADER_LEN: usize = 8 + 1 + 1 + 6 + 8;

const WDL_UNSET: u8 = 0;
const WDL_WIN: u8 = 1;
const WDL_LOSS: u8 = 2;
const WDL_DRAW: u8 = 3;

#[inline]
fn encode_wdl(w: Wdl) -> u8 {
    match w {
        Wdl::Win => WDL_WIN,
        Wdl::Loss => WDL_LOSS,
        Wdl::Draw => WDL_DRAW,
    }
}

#[inline]
fn decode_wdl(b: u8) -> Option<Wdl> {
    match b {
        WDL_WIN => Some(Wdl::Win),
        WDL_LOSS => Some(Wdl::Loss),
        WDL_DRAW => Some(Wdl::Draw),
        _ => None,
    }
}

#[derive(Debug, thiserror::Error)]
pub enum LayerIoError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("bad magic: expected AKGTB01, got {0:?}")]
    BadMagic([u8; 8]),
    #[error("layer size mismatch: header says {header} bytes but got {actual}")]
    SizeMismatch { header: u64, actual: u64 },
    #[error("invalid WDL byte {0} at index {1}")]
    BadWdl(u8, u64),
}

/// Dense WDL payload for a single layer, indexed by rank_position.
pub struct LayerData {
    pub n: u8,
    pub payload: Vec<u8>,
}

impl LayerData {
    /// Build from a solved EGTB table, extracting only the given N layer.
    /// Kept for backward compatibility; prefer `from_solver` with the new
    /// dense-Vec solver.
    pub fn from_table(n: u8, table: &EgtbTable, bin: &Binomials) -> Self {
        let count = position_count(n, bin) as usize;
        let mut payload = vec![WDL_UNSET; count];
        for (&(layer_n, idx), &wdl) in table.iter() {
            if layer_n == n {
                payload[idx as usize] = encode_wdl(wdl);
            }
        }
        Self { n, payload }
    }

    /// Build directly from the solver's dense layer storage. Zero-copy
    /// relative to the solver's internal Vec (we `.to_vec()` to own).
    pub fn from_solver(solver: &crate::egtb::EgtbSolver, n: u8) -> Self {
        Self { n, payload: solver.layer_payload(n).to_vec() }
    }

    #[inline]
    pub fn query(&self, rank: Index) -> Option<Wdl> {
        let b = *self.payload.get(rank as usize)?;
        decode_wdl(b)
    }

    pub fn write<P: AsRef<Path>>(&self, path: P, compress: bool) -> Result<(), LayerIoError> {
        let mut f = std::fs::File::create(path)?;
        self.write_to(&mut f, compress)
    }

    pub fn write_to<W: Write>(&self, w: &mut W, compress: bool) -> Result<(), LayerIoError> {
        w.write_all(MAGIC)?;
        w.write_all(&[self.n])?;
        w.write_all(&[if compress { 1 } else { 0 }])?;
        w.write_all(&[0u8; 6])?;

        if compress {
            let compressed = zstd::encode_all(&self.payload[..], 19)?;
            w.write_all(&(compressed.len() as u64).to_le_bytes())?;
            w.write_all(&compressed)?;
        } else {
            w.write_all(&(self.payload.len() as u64).to_le_bytes())?;
            w.write_all(&self.payload)?;
        }
        Ok(())
    }

    pub fn read<P: AsRef<Path>>(path: P) -> Result<Self, LayerIoError> {
        let mut f = std::fs::File::open(path)?;
        Self::read_from(&mut f)
    }

    pub fn read_from<R: Read>(r: &mut R) -> Result<Self, LayerIoError> {
        let mut magic = [0u8; 8];
        r.read_exact(&mut magic)?;
        if &magic != MAGIC {
            return Err(LayerIoError::BadMagic(magic));
        }
        let mut small = [0u8; 1];
        r.read_exact(&mut small)?;
        let n = small[0];
        r.read_exact(&mut small)?;
        let flags = small[0];
        let compressed = (flags & 1) != 0;
        let mut reserved = [0u8; 6];
        r.read_exact(&mut reserved)?;
        let mut len_bytes = [0u8; 8];
        r.read_exact(&mut len_bytes)?;
        let stored_len = u64::from_le_bytes(len_bytes);

        let mut raw = vec![0u8; stored_len as usize];
        r.read_exact(&mut raw)?;

        let payload = if compressed {
            zstd::decode_all(&raw[..])?
        } else {
            raw
        };
        Ok(Self { n, payload })
    }
}
