import { GameState } from '../../types';
import { coachMove } from './policies/coach';
import { divineMove } from './policies/divine';
import { legacyMove } from './policies/legacy';
import { legendaryMove } from './policies/legendary';
import { masterMove } from './policies/master';
import {
  EngineMoveOptions,
  EnginePolicy,
  EngineResponse,
  GetMoveFn,
} from './types';

/**
 * Entry point of the engine abstraction.
 *
 * Replace any direct `aiService.getBestMove` / `getNeuralMCTSMove` call with
 * `engine.getMove(state, policy)`. The policy object selects the backend
 * declaratively; the oracle forwards to the appropriate handler.
 */
export const getMove: GetMoveFn = async (
  state: GameState,
  policy: EnginePolicy,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> => {
  switch (policy.kind) {
    case 'legacy':
      return legacyMove(state, policy.difficulty, opts);

    case 'master':
      return masterMove(state, {
        ...opts,
        timeLimitMs: opts.timeLimitMs ?? policy.timeLimitMs,
      });

    case 'legendary':
      return legendaryMove(state, policy.bot, opts);

    case 'coach':
      return coachMove(state, policy.targetElo, opts);

    case 'divine':
      return divineMove(state, {
        ...opts,
        timeLimitMs: opts.timeLimitMs ?? policy.timeLimitMs,
      });

    default: {
      const _exhaust: never = policy;
      throw new Error(`unhandled policy: ${JSON.stringify(_exhaust)}`);
    }
  }
};

/**
 * Convenience: return the top-k candidate moves for a hint panel.
 * Currently delegates to the underlying master engine (which exposes a
 * full visit distribution). Falls back gracefully when no distribution is
 * available by returning only the chosen move.
 */
export async function hint(
  state: GameState,
  topK = 3,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> {
  const res = await masterMove(state, opts);
  if (!res.policy) return res;
  // Build top-k alternatives from the visit distribution, excluding the chosen move
  const cpStart = (state.currentPlayer as number) === 0 ? 0 : 7;
  const indexed = res.policy.map((p, i) => ({ rel: i, prob: p }))
    .sort((a, b) => b.prob - a.prob);
  const alternatives = indexed
    .slice(0, topK + 1)
    .filter(entry => entry.rel + cpStart !== res.move)
    .slice(0, topK)
    .map(entry => ({ move: entry.rel + cpStart, eval: entry.prob }));
  return { ...res, alternatives };
}
