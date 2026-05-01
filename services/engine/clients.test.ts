/**
 * Integration tests for bookClient + egtbClient stubs.
 *
 * Critical check: the TypeScript `stateHash()` function must produce the same
 * bytes as the Rust `state_hash()` in engine-rs/src/book/hash.rs. We anchor
 * this by hashing the initial Songo position and comparing against the
 * known-good value printed by the Rust `book_build` CLI (the book root hash).
 */
import { describe, expect, it } from 'vitest';
import { GameState, GameStatus, Player } from '../../types';

import {
  getBookClient,
  makeInMemoryBookClient,
  setBookClient,
  stateHash,
  type BookEntry,
} from './bookClient';
import { getEgtbClient, seedsInPlay } from './egtbClient';

function makeInitial(): GameState {
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

describe('bookClient — stateHash FNV-1a parity with Rust', () => {
  it('is deterministic for identical states', () => {
    const a = stateHash(makeInitial());
    const b = stateHash(makeInitial());
    expect(a).toBe(b);
  });

  it('initial-state hash matches the Rust book root (0x00ef6aa4b6b67eab)', () => {
    // This anchor value was emitted by `cargo run --release --bin book_build -- 6`
    // as the "root hash" of the book. Mismatch = the TS hash has drifted
    // from the Rust hash and opening-book lookups would fail silently.
    const h = stateHash(makeInitial());
    expect(h).toBe(0x00ef6aa4b6b67eabn);
  });

  it('differs when current player changes', () => {
    const a = stateHash(makeInitial());
    const s2 = makeInitial();
    s2.currentPlayer = Player.Two;
    const b = stateHash(s2);
    expect(a).not.toBe(b);
  });

  it('differs when solidarity flags change', () => {
    const a = stateHash(makeInitial());
    const s2 = makeInitial();
    s2.isSolidarityMode = true;
    s2.solidarityBeneficiary = Player.One;
    const b = stateHash(s2);
    expect(a).not.toBe(b);
  });

  it('differs when a pit seed count changes', () => {
    const a = stateHash(makeInitial());
    const s2 = makeInitial();
    s2.board = [...s2.board];
    s2.board[3] = 4;
    s2.board[4] = 6;
    const b = stateHash(s2);
    expect(a).not.toBe(b);
  });
});

describe('bookClient — stub & in-memory', () => {
  it('default stub returns null for every query', async () => {
    const stub = getBookClient();
    expect(await stub.query(makeInitial())).toBeNull();
    expect(stub.size()).toBe(0);
  });

  it('in-memory client resolves matching hashes', async () => {
    const initial = makeInitial();
    const hash = stateHash(initial);
    const entry: BookEntry = {
      depth: 0,
      seedsInPlay: 70,
      validMoves: [0, 1, 2, 3, 4, 5, 6],
      childHashes: [],
      bestMove: 3,
      evalCenti: 150,
    };
    const client = makeInMemoryBookClient(new Map([[hash, entry]]));
    setBookClient(client);
    try {
      const hit = await client.query(initial);
      expect(hit).not.toBeNull();
      expect(hit?.entry.bestMove).toBe(3);
      expect(hit?.hash).toBe(hash);
    } finally {
      // Restore stub for other tests
      setBookClient({
        query: async () => null,
        size: () => 0,
      });
    }
  });
});

describe('egtbClient — stub', () => {
  it('returns null and coverageMaxN of 0', async () => {
    const stub = getEgtbClient();
    expect(await stub.query(makeInitial())).toBeNull();
    expect(stub.coverageMaxN()).toBe(0);
  });
});

describe('seedsInPlay helper', () => {
  it('sums all pits', () => {
    expect(seedsInPlay(makeInitial())).toBe(70);
    const s2 = makeInitial();
    s2.board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(seedsInPlay(s2)).toBe(0);
  });
});
