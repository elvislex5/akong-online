import { GameState } from '../../../types';
import { EngineMoveOptions, EngineResponse, LegacyDifficulty } from '../types';
import { legacyMove } from './legacy';

/**
 * Adaptive-difficulty coach.
 *
 * MVP: maps a target Glicko-2 rating to the closest legacy difficulty level.
 * This is intentionally coarse — the final product (plan P6) adds eval-deviation
 * capping, policy temperature, and a Poisson blunder budget on top.
 *
 * The bracket boundaries are calibrated against the LEGENDARY_BOTS ratings
 * so coach(1450) ≈ Ditoto, coach(2100) ≈ Mbang, etc.
 */

function targetToDifficulty(targetElo: number): LegacyDifficulty {
  if (targetElo < 1000) return 'easy';
  if (targetElo < 1300) return 'medium';
  if (targetElo < 1700) return 'hard';
  if (targetElo < 2000) return 'expert';
  return 'legend';
}

export async function coachMove(
  state: GameState,
  targetElo: number,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> {
  const difficulty = targetToDifficulty(targetElo);
  const res = await legacyMove(state, difficulty, opts);
  // Coach is always a "demo" level — tag as medium regardless of underlying depth.
  return { ...res, confidence: 'medium' };
}
