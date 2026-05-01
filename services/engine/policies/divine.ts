import { GameState, Player } from '../../../types';
import { EngineMoveOptions, EngineResponse } from '../types';
import { getBookClient } from '../bookClient';
import { getEgtbClient, seedsInPlay } from '../egtbClient';
import { masterMove } from './master';

/**
 * Divine policy — the oracle's best effort.
 *
 * Architecture (3 layers, decreasing authority):
 *   A. Endgame tablebase + opening book  →  source: 'egtb' | 'book', confidence: 'exact'
 *   B. Neural MCTS (master)              →  source: 'nn-mcts',        confidence: 'high'|'medium'
 *   C. Minimax cross-check (legend)      →  tie-breaker only (future — M6.5)
 *
 * The EGTB/book clients are stubbed by default (return null); they become
 * real once WASM bindings + binary loaders land. When null, this function
 * seamlessly falls through to layer B and downgrades the advertised
 * confidence one notch so the UI can convey uncertainty honestly.
 */
export async function divineMove(
  state: GameState,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> {
  const t0 = performance.now();

  // ─ Layer A.1: EGTB — only worth consulting if seeds-in-play is within coverage
  const egtb = getEgtbClient();
  if (seedsInPlay(state) <= egtb.coverageMaxN()) {
    const hit = await egtb.query(state);
    if (hit) {
      const durationMs = performance.now() - t0;
      return {
        move: hit.bestMove,
        source: 'egtb',
        confidence: 'exact',
        eval: wdlToEval(hit.wdl),
        mateIn: hit.dtm,
        durationMs,
      };
    }
  }

  // ─ Layer A.2: opening book
  const book = getBookClient();
  const bookHit = await book.query(state);
  if (bookHit && bookHit.entry.bestMove !== undefined) {
    const durationMs = performance.now() - t0;
    const eval_ = bookHit.entry.evalCenti !== undefined
      ? bookHit.entry.evalCenti / 1000
      : undefined;
    return {
      move: bookHit.entry.bestMove,
      source: 'book',
      // Book entries are only as trustworthy as the oracle that annotated
      // them; we mark them 'exact' only if they connect to a tablebase line.
      // Without that guarantee, 'high' is the honest ceiling.
      confidence: bookHit.entry.evalCenti !== undefined ? 'high' : 'medium',
      eval: eval_,
      durationMs,
    };
  }

  // ─ Layer B: neural MCTS
  const res = await masterMove(state, {
    ...opts,
    timeLimitMs: opts.timeLimitMs ?? 8000,
  });

  // Downgrade confidence since we're running without the tablebase foundation.
  const downgraded: EngineResponse['confidence'] =
    res.confidence === 'high' ? 'medium' :
    res.confidence === 'medium' ? 'low' :
    res.confidence;

  return { ...res, confidence: downgraded };
}

function wdlToEval(wdl: 'win' | 'draw' | 'loss'): number {
  if (wdl === 'win') return 1;
  if (wdl === 'loss') return -1;
  return 0;
}

// Suppress unused import warning when tree-shaking toggles
void Player;
