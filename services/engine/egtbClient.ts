/**
 * Endgame tablebase runtime client.
 *
 * Mirrors `services/engine/bookClient.ts`: production-final interface, stub
 * body that returns `null` until the WASM loader lands. Design intent:
 *
 *   - N ≤ 10 seeds: bundled with the app (~150 KB zstd per layer);
 *     queried from memory via an EGTB-specific rank function mirrored
 *     from engine-rs/src/egtb/rank.rs.
 *   - N ≤ 15 seeds: lazy-loaded shards into IndexedDB; queried from cache
 *     or streamed from origin.
 *   - N > 15:         REST call to the EGTB server (future M8).
 *
 * For the MVP (this file), every query returns `null` so the oracle
 * gracefully falls back to NN-MCTS / minimax.
 */
import { GameState } from '../../types';

export type EgtbWdl = 'win' | 'draw' | 'loss';

export interface EgtbLookup {
  /** Outcome from the current player's perspective. */
  wdl: EgtbWdl;
  /** Absolute pit index to play (0..13) for optimal play. */
  bestMove: number;
  /** Distance-to-mate in plies. */
  dtm?: number;
  /** Which coverage tier answered: 'client' (bundled), 'indexeddb' (cached shard),
   *  or 'server' (remote REST). */
  source: 'client' | 'indexeddb' | 'server';
}

export interface EgtbClient {
  /** Query WDL + best move for a position. Returns null if uncovered. */
  query(state: GameState): Promise<EgtbLookup | null>;
  /** Max N seeds-in-play the client can answer. */
  coverageMaxN(): number;
}

class StubEgtbClient implements EgtbClient {
  async query(_state: GameState): Promise<EgtbLookup | null> {
    return null;
  }
  coverageMaxN(): number {
    return 0;
  }
}

let _activeEgtbClient: EgtbClient = new StubEgtbClient();

export function getEgtbClient(): EgtbClient {
  return _activeEgtbClient;
}

export function setEgtbClient(client: EgtbClient): void {
  _activeEgtbClient = client;
}

/**
 * Convenience predicate: does the given state's seed count fall within the
 * EGTB coverage budget? Even if true, `query` may still return `null` if a
 * specific shard isn't downloaded yet.
 */
export function seedsInPlay(state: GameState): number {
  let s = 0;
  for (let i = 0; i < 14; i++) s += state.board[i];
  return s;
}
