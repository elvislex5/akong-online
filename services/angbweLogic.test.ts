import { describe, it, expect } from 'vitest';
import {
  createInitialAngbweState,
  executeAngbweMove,
  isValidAngbweMove,
  getAngbweMoveSteps,
  INITIAL_SEEDS_ANGBWE,
  TOTAL_PITS,
} from './angbweLogic';
import { Player, GameStatus } from '../types';

const emptyBoard = () => new Array(TOTAL_PITS).fill(0);

function makeState(overrides: {
  board?: number[];
  currentPlayer?: Player;
  scores?: { [Player.One]: number; [Player.Two]: number };
}) {
  const base = createInitialAngbweState();
  if (overrides.board) base.board = overrides.board;
  if (overrides.currentPlayer !== undefined) base.currentPlayer = overrides.currentPlayer;
  if (overrides.scores) base.scores = overrides.scores;
  return base;
}

// ─── Initial State ───────────────────────────────────────────────────────────

describe('createInitialAngbweState', () => {
  it('creates board with 4 seeds per pit', () => {
    const state = createInitialAngbweState();
    expect(state.board.length).toBe(14);
    state.board.forEach(pit => expect(pit).toBe(4));
  });

  it('has 56 total seeds', () => {
    const state = createInitialAngbweState();
    const total = state.board.reduce((a, b) => a + b, 0);
    expect(total).toBe(56);
  });

  it('starts with Player One', () => {
    const state = createInitialAngbweState();
    expect(state.currentPlayer).toBe(Player.One);
  });

  it('starts with zero scores', () => {
    const state = createInitialAngbweState();
    expect(state.scores[Player.One]).toBe(0);
    expect(state.scores[Player.Two]).toBe(0);
  });
});

// ─── Move Validation ─────────────────────────────────────────────────────────

describe('isValidAngbweMove', () => {
  it('accepts valid move on own side', () => {
    const state = createInitialAngbweState();
    expect(isValidAngbweMove(state, 0).valid).toBe(true);
    expect(isValidAngbweMove(state, 6).valid).toBe(true);
  });

  it('rejects move on opponent side', () => {
    const state = createInitialAngbweState();
    expect(isValidAngbweMove(state, 7).valid).toBe(false);
    expect(isValidAngbweMove(state, 13).valid).toBe(false);
  });

  it('rejects empty pit', () => {
    const board = emptyBoard();
    board[1] = 5;
    board[10] = 5;
    const state = makeState({ board });
    expect(isValidAngbweMove(state, 0).valid).toBe(false);
  });

  it('rejects move when game is finished', () => {
    const state = createInitialAngbweState();
    state.status = GameStatus.Finished;
    expect(isValidAngbweMove(state, 0).valid).toBe(false);
  });
});

// ─── Relay Sowing ────────────────────────────────────────────────────────────

describe('executeAngbweMove — relay sowing', () => {
  it('first move from pit 0 ends at pit 0 (mathematical property)', () => {
    const state = createInitialAngbweState();
    const result = executeAngbweMove(state, 0);

    // Pit 0 should have 1 seed (was empty, last seed dropped here)
    expect(result.board[0]).toBe(1);
    // Pits 4 and 9 should be empty (picked up during relay)
    expect(result.board[4]).toBe(0);
    expect(result.board[9]).toBe(0);
    // Other pits should have 5
    [1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13].forEach(i => {
      expect(result.board[i]).toBe(5);
    });
  });

  it('preserves total seed count (parity)', () => {
    const state = createInitialAngbweState();
    const result = executeAngbweMove(state, 0);
    const boardTotal = result.board.reduce((a, b) => a + b, 0);
    const scoreTotal = result.scores[Player.One] + result.scores[Player.Two];
    expect(boardTotal + scoreTotal).toBe(56);
  });

  it('switches turn after move', () => {
    const state = createInitialAngbweState();
    const result = executeAngbweMove(state, 0);
    expect(result.currentPlayer).toBe(Player.Two);
  });

  it('simple 2-seed relay', () => {
    const board = emptyBoard();
    board[0] = 2;
    board[1] = 0; // empty → turn ends when last seed lands here? No, 2 seeds: drop at 1 and 2
    board[2] = 0;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 0);
    // 2 seeds from pit 0: drop at 1 (0→1, empty before → turn ends? No, still have seeds)
    // drop at 2 (0→1, empty before)
    // Last seed at pit 2, which was empty → turn ends
    expect(result.board[0]).toBe(0);
    expect(result.board[1]).toBe(1);
    expect(result.board[2]).toBe(1);
  });

  it('relay triggers when last seed lands in non-empty pit', () => {
    const board = emptyBoard();
    board[0] = 1; // 1 seed → drop at pit 1
    board[1] = 2; // becomes 3, non-empty before → relay
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 0);
    // Drop 1 at pit 1 (2→3). Was non-empty → relay: pick up 3 from pit 1
    // Drop at 2 (0→1), 3 (0→1), 4 (0→1) — all empty → turn ends at pit 4?
    // Wait: pit 4 was empty (0→1). Turn ends.
    // Actually pit 2 was empty, drop makes it 1. But we still have seeds in hand (2 more).
    // Continue: drop at 3 (0→1), drop at 4 (0→1). Last seed at pit 4, was empty → turn ends.
    expect(result.board[0]).toBe(0);
    expect(result.board[1]).toBe(0);
    expect(result.board[2]).toBe(1);
    expect(result.board[3]).toBe(1);
    expect(result.board[4]).toBe(1);
  });
});

