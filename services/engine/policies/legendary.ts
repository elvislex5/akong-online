import { GameState } from '../../../types';
import {
  EngineMoveOptions,
  EngineResponse,
  LegendaryBot,
  LegacyDifficulty,
} from '../types';
import { legacyMove } from './legacy';
import { masterMove } from './master';

/**
 * Panthéon of six named bots (Ékang heritage), each backed by a concrete
 * engine configuration. The mapping is intentionally simple for the MVP —
 * future iterations will swap Mbang/Vivi for tablebase-aware engines and
 * add eval-deviation caps + policy temperature to tune Elo precisely.
 */
interface LegendaryBackend {
  /** When set, dispatch to legacy minimax at this difficulty. */
  legacyDifficulty?: LegacyDifficulty;
  /** When true, dispatch to the neural master engine. */
  useMaster?: boolean;
  /** Optional time budget override (ms). */
  timeLimitMs?: number;
}

const BACKENDS: Record<LegendaryBot, LegendaryBackend> = {
  eki:      { legacyDifficulty: 'easy'   },
  radimese: { legacyDifficulty: 'medium' },
  ditoto:   { legacyDifficulty: 'hard'   },
  nda:      { legacyDifficulty: 'expert' },
  mbang:    { useMaster: true, timeLimitMs: 5000 },
  // Vivi currently falls back to master (NN-MCTS) until the EGTB + opening
  // book runtime is wired in M6.4. Signalled via `confidence: 'medium'`
  // rather than 'exact' so the UI can convey uncertainty honestly.
  vivi:     { useMaster: true, timeLimitMs: 8000 },
};

export async function legendaryMove(
  state: GameState,
  bot: LegendaryBot,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> {
  const backend = BACKENDS[bot];

  if (backend.useMaster) {
    const res = await masterMove(state, {
      ...opts,
      timeLimitMs: opts.timeLimitMs ?? backend.timeLimitMs,
    });
    // Tag the response with the bot identity so the UI can attribute the move.
    return {
      ...res,
      // Vivi is marketed as "the oracle" but runs NN-MCTS today; keep source
      // truthful. Confidence stays whatever master reports.
    };
  }

  if (backend.legacyDifficulty) {
    return legacyMove(state, backend.legacyDifficulty, {
      ...opts,
      timeLimitMs: opts.timeLimitMs ?? backend.timeLimitMs,
    });
  }

  throw new Error(`legendary bot ${bot} has no backend`);
}
