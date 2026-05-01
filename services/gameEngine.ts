import { GameState, GameStatus, GameSystem, GameVariant, AnimationStep } from '../types';
import {
  createInitialState as mgpwemInitial,
  executeMove as mgpwemExecute,
  isValidMove as mgpwemIsValid,
  getMoveSteps as mgpwemSteps,
  resolveGameStalemate as mgpwemStalemate,
} from './songoLogic';
import {
  createInitialAngbweState,
  executeAngbweMove,
  isValidAngbweMove,
  getAngbweMoveSteps,
} from './angbweLogic';

export function createInitialState(gameSystem: GameSystem, status?: GameStatus): GameState {
  if (gameSystem === 'angbwe') {
    const state = createInitialAngbweState();
    if (status) state.status = status;
    return state;
  }
  return mgpwemInitial(status);
}

export function executeMove(
  gameSystem: GameSystem,
  state: GameState,
  pitIndex: number,
  variant?: GameVariant
): GameState {
  if (gameSystem === 'angbwe') {
    return executeAngbweMove(state, pitIndex);
  }
  return mgpwemExecute(state, pitIndex, variant);
}

export function isValidMove(
  gameSystem: GameSystem,
  state: GameState,
  pitIndex: number
): { valid: boolean; error?: string } {
  if (gameSystem === 'angbwe') {
    return isValidAngbweMove(state, pitIndex);
  }
  return mgpwemIsValid(state, pitIndex);
}

export function getMoveSteps(
  gameSystem: GameSystem,
  state: GameState,
  pitIndex: number
): AnimationStep[] {
  if (gameSystem === 'angbwe') {
    return getAngbweMoveSteps(state, pitIndex);
  }
  return mgpwemSteps(state, pitIndex);
}

export function resolveStalemate(
  gameSystem: GameSystem,
  state: GameState,
  variant?: GameVariant
): GameState {
  if (gameSystem === 'angbwe') {
    return state;
  }
  return mgpwemStalemate(state, variant);
}