// ─── Capture ─────────────────────────────────────────────────────────────────

describe('executeAngbweMove — capture at 4', () => {
  it('captures when pit reaches exactly 4', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[1] = 3; // becomes 4 → capture
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 0);
    // Pit 1: 3→4 → captured → 0
    expect(result.board[1]).toBe(0);
    expect(result.scores[Player.One]).toBe(4);
  });

  it('does NOT capture when pit goes past 4', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[1] = 4; // becomes 5, not exactly 4
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 0);
    // Pit 1: 4→5. Non-empty → relay from pit 1
    expect(result.scores[Player.One]).toBe(0);
  });

  it('capture creates empty pit, ending turn if it was last seed', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[1] = 3; // becomes 4 → captured → 0
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 0);
    // Last seed dropped at pit 1 → captured → pit is now 0
    // board[currentIdx] === 0 which is <= 1 → turn ends
    expect(result.board[1]).toBe(0);
    expect(result.currentPlayer).toBe(Player.Two);
  });

  it('multiple captures in one turn via relay', () => {
    const board = emptyBoard();
    board[0] = 2;
    board[1] = 3; // first seed → 4 → captured
    board[2] = 3; // second seed → 4 → captured
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 0);
    expect(result.board[1]).toBe(0);
    expect(result.board[2]).toBe(0);
    expect(result.scores[Player.One]).toBe(8);
  });

  it('capture on opponent side counts for current player', () => {
    const board = emptyBoard();
    board[5] = 2;
    board[6] = 0;
    board[7] = 3; // becomes 4 → captured by P1
    board[10] = 5;
    const state = makeState({ board });

    const result = executeAngbweMove(state, 5);
    // Drop at 6 (0→1), drop at 7 (3→4 → captured)
    expect(result.board[7]).toBe(0);
    expect(result.scores[Player.One]).toBe(4);
  });
});

// ─── Game End ────────────────────────────────────────────────────────────────

describe('executeAngbweMove — game end', () => {
  it('game ends when next player has no seeds', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[1] = 0; // empty → turn ends at pit 1
    // Player Two has no seeds (pits 7-13 all 0)
    const state = makeState({ board, scores: { [Player.One]: 25, [Player.Two]: 30 } });

    const result = executeAngbweMove(state, 0);
    expect(result.status).toBe(GameStatus.Finished);
    expect(result.winner).toBe(Player.Two); // P2 has more
  });

  it('collects remaining seeds for current player on game end', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[3] = 5; // remaining on P1 side
    // P2 side empty
    const state = makeState({ board, scores: { [Player.One]: 20, [Player.Two]: 20 } });

    const result = executeAngbweMove(state, 0);
    // After move: pit 0→0, pit 1→1, pit 3→5. P2 side still empty.
    // P1 collects remaining (1+5=6), total = 20+6=26
    expect(result.status).toBe(GameStatus.Finished);
    expect(result.scores[Player.One]).toBe(26);
  });

  it('draw when scores are equal', () => {
    const board = emptyBoard();
    board[0] = 1;
    const state = makeState({ board, scores: { [Player.One]: 27, [Player.Two]: 28 } });

    const result = executeAngbweMove(state, 0);
    // P1 collects pit 1 (1 seed) → 27+1=28. P2 has 28. Draw.
    expect(result.status).toBe(GameStatus.Finished);
    expect(result.winner).toBe('Draw');
  });
});

