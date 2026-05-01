import { Player } from '../types';

export class FastAngbweState {
  // Data layout (Int8Array[17]):
  // [0-13]: Pits (seeds count)
  // [14]: Player 1 Score
  // [15]: Player 2 Score
  // [16]: Current Player (0=P1, 1=P2)
  public data: Int8Array;

  constructor() {
    this.data = new Int8Array(17);
  }

  static fromGameState(state: any): FastAngbweState {
    const fast = new FastAngbweState();
    for (let i = 0; i < 14; i++) {
      fast.data[i] = state.board[i] > 127 ? 127 : state.board[i];
    }
    fast.data[14] = state.scores[0];
    fast.data[15] = state.scores[1];
    fast.data[16] = state.currentPlayer === 0 ? 0 : 1;
    return fast;
  }

  clone(): FastAngbweState {
    const s = new FastAngbweState();
    s.data.set(this.data);
    return s;
  }
}

export function fastAngbweExecuteMove(state: FastAngbweState, pitIndex: number): void {
  const { data } = state;
  const currentPlayer = data[16];

  let seeds = data[pitIndex];
  data[pitIndex] = 0;
  let currentIdx = pitIndex;

  while (true) {
    while (seeds > 0) {
      currentIdx = (currentIdx + 1) % 14;
      data[currentIdx]++;
      seeds--;

      if (data[currentIdx] === 4) {
        data[14 + currentPlayer] += 4;
        data[currentIdx] = 0;
      }
    }

    if (data[currentIdx] <= 1) break;

    seeds = data[currentIdx];
    data[currentIdx] = 0;
  }

  data[16] = 1 - currentPlayer;
}

export function getFastAngbweValidMoves(state: FastAngbweState): Uint8Array {
  const { data } = state;
  const currentPlayer = data[16];
  const myStart = currentPlayer === 0 ? 0 : 7;

  const moves = new Uint8Array(7);
  let count = 0;

  for (let i = 0; i < 7; i++) {
    if (data[myStart + i] > 0) {
      moves[count++] = myStart + i;
    }
  }

  return moves.subarray(0, count);
}

export function fastAngbweEvaluate(state: FastAngbweState, maximizingPlayer: number): number {
  const { data } = state;
  const cp = maximizingPlayer;
  const op = 1 - cp;

  const cpScore = data[14 + cp];
  const opScore = data[14 + op];

  if (cpScore > 28) return 100000;
  if (opScore > 28) return -100000;

  let score = (cpScore - opScore) * 100;

  const cpStart = cp === 0 ? 0 : 7;
  const opStart = cp === 0 ? 7 : 0;

  // Mobility: count non-empty pits on my side
  let myMobility = 0;
  let opMobility = 0;
  for (let i = 0; i < 7; i++) {
    if (data[cpStart + i] > 0) myMobility++;
    if (data[opStart + i] > 0) opMobility++;
  }
  score += (myMobility - opMobility) * 10;

  // Threat: pits with 3 seeds on opponent side (can become 4 → capture opportunity)
  let myThreats = 0;
  let opThreats = 0;
  for (let i = 0; i < 7; i++) {
    if (data[opStart + i] === 3) myThreats++;
    if (data[cpStart + i] === 3) opThreats++;
  }
  score += (myThreats - opThreats) * 15;

  return score;
}
