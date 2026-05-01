import { GameState, Player } from '../../../types';
import { getNeuralMCTSMove } from '../../neuralAI';
import { EngineMoveOptions, EngineResponse } from '../types';

const DEFAULT_TIME_MS = 5000;

/**
 * Wrapper over the neural-MCTS engine (`services/neuralAI.ts`). Returns the
 * chosen pit along with the full visit distribution and a basic confidence
 * signal derived from the top-1 visit margin.
 */
export async function masterMove(
  state: GameState,
  opts: EngineMoveOptions = {},
): Promise<EngineResponse> {
  const timeLimit = opts.timeLimitMs ?? DEFAULT_TIME_MS;
  const t0 = performance.now();
  const result = await getNeuralMCTSMove(state, timeLimit);
  const durationMs = performance.now() - t0;

  if (result.pit === -1) {
    return {
      move: -1,
      source: 'nn-mcts',
      confidence: 'low',
      policy: result.policy,
      durationMs,
    };
  }

  const cpStart = (state.currentPlayer as number) === Player.One ? 0 : 7;
  const relChosen = result.pit - cpStart;
  const chosenProb = result.policy[relChosen] ?? 0;

  // Visit margin → confidence. A tight top-2 gap means the NN is uncertain.
  const sorted = [...result.policy].sort((a, b) => b - a);
  const margin = sorted[0] - (sorted[1] ?? 0);
  const confidence =
    chosenProb >= 0.8 || margin >= 0.4
      ? 'high'
      : margin >= 0.15
        ? 'medium'
        : 'low';

  return {
    move: result.pit,
    source: 'nn-mcts',
    confidence,
    policy: result.policy,
    durationMs,
  };
}
