/**
 * Public API of the unified engine abstraction.
 *
 * Replaces the scattered dispatch in App.tsx:677-701. Import from here:
 *
 *     import { getMove, hint, type EnginePolicy } from '@/services/engine';
 *
 *     const res = await getMove(state, { kind: 'legendary', bot: 'vivi' });
 *     playMove(res.move);
 *
 * The oracle internally routes to:
 *   - `policies/legacy.ts`    — existing α-β minimax (5 difficulties)
 *   - `policies/master.ts`    — existing neural-MCTS engine
 *   - `policies/legendary.ts` — six-bot Ékang panthéon
 *   - `policies/coach.ts`     — adaptive-difficulty by target Elo
 *   - `policies/divine.ts`    — the oracle (will wire EGTB + book in M6.4)
 */
export { getMove, hint } from './oracle';
export type {
  Confidence,
  EngineMoveAlternative,
  EngineMoveOptions,
  EnginePolicy,
  EngineResponse,
  EngineSource,
  GetMoveFn,
  LegacyDifficulty,
  LegendaryBot,
  LegendaryBotMeta,
  MoveAnalysis,
  MoveClassification,
} from './types';
export { LEGENDARY_BOTS } from './types';
