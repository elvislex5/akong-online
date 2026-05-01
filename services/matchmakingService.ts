import type { GameSystem } from '../types';
import type { Cadence } from './glicko2';

export interface MatchmakingEntry {
  userId: string;
  socketId: string;
  rating: number;
  rd: number;
  gameSystem: GameSystem;
  cadence: Cadence;
  joinedAt: number;
  username: string;
}

export interface MatchmakingMatch {
  player1: MatchmakingEntry;
  player2: MatchmakingEntry;
}

const INITIAL_RANGE = 100;
const RANGE_EXPANSION_RATE = 50; // per 10 seconds
const MAX_RANGE = 500;

export class MatchmakingQueue {
  private queue: MatchmakingEntry[] = [];

  add(entry: MatchmakingEntry): void {
    this.remove(entry.userId);
    this.queue.push(entry);
    console.log(`[Matchmaking] ${entry.username} (${entry.rating}) joined queue for ${entry.gameSystem}/${entry.cadence}`);
  }

  remove(userId: string): boolean {
    const idx = this.queue.findIndex(e => e.userId === userId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  removeBySocket(socketId: string): boolean {
    const idx = this.queue.findIndex(e => e.socketId === socketId);
    if (idx !== -1) {
      console.log(`[Matchmaking] ${this.queue[idx].username} left queue (disconnect)`);
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  findMatch(): MatchmakingMatch | null {
    const now = Date.now();

    for (let i = 0; i < this.queue.length; i++) {
      const p1 = this.queue[i];
      const waitTime = (now - p1.joinedAt) / 1000;
      const range = Math.min(MAX_RANGE, INITIAL_RANGE + Math.floor(waitTime / 10) * RANGE_EXPANSION_RATE);

      for (let j = i + 1; j < this.queue.length; j++) {
        const p2 = this.queue[j];

        if (p1.gameSystem !== p2.gameSystem || p1.cadence !== p2.cadence) continue;

        const ratingDiff = Math.abs(p1.rating - p2.rating);
        const p2WaitTime = (now - p2.joinedAt) / 1000;
        const p2Range = Math.min(MAX_RANGE, INITIAL_RANGE + Math.floor(p2WaitTime / 10) * RANGE_EXPANSION_RATE);

        if (ratingDiff <= Math.max(range, p2Range)) {
          this.queue.splice(j, 1);
          this.queue.splice(i, 1);

          console.log(`[Matchmaking] Match found: ${p1.username} (${p1.rating}) vs ${p2.username} (${p2.rating})`);
          return { player1: p1, player2: p2 };
        }
      }
    }

    return null;
  }

  getQueueSize(gameSystem?: GameSystem, cadence?: Cadence): number {
    if (!gameSystem && !cadence) return this.queue.length;
    return this.queue.filter(e =>
      (!gameSystem || e.gameSystem === gameSystem) &&
      (!cadence || e.cadence === cadence)
    ).length;
  }

  isInQueue(userId: string): boolean {
    return this.queue.some(e => e.userId === userId);
  }
}

export const matchmakingQueue = new MatchmakingQueue();
