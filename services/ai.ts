import { GameState, GameSystem } from '../types';

export interface AllMovesEvaluation {
  scores: Record<number, number>;     // move pit index → score (rootPlayer POV)
  bestMove: number;
  bestScore: number;
}

class AIWorkerService {
  private worker: Worker | null = null;
  private currentResolver: ((moveIndex: number) => void) | null = null;
  private evalResolvers = new Map<number, (r: AllMovesEvaluation) => void>();
  private nextRequestId = 1;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, moveIndex, requestId } = e.data;
        if (type === 'BEST_MOVE' && this.currentResolver) {
          this.currentResolver(moveIndex);
          this.currentResolver = null;
        } else if (type === 'ALL_MOVES_EVAL' && requestId !== undefined) {
          const resolver = this.evalResolvers.get(requestId);
          if (resolver) {
            this.evalResolvers.delete(requestId);
            resolver({
              scores: e.data.scores,
              bestMove: e.data.bestMove,
              bestScore: e.data.bestScore,
            });
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('AI Worker Error:', error);
        if (this.currentResolver) {
          this.currentResolver(-1);
          this.currentResolver = null;
        }
        for (const r of this.evalResolvers.values()) r({ scores: {}, bestMove: -1, bestScore: 0 });
        this.evalResolvers.clear();
      };
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public async getBestMove(state: GameState, depth: number, timeLimit: number, gameSystem: GameSystem = 'mgpwem'): Promise<number> {
    if (!this.worker) {
      this.initWorker();
    }

    if (this.currentResolver) {
      this.currentResolver(-1);
    }

    return new Promise((resolve) => {
      this.currentResolver = resolve;
      this.worker?.postMessage({
        type: 'COMPUTE_MOVE',
        state,
        depth,
        timeLimit,
        gameSystem,
      });
    });
  }

  /**
   * Score every legal root move at the given depth. Used by the post-game
   * analyzer to grade each played move against its alternatives.
   */
  public async evaluateAllMoves(
    state: GameState,
    depth: number,
    timeLimit: number,
    gameSystem: GameSystem = 'mgpwem',
  ): Promise<AllMovesEvaluation> {
    if (!this.worker) this.initWorker();
    const requestId = this.nextRequestId++;
    return new Promise((resolve) => {
      this.evalResolvers.set(requestId, resolve);
      this.worker?.postMessage({
        type: 'EVALUATE_ALL_MOVES',
        state,
        depth,
        timeLimit,
        gameSystem,
        requestId,
      });
    });
  }
}

export const aiService = new AIWorkerService();
