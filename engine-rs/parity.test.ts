/**
 * Parity test: `services/songoLogic.ts` ↔ `engine-rs` (Rust).
 *
 * Plays N random games using the canonical TS engine, then spawns the Rust
 * `parity_check` CLI to replay every move sequence and compare resulting
 * states. Any divergence fails the test.
 *
 * Usage:
 *   cd engine-rs && cargo build --release --bin parity_check
 *   npm test -- engine-rs/parity.test.ts
 *
 * Scale up via env: PARITY_N=100000 npm test -- engine-rs/parity.test.ts
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Player, GameStatus, type GameState } from '../types';
import {
  createInitialState,
  executeMove,
  getValidMoves,
} from '../services/songoLogic';

const __dirname = dirname(fileURLToPath(import.meta.url));

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playRandomGame(rand: () => number): { moves: number[]; final: GameState } {
  let state = createInitialState();
  const moves: number[] = [];
  let plies = 0;
  while (state.status === GameStatus.Playing && plies < 500) {
    const valid = getValidMoves(state);
    if (valid.length === 0) break;
    const pick = valid[Math.floor(rand() * valid.length)];
    moves.push(pick);
    state = executeMove(state, pick);
    plies++;
  }
  return { moves, final: state };
}

function winnerCode(w: GameState['winner']): number | null {
  if (w === null) return null;
  if (w === Player.One) return 0;
  if (w === Player.Two) return 1;
  return 2; // 'Draw'
}

function serializeTrace(trace: { moves: number[]; final: GameState }): string {
  return JSON.stringify({
    moves: trace.moves,
    final: {
      board: trace.final.board,
      scores: [trace.final.scores[Player.One], trace.final.scores[Player.Two]],
      currentPlayer: trace.final.currentPlayer === Player.One ? 0 : 1,
      status: trace.final.status === GameStatus.Playing ? 'Playing' : 'Finished',
      winner: winnerCode(trace.final.winner),
      solidarityMode: trace.final.isSolidarityMode,
      solidarityBeneficiary:
        trace.final.solidarityBeneficiary === null
          ? null
          : trace.final.solidarityBeneficiary === Player.One
            ? 0
            : 1,
    },
  });
}

describe('engine-rs ↔ songoLogic.ts parity', () => {
  const binPath = join(
    __dirname,
    'target',
    'release',
    process.platform === 'win32' ? 'parity_check.exe' : 'parity_check'
  );

  it.runIf(existsSync(binPath))(
    'matches on N random games (default 1000, env PARITY_N to scale)',
    () => {
      const N = parseInt(process.env.PARITY_N ?? '1000', 10);
      const rand = mulberry32(0xcafe42);
      const lines: string[] = [];
      for (let i = 0; i < N; i++) {
        lines.push(serializeTrace(playRandomGame(rand)));
      }
      const traces = lines.join('\n') + '\n';
      const result = spawnSync(binPath, [], {
        input: traces,
        encoding: 'utf8',
        maxBuffer: 500 * 1024 * 1024,
      });
      expect(
        result.status,
        `Rust CLI exited with ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
      ).toBe(0);
      expect(result.stdout).toContain('mismatches: 0');
      expect(result.stdout).toContain(`traces: ${N}`);
    },
    120_000
  );

  it('bin is built (reminder if skipped)', () => {
    if (!existsSync(binPath)) {
      console.warn(
        `[parity.test.ts] ${binPath} not found — the N-games test was skipped.\n` +
          `Build it with: cd engine-rs && cargo build --release --bin parity_check`
      );
    }
    expect(true).toBe(true);
  });
});
