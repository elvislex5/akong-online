/**
 * Binary loader for EGTB layer files produced by the Rust `egtb_gen` CLI.
 *
 * File format (mirrors engine-rs/src/egtb/storage.rs):
 *   magic 8B    "AKGTB01\n"
 *   n 1B        seeds_in_play for this layer
 *   flags 1B    bit 0 = zstd compressed
 *   reserved 6B
 *   length 8B   u64 LE — payload byte count
 *   payload     length bytes, one per position (0=unset 1=Win 2=Loss 3=Draw)
 *
 * The payload is indexed by the Rust `rank_position` function; querying a
 * position requires reimplementing that ranking in TypeScript OR building a
 * thin wasm bridge. For the MVP we only expose `queryByRank(rank)` so
 * callers can do the ranking themselves (e.g. via the future wasm glue).
 */
export const EGTB_MAGIC = new Uint8Array([0x41, 0x4b, 0x47, 0x54, 0x42, 0x30, 0x31, 0x0a]); // "AKGTB01\n"
const HEADER_LEN = 8 + 1 + 1 + 6 + 8;

export type ZstdDecompressor = (compressed: Uint8Array) => Uint8Array;

export type EgtbWdl = 'win' | 'loss' | 'draw' | 'unset';

export interface LoadedEgtbLayer {
  /** Seeds in play for this layer. */
  n: number;
  /** Dense byte payload: one WDL code per position (indexed by rank). */
  payload: Uint8Array;
  /** Query WDL at a given rank. Returns null if out of bounds. */
  queryByRank(rank: number): EgtbWdl | null;
}

export class EgtbParseError extends Error {
  constructor(msg: string) {
    super(`egtbLoader: ${msg}`);
    this.name = 'EgtbParseError';
  }
}

function decodeWdl(b: number): EgtbWdl {
  switch (b) {
    case 1: return 'win';
    case 2: return 'loss';
    case 3: return 'draw';
    default: return 'unset';
  }
}

export function parseEgtbBytes(
  buf: Uint8Array,
  decompress?: ZstdDecompressor,
): LoadedEgtbLayer {
  if (buf.length < HEADER_LEN) {
    throw new EgtbParseError(`file too short: ${buf.length} bytes`);
  }
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== EGTB_MAGIC[i]) {
      throw new EgtbParseError(
        `bad magic: expected AKGTB01\\n, got ${Array.from(buf.slice(0, 8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')}`,
      );
    }
  }
  const n = buf[8];
  const flags = buf[9];
  const compressed = (flags & 1) !== 0;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const length = view.getBigUint64(16, true);
  const body = buf.subarray(HEADER_LEN, HEADER_LEN + Number(length));

  let payload: Uint8Array;
  if (compressed) {
    if (!decompress) {
      throw new EgtbParseError(
        'payload is zstd-compressed but no decompressor was provided',
      );
    }
    payload = decompress(body);
  } else {
    payload = new Uint8Array(body);
  }

  return {
    n,
    payload,
    queryByRank(rank: number): EgtbWdl | null {
      if (rank < 0 || rank >= payload.length) return null;
      return decodeWdl(payload[rank]);
    },
  };
}
