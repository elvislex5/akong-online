import { GameState, GameSystem } from '../../types';

/**
 * Unified engine policy selector.
 *
 * Maps runtime-configurable "playing style" choices to a concrete backend
 * (minimax, neural MCTS, tablebase, opening book, …). Each variant carries
 * its own tuning parameters so the oracle can dispatch without guessing.
 *
 * `legacy` — existing minimax α-β engine (`services/ai.ts`) at five depths.
 * `master` — current neural-MCTS engine (`services/neuralAI.ts`).
 * `legendary` — six named bots (Éki → Vivi) mapping to rising strengths.
 * `coach` — adaptive difficulty targeting a Glicko-2 rating.
 * `divine` — oracle's best effort: EGTB + opening book + NN-MCTS + minimax cross-check.
 */
export type EnginePolicy =
  | { kind: 'legacy'; difficulty: LegacyDifficulty }
  | { kind: 'master'; timeLimitMs?: number }
  | { kind: 'legendary'; bot: LegendaryBot }
  | { kind: 'coach'; targetElo: number }
  | { kind: 'divine'; timeLimitMs?: number };

export type LegacyDifficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'legend';

/** Six-bot panthéon from the product plan (Ékang-rooted names). */
export type LegendaryBot = 'eki' | 'radimese' | 'ditoto' | 'nda' | 'mbang' | 'vivi';

/** How certain the oracle is about the move it returned. */
export type Confidence = 'exact' | 'high' | 'medium' | 'low';

/** Which layer produced the move. */
export type EngineSource = 'egtb' | 'book' | 'nn-mcts' | 'minimax' | 'random';

export interface EngineMoveAlternative {
  move: number;
  eval: number;
  /** Short machine-readable tag (e.g. "capture-chain-6", "defense-yini"). */
  tag?: string;
}

export interface EngineResponse {
  /** Absolute pit index (0–13) to play. -1 if no legal move. */
  move: number;

  /** Which oracle layer answered. */
  source: EngineSource;

  /** Confidence in the recommendation. 'exact' iff tablebase-covered. */
  confidence: Confidence;

  /**
   * Value estimate from the current player's perspective, in [-1, +1].
   * Omitted by sources that don't produce values (e.g. random).
   */
  eval?: number;

  /** Distance-to-mate in plies. Only set when `confidence === 'exact'`. */
  mateIn?: number;

  /** Principal variation (sequence of plies) starting with `move`. */
  pv?: number[];

  /** Top-k alternatives for hint mode. Does not include the chosen move. */
  alternatives?: EngineMoveAlternative[];

  /**
   * Full 7-slot visit/probability distribution over current player's pits
   * (relative index). Present for NN-MCTS and EGTB sources.
   */
  policy?: number[];

  /** Wall-clock duration of this query, ms. */
  durationMs: number;
}

/** Optional per-call overrides (time budget, system, randomness, …). */
export interface EngineMoveOptions {
  gameSystem?: GameSystem;
  /** Hard wall-clock budget in ms. Policies may ignore if not applicable. */
  timeLimitMs?: number;
  /** When true, the oracle is allowed to return a lower-confidence move if
   * higher layers are unavailable (default: true). Set to false to require
   * tablebase-exact answers (divine only). */
  allowFallback?: boolean;
}

/** Classification of a played move, used by the post-game analyzer. */
export type MoveClassification =
  | 'divine'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface MoveAnalysis {
  /** Absolute pit index that was played. */
  playedPit: number;
  /** The oracle's top move in the same position. */
  bestPit: number;
  /** Eval difference: best_value - played_value, in [0, 2]. */
  delta: number;
  /** Category assigned from `delta`. */
  classification: MoveClassification;
  /** Short detected tactical motifs (e.g. "yini", "chain-4"). */
  motifs: string[];
  /** Position eval BEFORE the move. */
  evalBefore: number;
  /** Position eval AFTER the move. */
  evalAfter: number;
  /** Free-text explanation (generated from motifs). */
  explanation?: string;
}

/** Type alias for the primary getMove signature. */
export type GetMoveFn = (
  state: GameState,
  policy: EnginePolicy,
  opts?: EngineMoveOptions,
) => Promise<EngineResponse>;

/** The legendary bot metadata table. Immutable source of truth. */
export interface LegendaryBotMeta {
  id: LegendaryBot;
  /** Display label in UI (French, the project's language). */
  label: string;
  /** Short Ékang flavour line shown on hover or selection. */
  flavor: string;
  /** Target Glicko-2 rating for this bot. */
  targetElo: number;
}

export const LEGENDARY_BOTS: readonly LegendaryBotMeta[] = [
  { id: 'eki',       label: 'Éki',       flavor: "L'enfant — semeur qui apprend",                   targetElo: 800  },
  { id: 'radimese',  label: 'Radimese',  flavor: 'Le semeur — ramasse, distribue',                 targetElo: 1100 },
  { id: 'ditoto',    label: 'Ditoto',    flavor: 'Le chasseur — lit les captures',                 targetElo: 1450 },
  { id: 'nda',       label: 'Ndà',       flavor: 'Le grenier — maîtrise les stocks',               targetElo: 1800 },
  { id: 'mbang',     label: 'Mbang',     flavor: 'Le maître — rare se laisse surprendre',          targetElo: 2100 },
  { id: 'vivi',      label: 'Vivi',      flavor: "L'oracle — gardien du savoir du Songo",          targetElo: 3000 },
] as const;
