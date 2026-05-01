/**
 * Binary loader for opening-book files produced by the Rust
 * `book_build` / `book_annotate` CLI.
 *
 * File format (mirrors engine-rs/src/book/storage.rs):
 *   magic 8B    "AKBOK01\n"
 *   root 8B     u64 LE — root hash
 *   count 8B    u64 LE — number of entries
 *   flags 1B    bit 0 = zstd-compressed payload
 *   reserved 7B
 *   payload     uncompressed or zstd-compressed stream of entries:
 *     hash 8B             u64 LE
 *     depth 1B
 *     seeds_in_play 1B
 *     current_player 1B   (0 = P1, 1 = P2)
 *     annotation flags 1B (bit 0 = best_move set, bit 1 = eval_centi set)
 *     best_move 1B
 *     eval_centi 2B       i16 LE
 *     num_moves 1B
 *     moves               num_moves × 1B (absolute pit indices)
 *     child_hashes        num_moves × 8B (u64 LE)
 *
 * For browser delivery, the caller typically provides a zstd decompress
 * function (e.g. backed by `fzstd`). If the file is uncompressed (CLI run
 * with `--no-compress`), no decompressor is needed.
 */
import type { BookEntry, StateHash } from './bookClient';

export const BOOK_MAGIC = new Uint8Array([0x41, 0x4b, 0x42, 0x4f, 0x4b, 0x30, 0x31, 0x0a]); // "AKBOK01\n"
const HEADER_LEN = 8 + 8 + 8 + 1 + 7;

export type ZstdDecompressor = (compressed: Uint8Array) => Uint8Array;

export interface LoadedBook {
  root: StateHash;
  entries: Map<bigint, BookEntry>;
}

export class BookParseError extends Error {
  constructor(msg: string) {
    super(`bookLoader: ${msg}`);
    this.name = 'BookParseError';
  }
}

/**
 * Parse a raw Uint8Array (the file bytes) into a LoadedBook.
 *
 * @param buf the file contents
 * @param decompress optional zstd decompressor; required if the payload is compressed
 */
export function parseBookBytes(
  buf: Uint8Array,
  decompress?: ZstdDecompressor,
): LoadedBook {
  if (buf.length < HEADER_LEN) {
    throw new BookParseError(`file too short: ${buf.length} bytes`);
  }
  // Magic check
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== BOOK_MAGIC[i]) {
      throw new BookParseError(
        `bad magic bytes: expected AKBOK01\\n, got ${Array.from(buf.slice(0, 8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')}`,
      );
    }
  }

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const root = view.getBigUint64(8, true);
  const count = view.getBigUint64(16, true);
  const flags = buf[24];
  const compressed = (flags & 1) !== 0;
  // reserved bytes 25..32 — skip

  let payload: Uint8Array = buf.subarray(HEADER_LEN);
  if (compressed) {
    if (!decompress) {
      throw new BookParseError(
        'payload is zstd-compressed but no decompressor was provided. ' +
          'Pass a zstd function (e.g. from fzstd) as the second argument, ' +
          'or regenerate the book with --no-compress.',
      );
    }
    payload = decompress(payload);
  }

  const entries = new Map<bigint, BookEntry>();
  let off = 0;
  const pv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  for (let i = 0n; i < count; i++) {
    if (off + 16 > payload.length) {
      throw new BookParseError(`truncated payload at entry ${i}`);
    }
    const hash = pv.getBigUint64(off, true); off += 8;
    const depth = payload[off++];
    const seedsInPlay = payload[off++];
    const currentPlayer = payload[off++];
    const annot = payload[off++];
    const bestMoveRaw = payload[off++];
    const evalCentiRaw = pv.getInt16(off, true); off += 2;
    const numMoves = payload[off++];

    if (off + numMoves + numMoves * 8 > payload.length) {
      throw new BookParseError(`truncated payload at entry ${i} moves`);
    }

    const validMoves: number[] = [];
    for (let m = 0; m < numMoves; m++) {
      validMoves.push(payload[off + m]);
    }
    off += numMoves;

    const childHashes: StateHash[] = [];
    for (let m = 0; m < numMoves; m++) {
      childHashes.push(pv.getBigUint64(off, true));
      off += 8;
    }

    const entry: BookEntry = {
      depth,
      seedsInPlay,
      validMoves,
      childHashes,
    };
    if (annot & 1) entry.bestMove = bestMoveRaw;
    if (annot & 2) entry.evalCenti = evalCentiRaw;
    // Silence unused warning — currentPlayer is not on BookEntry but we read it for future use
    void currentPlayer;
    entries.set(hash, entry);
  }

  return { root, entries };
}

/**
 * Convenience: create an InMemoryBookClient directly from file bytes.
 */
export async function loadBookFromBytes(
  buf: Uint8Array,
  decompress?: ZstdDecompressor,
): Promise<{ root: StateHash; client: import('./bookClient').BookClient }> {
  const { makeInMemoryBookClient } = await import('./bookClient');
  const loaded = parseBookBytes(buf, decompress);
  return {
    root: loaded.root,
    client: makeInMemoryBookClient(loaded.entries),
  };
}
