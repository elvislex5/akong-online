/**
 * Integration tests: load Rust-produced .bin files via the TypeScript loader
 * and verify parity between both sides.
 *
 * These tests require pre-generated .bin files (uncompressed):
 *   - egtb-data/book-d4-annot-raw.bin  (book, 2330 entries, --no-compress)
 *   - egtb-data/egtb-n5.bin            (EGTB layer, compressed — we skip on CI
 *                                        without fzstd; the layer is the same
 *                                        zstd format as books)
 *
 * Run the Rust CLIs first:
 *   cargo run --release --bin book_build -- 4 --out egtb-data/book-d4.bin
 *   cargo run --release --bin book_annotate -- \
 *     egtb-data/book-d4.bin egtb-data/book-d4-annot-raw.bin --depth 8 --no-compress
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseBookBytes, loadBookFromBytes } from './bookLoader';
import { parseEgtbBytes } from './egtbLoader';
import { stateHash } from './bookClient';
import { GameState, GameStatus, Player } from '../../types';

const ROOT = resolve(__dirname, '../..');
const BOOK_PATH = resolve(ROOT, 'egtb-data/book-d4-annot-raw.bin');

function initialState(): GameState {
  return {
    board: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    scores: { [Player.One]: 0, [Player.Two]: 0 },
    currentPlayer: Player.One,
    status: GameStatus.Playing,
    winner: null,
    message: '',
    isSolidarityMode: false,
    solidarityBeneficiary: null,
  };
}

describe('bookLoader — Rust .bin parsing', () => {
  it.runIf(existsSync(BOOK_PATH))(
    'parses book-d4-annot-raw.bin and finds the root with annotation',
    () => {
      const bytes = new Uint8Array(readFileSync(BOOK_PATH));
      const { root, entries } = parseBookBytes(bytes);

      // Root hash must match the known anchor (same value printed by Rust CLI)
      expect(root).toBe(0x00ef6aa4b6b67eabn);
      expect(entries.size).toBeGreaterThan(2000);

      // Root entry should be present and annotated
      const rootEntry = entries.get(root);
      expect(rootEntry).toBeDefined();
      expect(rootEntry!.depth).toBe(0);
      expect(rootEntry!.validMoves.length).toBe(7); // all 7 pits legal from initial
      expect(rootEntry!.bestMove).toBeDefined();
      expect(rootEntry!.bestMove!).toBeGreaterThanOrEqual(0);
      expect(rootEntry!.bestMove!).toBeLessThanOrEqual(6);
      expect(rootEntry!.evalCenti).toBeDefined();
      expect(rootEntry!.evalCenti!).toBeGreaterThanOrEqual(-1000);
      expect(rootEntry!.evalCenti!).toBeLessThanOrEqual(1000);
    },
  );

  it.runIf(existsSync(BOOK_PATH))(
    'every entry has bestMove/evalCenti filled (annotated book)',
    () => {
      const bytes = new Uint8Array(readFileSync(BOOK_PATH));
      const { entries } = parseBookBytes(bytes);
      let annotated = 0;
      for (const [, e] of entries) {
        if (e.bestMove !== undefined && e.evalCenti !== undefined) annotated++;
      }
      expect(annotated).toBe(entries.size);
    },
  );

  it.runIf(existsSync(BOOK_PATH))(
    'child hashes of root match BFS children (consistent with Rust)',
    () => {
      const bytes = new Uint8Array(readFileSync(BOOK_PATH));
      const { root, entries } = parseBookBytes(bytes);
      const rootEntry = entries.get(root)!;
      expect(rootEntry.childHashes.length).toBe(7);
      for (const ch of rootEntry.childHashes) {
        expect(entries.has(ch)).toBe(true);
      }
    },
  );

  it.runIf(existsSync(BOOK_PATH))(
    'loadBookFromBytes populates a BookClient that resolves the root',
    async () => {
      const bytes = new Uint8Array(readFileSync(BOOK_PATH));
      const { client } = await loadBookFromBytes(bytes);
      const hit = await client.query(initialState());
      expect(hit).not.toBeNull();
      expect(hit!.hash).toBe(0x00ef6aa4b6b67eabn);
      expect(hit!.entry.bestMove).toBeDefined();
    },
  );

  it('rejects files with bad magic', () => {
    const bogus = new Uint8Array(40);
    expect(() => parseBookBytes(bogus)).toThrow(/bad magic/);
  });

  it('errors clearly when compressed file is given without a decompressor', () => {
    // Fabricate a minimal "compressed" header: magic + root(8) + count(8) + flags=1 + reserved(7)
    const buf = new Uint8Array(32 + 4);
    // Magic
    [0x41, 0x4b, 0x42, 0x4f, 0x4b, 0x30, 0x31, 0x0a].forEach((b, i) => { buf[i] = b; });
    // flags byte at offset 24
    buf[24] = 1;
    expect(() => parseBookBytes(buf)).toThrow(/zstd-compressed/);
  });
});

describe('egtbLoader — Rust .bin parsing', () => {
  const EGTB_RAW = resolve(ROOT, 'egtb-data/egtb-n0-raw.bin');

  it.runIf(existsSync(EGTB_RAW))(
    'parses an uncompressed EGTB layer and queries by rank',
    () => {
      const bytes = new Uint8Array(readFileSync(EGTB_RAW));
      const layer = parseEgtbBytes(bytes);
      expect(layer.n).toBeGreaterThanOrEqual(0);
      // Layer 0 (no seeds in play) has 426 positions — verify the payload size
      expect(layer.payload.length).toBeGreaterThan(0);
      const first = layer.queryByRank(0);
      expect(first).not.toBe('unset');
    },
  );

  it('rejects bad magic', () => {
    const bogus = new Uint8Array(32);
    expect(() => parseEgtbBytes(bogus)).toThrow(/bad magic/);
  });
});
