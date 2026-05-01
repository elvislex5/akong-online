import { GameState, GameStatus, GameSystem, Player } from '../types';
import { createInitialState as createInitialMgpwem, executeMove as executeMgpwemMove } from './songoLogic';
import { createInitialAngbweState, executeAngbweMove } from './angbweLogic';
import { aiService } from './ai';

/**
 * Per-move grade — drives color/icon in the analysis UI and fuels the
 * accuracy score. Order is important (used to compare).
 */
export type MoveGrade = 'excellent' | 'bon' | 'imprecis' | 'erreur' | 'gaffe';

export interface AnalyzedMove {
  ply: number;
  player: Player;
  moveIndex: number;        // pit the player chose
  bestMoveIndex: number;    // what the engine recommends at this position
  scoreLoss: number;        // bestScore - playedScore (≥ 0). NaN if engine couldn't evaluate.
  grade: MoveGrade;
  isBest: boolean;          // true if the player picked the engine's top choice
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  accuracy: { [Player.One]: number; [Player.Two]: number };  // 0-100
  counts: { [Player.One]: Record<MoveGrade, number>; [Player.Two]: Record<MoveGrade, number> };
}

/**
 * Loss thresholds (in seed-units, i.e. how many seeds worse the played move
 * leads to vs the best). Tuned for Songo where games end at 36-40 captured
 * seeds and a 6-seed swing is decisive. Forced moves (only one legal) are
 * always graded "excellent" — the player had no alternative.
 */
const THRESHOLDS: Array<[number, MoveGrade]> = [
  [0.5, 'excellent'],
  [1.5, 'bon'],
  [3.0, 'imprecis'],
  [6.0, 'erreur'],
  [Infinity, 'gaffe'],
];

function gradeFromLoss(loss: number): MoveGrade {
  for (const [threshold, grade] of THRESHOLDS) {
    if (loss <= threshold) return grade;
  }
  return 'gaffe';
}

/**
 * Per-grade accuracy weight. An "excellent" move is worth full credit,
 * a "gaffe" is worth nothing. Mirrors how Chess.com computes its 0-100
 * accuracy score, but on a much simpler 5-step scale.
 */
const GRADE_WEIGHT: Record<MoveGrade, number> = {
  excellent: 1.0,
  bon: 0.85,
  imprecis: 0.6,
  erreur: 0.3,
  gaffe: 0.0,
};

export const GRADE_LABEL: Record<MoveGrade, string> = {
  excellent: 'Excellent',
  bon: 'Bon',
  imprecis: 'Imprécis',
  erreur: 'Erreur',
  gaffe: 'Gaffe',
};

export const GRADE_COLOR: Record<MoveGrade, string> = {
  excellent: 'text-emerald-600',
  bon: 'text-sky-600',
  imprecis: 'text-amber-600',
  erreur: 'text-orange-600',
  gaffe: 'text-rose-600',
};

export const GRADE_BG: Record<MoveGrade, string> = {
  excellent: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  bon: 'bg-sky-50 border-sky-300 text-sky-700',
  imprecis: 'bg-amber-50 border-amber-300 text-amber-700',
  erreur: 'bg-orange-50 border-orange-300 text-orange-700',
  gaffe: 'bg-rose-50 border-rose-300 text-rose-700',
};

const ZERO_COUNTS = (): Record<MoveGrade, number> => ({
  excellent: 0, bon: 0, imprecis: 0, erreur: 0, gaffe: 0,
});

export interface AnalyzerOptions {
  /** Search depth per position. Default 7 — fast enough, decent quality. */
  depth?: number;
  /** Hard time cap per position in ms. Default 600. */
  timeLimitMs?: number;
  /** Game variant. Default mgpwem. */
  gameSystem?: GameSystem;
  /** Progress callback: 0..1. */
  onProgress?: (fraction: number) => void;
}

/**
 * Replays a finished game move by move. At each position, asks the engine
 * to score every legal move, then grades the actual choice against the
 * best alternative. Returns full per-move analysis + accuracy summary.
 *
 * Cost: depth=7 / 600ms per move × ~30 moves ≈ 18s. Acceptable for
 * "click to analyze" UX. Caller should show a progress indicator.
 */
export async function analyzeGame(
  moves: number[],
  options: AnalyzerOptions = {},
): Promise<GameAnalysis> {
  const depth = options.depth ?? 7;
  const timeLimitMs = options.timeLimitMs ?? 600;
  const gameSystem = options.gameSystem ?? 'mgpwem';
  const onProgress = options.onProgress;

  const isAngbwe = gameSystem === 'angbwe';
  const initState = () => (isAngbwe ? createInitialAngbweState() : createInitialMgpwem());
  const applyMove = (s: GameState, m: number) =>
    isAngbwe ? executeAngbweMove(s, m) : executeMgpwemMove(s, m);

  const analyzed: AnalyzedMove[] = [];
  let state: GameState = initState();

  for (let ply = 0; ply < moves.length; ply++) {
    if (state.status === GameStatus.Finished) break;

    const player = state.currentPlayer;
    const moveIndex = moves[ply];

    // Ask the engine to score every legal move at this position. Forced
    // moves (only one legal) get an excellent grade — no choice was made.
    const evalResult = await aiService.evaluateAllMoves(state, depth, timeLimitMs, gameSystem);
    const legalMoves = Object.keys(evalResult.scores);

    let grade: MoveGrade;
    let scoreLoss: number;
    let bestMoveIndex = evalResult.bestMove;

    if (legalMoves.length <= 1) {
      grade = 'excellent';
      scoreLoss = 0;
    } else {
      const playedScore = evalResult.scores[moveIndex];
      if (typeof playedScore !== 'number') {
        // Played move not in legal list (shouldn't happen) — neutral grade
        grade = 'bon';
        scoreLoss = NaN;
      } else {
        scoreLoss = Math.max(0, evalResult.bestScore - playedScore);
        grade = gradeFromLoss(scoreLoss);
      }
    }

    analyzed.push({
      ply,
      player,
      moveIndex,
      bestMoveIndex,
      scoreLoss,
      grade,
      isBest: moveIndex === bestMoveIndex,
    });

    state = applyMove(state, moveIndex);
    onProgress?.((ply + 1) / moves.length);
  }

  // Compute per-player accuracy + grade counts.
  const counts = {
    [Player.One]: ZERO_COUNTS(),
    [Player.Two]: ZERO_COUNTS(),
  };
  const weighted = { [Player.One]: 0, [Player.Two]: 0 };
  const totals = { [Player.One]: 0, [Player.Two]: 0 };

  for (const m of analyzed) {
    counts[m.player][m.grade]++;
    weighted[m.player] += GRADE_WEIGHT[m.grade];
    totals[m.player]++;
  }

  const accuracy = {
    [Player.One]: totals[Player.One] > 0 ? Math.round((weighted[Player.One] / totals[Player.One]) * 100) : 0,
    [Player.Two]: totals[Player.Two] > 0 ? Math.round((weighted[Player.Two] / totals[Player.Two]) * 100) : 0,
  };

  return { moves: analyzed, accuracy, counts };
}