// ─── Animation Steps ─────────────────────────────────────────────────────────

describe('getAngbweMoveSteps', () => {
  it('generates PICKUP step at start', () => {
    const state = createInitialAngbweState();
    const steps = getAngbweMoveSteps(state, 0);
    expect(steps[0].type).toBe('PICKUP');
    expect(steps[0].pitIndex).toBe(0);
    expect(steps[0].seedsInHand).toBe(4);
  });

  it('generates DROP steps for each seed', () => {
    const board = emptyBoard();
    board[0] = 3;
    board[10] = 5;
    const state = makeState({ board });

    const steps = getAngbweMoveSteps(state, 0);
    const dropSteps = steps.filter(s => s.type === 'DROP');
    expect(dropSteps.length).toBe(3);
    expect(dropSteps[0].pitIndex).toBe(1);
    expect(dropSteps[1].pitIndex).toBe(2);
    expect(dropSteps[2].pitIndex).toBe(3);
  });

  it('generates CAPTURE_PHASE and SCORE for capture', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[1] = 3;
    board[10] = 5;
    const state = makeState({ board });

    const steps = getAngbweMoveSteps(state, 0);
    const captureSteps = steps.filter(s => s.type === 'CAPTURE_PHASE');
    expect(captureSteps.length).toBe(1);
    expect(captureSteps[0].capturedAmount).toBe(4);

    const scoreSteps = steps.filter(s => s.type === 'SCORE');
    expect(scoreSteps.length).toBe(1);
  });

  it('generates relay PICKUP step', () => {
    const board = emptyBoard();
    board[0] = 1;
    board[1] = 2;
    board[10] = 5;
    const state = makeState({ board });

    const steps = getAngbweMoveSteps(state, 0);
    const pickupSteps = steps.filter(s => s.type === 'PICKUP');
    expect(pickupSteps.length).toBe(2); // initial + relay
    expect(pickupSteps[1].description).toBe('Relais !');
  });
});

// ─── Player Two ──────────────────────────────────────────────────────────────

describe('Player Two moves', () => {
  it('P2 plays from their side (pits 7-13)', () => {
    const board = emptyBoard();
    board[7] = 2;
    board[3] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeAngbweMove(state, 7);
    expect(result.board[7]).toBe(0);
    expect(result.board[8]).toBe(1);
    expect(result.board[9]).toBe(1);
    expect(result.currentPlayer).toBe(Player.One);
  });

  it('P2 captures count for P2', () => {
    const board = emptyBoard();
    board[10] = 1;
    board[11] = 3;
    board[3] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeAngbweMove(state, 10);
    expect(result.scores[Player.Two]).toBe(4);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('relay wraps around the board', () => {
    const board = emptyBoard();
    board[12] = 3;
    board[13] = 0;
    board[0] = 0;
    board[1] = 0;
    board[5] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeAngbweMove(state, 12);
    // 3 seeds: drop at 13 (0→1), 0 (0→1), 1 (0→1). All were empty.
    // Last seed at pit 1, was empty → turn ends
    expect(result.board[13]).toBe(1);
    expect(result.board[0]).toBe(1);
    expect(result.board[1]).toBe(1);
  });

  it('seed count is always conserved', () => {
    const state = createInitialAngbweState();
    let current = state;
    const moves = [0, 7, 1, 8, 2, 9];

    for (const move of moves) {
      if (current.status !== GameStatus.Playing) break;
      if (!isValidAngbweMove(current, move).valid) continue;
      current = executeAngbweMove(current, move);
      const total = current.board.reduce((a, b) => a + b, 0)
        + current.scores[Player.One]
        + current.scores[Player.Two];
      expect(total).toBe(56);
    }
  });

  it('INITIAL_SEEDS_ANGBWE is 4', () => {
    expect(INITIAL_SEEDS_ANGBWE).toBe(4);
  });

  it('rejects a move from an empty pit', () => {
    const board = emptyBoard();
    board[7] = 4;
    const state = makeState({ board, currentPlayer: Player.One });
    expect(isValidAngbweMove(state, 0).valid).toBe(false);
  });
});
