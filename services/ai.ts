import { GameState } from '../types';

// Singleton to manage the worker
class AIWorkerService {
  private worker: Worker | null = null;
  private currentResolver: ((moveIndex: number) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, moveIndex } = e.data;
        if (type === 'BEST_MOVE' && this.currentResolver) {
          this.currentResolver(moveIndex);
          this.currentResolver = null;
        }
      };

      this.worker.onerror = (error) => {
        console.error('AI Worker Error:', error);
        if (this.currentResolver) {
          this.currentResolver(-1); // Fallback: return invalid move to handle error gracefully
          this.currentResolver = null;
        }
      };
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public async getBestMove(state: GameState, depth: number, timeLimit: number): Promise<number> {
    if (!this.worker) {
      this.initWorker();
    }

    // Cancel any pending request
    if (this.currentResolver) {
      this.currentResolver(-1);
    }

    return new Promise((resolve) => {
      this.currentResolver = resolve;
      this.worker?.postMessage({
        type: 'COMPUTE_MOVE',
        state,
        depth,
        timeLimit
      });
    });
  }
}

export const aiService = new AIWorkerService();