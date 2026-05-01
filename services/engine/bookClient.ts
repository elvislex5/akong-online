/**
 * Opening book runtime client.
 *
 * Interface is production-final; the body is currently a stub that returns
 * `null` for every query. The `stateHash` function is a bit-for-bit port of
 * `engine-rs/src/book/hash.rs`'s FNV-1a routine, so once the binary loader is
 * wired up we can key directly into a `Map<StateHash, BookEntry>` loaded
 * from the Rust-produced `book-dK.bin` file.
 *
 * Loading path (deferred to M6.4d):
 *   1. fetch('/assets/book-d8.bin') → ArrayBuffer
 *   2. parse 24-byte header (magic + root + count + flags + reserved)
 *   3. if compressed: decompress payload via fzstd (~20KB JS lib)
 *   4. iterate entries into Map<bigint, BookEntry>
 *   5. cache in IndexedDB for subsequent loads
 */
import { GameState, Player } from '../../types';

export type StateHash = bigint; // BigInt64 — unsigned 64-bit semantics

export interface BookEntry {
  /** Depth (ply from root) at which this position was enumerated. */
  depth: number;
  /** Total seeds on the board (derivable but cached for filter speed). */
  seedsInPlay: number;
  /** Legal pit indices (absolute 0..13). */
  validMoves: number[];
  /** Hash of each corresponding child state, parallel to validMoves. */
  childHashes: StateHash[];
  /** Best move (absolute pit 0..13). Undefined if not annotated yet. */
  bestMove?: number;
  /** Eval from mover's perspective, fixed-point (-1000..+1000). */
  evalCenti?: number;
}

export interface BookLookup {
  /** The stored entry, if found. */
  entry: BookEntry;
  /** Hash we queried — useful for client debug. */
  hash: StateHash;
}

// ─── FNV-1a state hash (must match engine-rs/src/book/hash.rs) ──────────────

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const U64_MASK = 0xffffffffffffffffn;

function fnv1aUpdate(h: bigint, byte: number): bigint {
  h ^= BigInt(byte & 0xff);
  h = (h * FNV_PRIME) & U64_MASK;
  return h;
}

/**
 * Hash a GameState to a 64-bit BigInt. Layout must mirror Rust exactly:
 *   [0..14] pits (u8 each)
 *   [14]    scores[P1]
 *   [15]    scores[P2]
 *   [16]    current_player (0|1)
 *   [17]    variant (0 = Gabon — only one currently supported)
 *   [18]    solidarity byte: 0=off, 0b011=on+P1 benef, 0b101=on+P2 benef, 0b001=on+None
 *   [19]    reserved = 0
 */
export function stateHash(state: GameState): StateHash {
  let h = FNV_OFFSET;
  // Pits 0..13
  for (let i = 0; i < 14; i++) {
    h = fnv1aUpdate(h, state.board[i]);
  }
  // Scores
  h = fnv1aUpdate(h, state.scores[Player.One]);
  h = fnv1aUpdate(h, state.scores[Player.Two]);
  // Current player
  h = fnv1aUpdate(h, state.currentPlayer === Player.One ? 0 : 1);
  // Variant — app hard-codes Gabon (36) for now; update when Cameroon ships
  h = fnv1aUpdate(h, 0);
  // Solidarity byte
  let sol = 0;
  if (state.isSolidarityMode) {
    if (state.solidarityBeneficiary === Player.One) sol = 0b011;
    else if (state.solidarityBeneficiary === Player.Two) sol = 0b101;
    else sol = 0b001;
  }
  h = fnv1aUpdate(h, sol);
  h = fnv1aUpdate(h, 0);
  return h;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export interface BookClient {
  /** Query the book for a position. Returns null if not in book. */
  query(state: GameState): Promise<BookLookup | null>;
  /** Number of entries currently loaded; 0 if not loaded. */
  size(): number;
}

class StubBookClient implements BookClient {
  async query(_state: GameState): Promise<BookLookup | null> {
    return null;
  }
  size(): number {
    return 0;
  }
}

class InMemoryBookClient implements BookClient {
  constructor(private readonly store: Map<bigint, BookEntry>) {}
  async query(state: GameState): Promise<BookLookup | null> {
    const h = stateHash(state);
    const entry = this.store.get(h);
    return entry ? { entry, hash: h } : null;
  }
  size(): number {
    return this.store.size;
  }
}

/**
 * Build a BookClient from a pre-parsed in-memory map. Primarily used by
 * tests and by the future binary loader.
 */
export function makeInMemoryBookClient(store: Map<bigint, BookEntry>): BookClient {
  return new InMemoryBookClient(store);
}

/**
 * The singleton default client. Returns `null` until a real book is loaded.
 * Swap via `setBookClient()` once the binary loader lands.
 */
let _activeBookClient: BookClient = new StubBookClient();

export function getBookClient(): BookClient {
  return _activeBookClient;
}

export function setBookClient(client: BookClient): void {
  _activeBookClient = client;
}
