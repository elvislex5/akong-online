import { GameState } from '../../../types';
import { aiService } from '../../ai';
import {
  EngineMoveOptions,
  EngineResponse,
  LegacyDifficulty,
} from '../types';

/**
 * Tuning for the legacy minimax engine, mirroring the historical
 * `App.tsx` dispatch (lines 677-683 of the pre-refactor code).
 */
interface LegacyProfile {
  maxDepth: number;
  timeLimitMs: number;
}

const PROFILES: Record<LegacyDifficulty, LegacyProfile> = {
  easy:   { maxDepth: 4,  timeLimitMs: 500   },
  medium: { maxDepth: 10, timeLimitMs: 1500  },
  hard:   { maxDepth: 18, timeLimitMs: 3000  },
  expert: { maxDepth: 25, timeLimitMs: 8000  },
  legend: { maxDepth: 35, timeLimitMs: 15000 },
};

/**
 * Angbwé is a simpler relay-sowing system (CDC §5.1). The position graph
 * is shallower and the evaluator is lighter, so we cap depth/time well
 * below Mgpwém — otherwise even "Facile" feels merciless and the response
 * window stays under the player's patience threshold.
 *
 * Only the 3 user-facing levels are tuned here; expert/legend will fall
 * back to `hard` for Angbwé via the resolver below. (The menu hides them
 * when the system is Angbwé — see MainMenuRevolutionary.)
 */
const ANGBWE_PROFILES: Record<LegacyDifficulty, LegacyProfile> = {
  easy:   { maxDepth: 3,  timeLimitMs: 300  },
  medium: { maxDepth: 6,  timeLimitMs: 800  },
  hard:   { maxDepth: 10, timeLimitMs: 1800 },
  expert: { maxDepth: 10, timeLimitMs: 1800 },  // alias to hard
  legend: { maxDepth: 10, timeLimitMs: 1800 },  // alias to hard
};

/**
 * Wrapper over `services/ai.ts` (α-β minimax Web Worker). Confidence is
 * coarsely mapped from search depth: the deeper we searched, the more we
 * trust the verdict, though it's never "exact" (only tablebase is).
 */
export async function legacyMove(
  state: GameState,
  difficulty: LegacyDifficulty,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> {
  const gameSystem = opts.gameSystem ?? 'mgpwem';
  const profile = gameSystem === 'angbwe' ? ANGBWE_PROFILES[difficulty] : PROFILES[difficulty];
  const timeLimit = opts.timeLimitMs ?? profile.timeLimitMs;

  const t0 = performance.now();
  const moveIndex = await aiService.getBestMove(state, profile.maxDepth, timeLimit, gameSystem);
  const durationMs = performance.now() - t0;

  const confidence = difficulty === 'legend'
    ? 'high'
    : difficulty === 'expert'
      ? 'high'
      : difficulty === 'hard'
        ? 'medium'
        : 'low';

  return {
    move: moveIndex,
    source: 'minimax',
    confidence,
    durationMs,
  };
}
