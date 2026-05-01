import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  executeMove,
  isValidMove,
  getValidMoves,
  getPitOwner,
  getPlayerIndices,
  getOpponentIndices,
  resolveGameStalemate,
  getWinningScore,
  PITS_PER_PLAYER,
  TOTAL_PITS,
  INITIAL_SEEDS,
  WINNING_SCORE,
} from './songoLogic';
import { Player, GameStatus, GameState } from '../types';

// Helper to create a custom board state
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(),
    ...overrides,
    scores: { [Player.One]: 0, [Player.Two]: 0, ...overrides.scores },
  };
}

function emptyBoard(): number[] {
  return Array(14).fill(0);
}

// ─── Constants ───────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('has correct game constants', () => {
    expect(PITS_PER_PLAYER).toBe(7);
    expect(TOTAL_PITS).toBe(14);
    expect(INITIAL_SEEDS).toBe(5);
    expect(WINNING_SCORE).toBe(36);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

describe('getPitOwner', () => {
  it('pits 0-6 belong to Player One', () => {
    for (let i = 0; i < 7; i++) {
      expect(getPitOwner(i)).toBe(Player.One);
    }
  });

  it('pits 7-13 belong to Player Two', () => {
    for (let i = 7; i < 14; i++) {
      expect(getPitOwner(i)).toBe(Player.Two);
    }
  });
});

describe('getPlayerIndices / getOpponentIndices', () => {
  it('returns correct indices for Player One', () => {
    expect(getPlayerIndices(Player.One)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(getOpponentIndices(Player.One)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it('returns correct indices for Player Two', () => {
    expect(getPlayerIndices(Player.Two)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(getOpponentIndices(Player.Two)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

// ─── Initial State ───────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('creates a board with 5 seeds per pit', () => {
    const state = createInitialState();
    expect(state.board).toEqual(Array(14).fill(5));
  });

  it('starts with Player One', () => {
    expect(createInitialState().currentPlayer).toBe(Player.One);
  });

  it('starts with zero scores', () => {
    const state = createInitialState();
    expect(state.scores[Player.One]).toBe(0);
    expect(state.scores[Player.Two]).toBe(0);
  });

  it('starts in Playing status', () => {
    expect(createInitialState().status).toBe(GameStatus.Playing);
  });

  it('has no winner initially', () => {
    expect(createInitialState().winner).toBeNull();
  });
});

// ─── isValidMove ─────────────────────────────────────────────────────────────

describe('isValidMove', () => {
  it('rejects moves on opponent pits', () => {
    const state = createInitialState();
    const result = isValidMove(state, 7);
    expect(result.valid).toBe(false);
  });

  it('rejects moves on empty pits', () => {
    const board = Array(14).fill(5);
    board[3] = 0;
    const state = makeState({ board });
    expect(isValidMove(state, 3).valid).toBe(false);
  });

  it('allows valid moves on own non-empty pits', () => {
    const state = createInitialState();
    for (let i = 0; i < 7; i++) {
      expect(isValidMove(state, i).valid).toBe(true);
    }
  });

  it('rejects last pit with 1 seed when player has other seeds', () => {
    const board = emptyBoard();
    board[3] = 5;
    board[6] = 1; // Last pit for Player One
    const state = makeState({ board });
    expect(isValidMove(state, 6).valid).toBe(false);
  });

  it('allows last pit with 1 seed when it is the only seed (desperate)', () => {
    const board = emptyBoard();
    board[6] = 1;
    // Put some seeds on opponent side so game isn't over
    board[10] = 5;
    const state = makeState({ board });
    expect(isValidMove(state, 6).valid).toBe(true);
  });

  it('enforces solidarity: must feed starving opponent', () => {
    const board = emptyBoard();
    // Player One has seeds in pits 0 and 5
    board[0] = 2; // lands on pit 1, 2 — stays on Player One's side
    board[5] = 3; // lands on 6, 7, 8 — feeds opponent
    // Opponent side is empty
    const state = makeState({ board });

    // Pit 0 doesn't feed opponent (lands on 1, 2) — should be invalid
    expect(isValidMove(state, 0).valid).toBe(false);
    // Pit 5 feeds opponent (reaches pit 7+) — should be valid
    expect(isValidMove(state, 5).valid).toBe(true);
  });

  it('allows non-feeding move when no feeding move exists', () => {
    const board = emptyBoard();
    board[0] = 1; // Only 1 seed, lands on pit 1 — cannot feed
    // No other pits have seeds, so no feeding move exists
    const state = makeState({ board });
    expect(isValidMove(state, 0).valid).toBe(true);
  });
});

// ─── executeMove — Basic Distribution ────────────────────────────────────────

describe('executeMove — basic distribution', () => {
  it('distributes seeds one per pit clockwise', () => {
    const board = emptyBoard();
    board[0] = 3;
    board[10] = 5; // Opponent has seeds
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.board[0]).toBe(0); // Picked up
    expect(result.board[1]).toBe(1);
    expect(result.board[2]).toBe(1);
    expect(result.board[3]).toBe(1);
  });

  it('wraps around the board', () => {
    const board = emptyBoard();
    board[12] = 4;
    board[3] = 5; // Player One has seeds so game doesn't end
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeMove(state, 12);
    expect(result.board[12]).toBe(0);
    expect(result.board[13]).toBe(1);
    expect(result.board[0]).toBe(1);
    expect(result.board[1]).toBe(1);
    expect(result.board[2]).toBe(1);
  });

  it('switches turn after a move', () => {
    const state = createInitialState();
    const result = executeMove(state, 0);
    expect(result.currentPlayer).toBe(Player.Two);
  });

  it('does not mutate the original state', () => {
    const state = createInitialState();
    const originalBoard = [...state.board];
    executeMove(state, 0);
    expect(state.board).toEqual(originalBoard);
  });
});

// ─── executeMove — Captures ──────────────────────────────────────────────────

describe('executeMove — captures', () => {
  it('captures when landing on opponent pit with 2-4 seeds (after drop)', () => {
    const board = emptyBoard();
    // Player One plays pit 2 with 6 seeds → lands on pit 8 (opponent)
    board[2] = 6;
    board[8] = 1; // After receiving 1 more = 2 → capturable
    board[10] = 5; // Ensure opponent has other seeds
    const state = makeState({ board });

    const result = executeMove(state, 2);
    // Pit 8 had 1 + 1 dropped = 2, which is capturable
    expect(result.board[8]).toBe(0);
    expect(result.scores[Player.One]).toBe(2);
  });

  it('does NOT capture when landing on own pit', () => {
    const board = emptyBoard();
    board[0] = 3; // Lands on pit 3 (own side)
    board[3] = 2; // After drop = 3, but it's own pit
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.board[3]).toBe(3); // Not captured
    expect(result.scores[Player.One]).toBe(0);
  });

  it('does NOT capture when landing with 5+ seeds', () => {
    const board = emptyBoard();
    board[5] = 3; // Lands on pit 8
    board[8] = 4; // After drop = 5 → NOT capturable (must be 2-4)
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 5);
    expect(result.board[8]).toBe(5);
    expect(result.scores[Player.One]).toBe(0);
  });

  it('captures chain of consecutive 2-4 pits backward', () => {
    const board = emptyBoard();
    // Set up a chain: pits 9, 10, 11 all have 1 seed
    // Player One sows from pit 2 with 9 seeds → lands on pit 11
    board[2] = 9;
    board[9] = 1;  // +1 = 2 ✓
    board[10] = 1; // +1 = 2 ✓
    board[11] = 1; // +1 = 2 (landing pit) ✓
    board[12] = 5; // Opponent keeps seeds
    const state = makeState({ board });

    const result = executeMove(state, 2);
    // Chain capture: 11 (landing), 10, 9 — all had 2 after drop
    expect(result.board[11]).toBe(0);
    expect(result.board[10]).toBe(0);
    expect(result.board[9]).toBe(0);
    expect(result.scores[Player.One]).toBe(6); // 2+2+2
  });

  it('does NOT capture opponent start pit (pit 7 for P1, pit 0 for P2)', () => {
    const board = emptyBoard();
    board[0] = 7; // Lands on pit 7 (opponent start)
    board[7] = 1; // After drop = 2 → normally capturable, but protected
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    // Pit 7 is opponent's start — no capture
    expect(result.board[7]).toBe(2);
    expect(result.scores[Player.One]).toBe(0);
  });
});

// ─── Protection Against Drying Out (anti-assèchement) ────────────────────────

describe('executeMove — drought protection', () => {
  it('captures chain of 6 pits when pit 7 has non-capturable count', () => {
    const board = emptyBoard();
    board[7] = 0;
    for (let i = 8; i < 14; i++) board[i] = 1;
    board[1] = 12;
    const state = makeState({ board });

    const result = executeMove(state, 1);
    expect(result.scores[Player.One]).toBe(12);
    expect(result.board[7]).toBe(1);
  });

  it('blocks grand slam when all 7 opponent pits have seeds', () => {
    const board = emptyBoard();
    for (let i = 7; i < 14; i++) board[i] = 1;
    board[0] = 13;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.scores[Player.One]).toBe(0);
    for (let i = 7; i < 14; i++) expect(result.board[i]).toBe(2);
  });
});

// ─── Desperate Auto-Capture ──────────────────────────────────────────────────

describe('executeMove — desperate auto-capture', () => {
  it('auto-captures last seed on last pit and triggers solidarity', () => {
    const board = emptyBoard();
    board[6] = 1; // Player One last pit, only seed
    board[10] = 5; // Opponent has seeds
    const state = makeState({ board });

    const result = executeMove(state, 6);
    expect(result.scores[Player.One]).toBe(1);
    expect(result.board[6]).toBe(0);
    expect(result.isSolidarityMode).toBe(true);
    expect(result.solidarityBeneficiary).toBe(Player.One);
  });
});

// ─── 14+ Seeds (Full Lap) ────────────────────────────────────────────────────

describe('executeMove — 14+ seeds distribution', () => {
  it('skips origin pit on full lap (14 seeds)', () => {
    const board = emptyBoard();
    board[0] = 14;
    // Give opponent seeds so game doesn't end
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    // 14 seeds: first 13 go around, then remaining goes to opponent
    // With 14 seeds, remainingAfter13 = 1, isAutoCapture = (1 % 7 === 1) = true
    // So last seed is auto-captured
    expect(result.scores[Player.One]).toBe(1);
  });

  it('auto-captures on 21 seeds (remainder 8, 8%7=1)', () => {
    const board = emptyBoard();
    board[0] = 21;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.scores[Player.One]).toBe(1);
  });
});

// ─── Win Condition ───────────────────────────────────────────────────────────

describe('Win condition', () => {
  it('declares winner when score exceeds 35', () => {
    const board = emptyBoard();
    // Set up for a capture that pushes P1 over 35
    board[5] = 2; // Lands on pit 7
    board[7] = 2; // After drop = 3 → capturable
    board[10] = 5;
    const state = makeState({
      board,
      scores: { [Player.One]: 34, [Player.Two]: 0 },
    });

    const result = executeMove(state, 5);
    // Capture 3 from pit 7... wait, pit 7 is opponent start, can't capture
    // Let me adjust: use pit 4 with 5 seeds → lands on pit 9
    const board2 = emptyBoard();
    board2[4] = 5; // lands on 5,6,7,8,9
    board2[9] = 1; // after drop = 2 → capturable
    board2[12] = 5;
    const state2 = makeState({
      board: board2,
      scores: { [Player.One]: 35, [Player.Two]: 0 },
    });

    const result2 = executeMove(state2, 4);
    expect(result2.scores[Player.One]).toBe(37);
    expect(result2.status).toBe(GameStatus.Finished);
    expect(result2.winner).toBe(Player.One);
  });

  it('declares Draw when both have equal scores at game end', () => {
    const board = emptyBoard();
    board[0] = 1; // P1 has only 1 seed, won't feed
    // No opponent seeds → game ends, P1 collects remaining
    const state = makeState({
      board,
      scores: { [Player.One]: 34, [Player.Two]: 35 },
    });

    const result = executeMove(state, 0);
    expect(result.status).toBe(GameStatus.Finished);
    // P1 gets 1 more → 35, P2 has 35 → Draw
    expect(result.scores[Player.One]).toBe(35);
    expect(result.scores[Player.Two]).toBe(35);
    expect(result.winner).toBe('Draw');
  });
});

// ─── Solidarity Feeding ──────────────────────────────────────────────────────

describe('Solidarity feeding', () => {
  it('ends game when opponent cannot be fed', () => {
    const board = emptyBoard();
    board[0] = 1; // Only 1 seed, lands on pit 1 — stays on own side
    // Opponent side completely empty → must feed but can't
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.status).toBe(GameStatus.Finished);
  });

  it('continues game when opponent is successfully fed', () => {
    const board = emptyBoard();
    board[5] = 3; // Lands on 6, 7, 8 — feeds opponent
    // Opponent side empty
    const state = makeState({ board });

    const result = executeMove(state, 5);
    expect(result.status).toBe(GameStatus.Playing);
    expect(result.isSolidarityMode).toBe(false);
  });
});

// ─── getValidMoves ───────────────────────────────────────────────────────────

describe('getValidMoves', () => {
  it('returns all 7 pits at game start for Player One', () => {
    const state = createInitialState();
    expect(getValidMoves(state)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('returns empty array when player has no seeds', () => {
    const board = emptyBoard();
    board[10] = 5; // Only opponent has seeds
    const state = makeState({ board });
    expect(getValidMoves(state)).toEqual([]);
  });

  it('filters out invalid moves under solidarity', () => {
    const board = emptyBoard();
    board[0] = 2; // Doesn't reach opponent (pits 1,2)
    board[5] = 3; // Reaches opponent (pits 6,7,8)
    // Opponent empty → solidarity enforced
    const state = makeState({ board });
    const moves = getValidMoves(state);
    expect(moves).toContain(5);
    expect(moves).not.toContain(0);
  });
});

// ─── A1/B1 Protection (Interdit #1) ────────────────────────────────────────

describe('Capture chain through start pits', () => {
  it('captures B1 (pit 7) when it is part of a capture chain', () => {
    const board = emptyBoard();
    board[4] = 4;
    board[7] = 1; // B1: becomes 2 after drop → capturable in chain
    board[8] = 1; // B2: becomes 2 → capturable
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 4);
    expect(result.board[8]).toBe(0);
    expect(result.board[7]).toBe(0);
    expect(result.scores[Player.One]).toBe(4);
  });

  it('captures A1 (pit 0) in a chain when P2 plays', () => {
    const board = emptyBoard();
    board[11] = 4;
    board[0] = 1;  // A1: becomes 2 → capturable in chain
    board[1] = 1;  // A2: becomes 2 → capturable
    board[5] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeMove(state, 11);
    expect(result.board[1]).toBe(0);
    expect(result.board[0]).toBe(0);
    expect(result.scores[Player.Two]).toBe(4);
  });

  it('allows capture of non-start pits normally', () => {
    const board = emptyBoard();
    board[3] = 6;
    board[9] = 1;
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 3);
    expect(result.board[9]).toBe(0);
    expect(result.scores[Player.One]).toBe(2);
  });
});

// ─── Yini (Case mère — 5 seeds = invulnerable) ─────────────────────────────

describe('Yini — 5-seed pit protection', () => {
  it('pit with 5 seeds is not captured', () => {
    const board = emptyBoard();
    board[2] = 7; // P1 plays, lands on pit 9
    board[9] = 4; // After drop = 5 → Yini, NOT capturable
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 2);
    expect(result.board[9]).toBe(5); // Yini: keeps seeds
    expect(result.scores[Player.One]).toBe(0);
  });

  it('Yini breaks a capture chain', () => {
    const board = emptyBoard();
    // Set up chain: pits 10(2), 11(5=Yini), 12(2)
    // P1 plays to land on pit 12
    board[5] = 7; // lands on 6,7,8,9,10,11,12
    board[10] = 1; // +1 = 2 ✓
    board[11] = 4; // +1 = 5 → Yini, blocks chain
    board[12] = 1; // +1 = 2, landing pit → capture starts here
    board[13] = 3;
    const state = makeState({ board });

    const result = executeMove(state, 5);
    // Only pit 12 captured (chain blocked at pit 11 by Yini)
    expect(result.board[12]).toBe(0);
    expect(result.board[11]).toBe(5); // Yini untouched
    expect(result.board[10]).toBe(2); // Beyond Yini, not reached
    expect(result.scores[Player.One]).toBe(2);
  });

  it('pit with 6+ seeds is also not captured', () => {
    const board = emptyBoard();
    board[3] = 6; // lands on pit 9
    board[9] = 6; // After drop = 7 → not capturable (>4)
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 3);
    expect(result.board[9]).toBe(7);
    expect(result.scores[Player.One]).toBe(0);
  });

  it('pit with exactly 1 seed is not captured (below 2)', () => {
    const board = emptyBoard();
    board[4] = 5; // lands on pit 9
    board[9] = 0; // After drop = 1 → not capturable (<2)
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 4);
    expect(result.board[9]).toBe(1);
    expect(result.scores[Player.One]).toBe(0);
  });
});

// ─── Olôa (Case vigile — 14 seeds) ────────────────────────────────────────

describe('Olôa — 14-seed pit auto-capture', () => {
  it('playing a pit with 14 seeds triggers auto-capture of 1', () => {
    const board = emptyBoard();
    board[0] = 14;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    // 14 seeds: 13 distributed, remainder=1, auto-capture
    expect(result.scores[Player.One]).toBe(1);
  });

  it('14 seeds does not trigger normal capture phase', () => {
    const board = emptyBoard();
    board[0] = 14;
    // Even if distribution lands near capturable pits, auto-capture ends the move
    board[8] = 1; // Would be 2 after drop, but no normal capture applies
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.scores[Player.One]).toBe(1); // Only auto-capture
  });
});

// ─── Akuru (Grande case — ≥19 seeds) ──────────────────────────────────────

describe('Akuru — large pit (≥19 seeds)', () => {
  it('19 seeds distributes correctly (no auto-capture, remainder=6)', () => {
    const board = emptyBoard();
    board[0] = 19;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    // 19-13 = 6, distributed to pits 7-12. Last on pit 12 (2 seeds) → capture chain
    // Chain: 12(2), 11(2), stops at 10 (7 seeds). Captured = 4
    expect(result.scores[Player.One]).toBe(4);
  });

  it('21 seeds triggers auto-capture (remainder=8, 8%7=1)', () => {
    const board = emptyBoard();
    board[0] = 21;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.scores[Player.One]).toBe(1);
  });

  it('28 seeds triggers auto-capture (remainder=15, 15%7=1)', () => {
    const board = emptyBoard();
    board[0] = 28;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.scores[Player.One]).toBe(1);
  });

  it('20 seeds: no auto-capture (remainder=7, 7%7=0)', () => {
    const board = emptyBoard();
    board[0] = 20;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    // 20-13=7, distributed to pits 7-13. Last on pit 13 (2 seeds) → capture
    // Chain: 13(2), 12(2), 11(2), stops at 10 (7 seeds). Captured = 6
    expect(result.scores[Player.One]).toBe(6);
  });
});

// ─── Regional Variant (Gabon 36 vs Cameroon 40) ───────────────────────────

describe('Regional variant — victory threshold', () => {
  it('getWinningScore returns 36 for gabon', () => {
    expect(getWinningScore('gabon')).toBe(36);
  });

  it('getWinningScore returns 40 for cameroon', () => {
    expect(getWinningScore('cameroon')).toBe(40);
  });

  it('getWinningScore defaults to 36', () => {
    expect(getWinningScore()).toBe(36);
  });

  it('Gabon: 36 seeds wins', () => {
    const board = emptyBoard();
    board[4] = 5;
    board[9] = 1; // becomes 2 → capture
    board[12] = 5;
    const state = makeState({
      board,
      scores: { [Player.One]: 34, [Player.Two]: 0 },
    });

    const result = executeMove(state, 4, 'gabon');
    expect(result.scores[Player.One]).toBe(36);
    expect(result.status).toBe(GameStatus.Finished);
    expect(result.winner).toBe(Player.One);
  });

  it('Cameroon: 36 seeds does NOT win', () => {
    const board = emptyBoard();
    board[4] = 5;
    board[9] = 1;
    board[12] = 5;
    const state = makeState({
      board,
      scores: { [Player.One]: 34, [Player.Two]: 0 },
    });

    const result = executeMove(state, 4, 'cameroon');
    expect(result.scores[Player.One]).toBe(36);
    expect(result.status).toBe(GameStatus.Playing);
  });

  it('Cameroon: 40 seeds wins', () => {
    const board = emptyBoard();
    board[3] = 5;
    board[8] = 3; // becomes 4 → capture of 4
    board[12] = 5;
    const state = makeState({
      board,
      scores: { [Player.One]: 36, [Player.Two]: 0 },
    });

    const result = executeMove(state, 3, 'cameroon');
    expect(result.scores[Player.One]).toBe(40);
    expect(result.status).toBe(GameStatus.Finished);
    expect(result.winner).toBe(Player.One);
  });

  it('Cameroon: draw at 35-35', () => {
    const board = emptyBoard();
    board[0] = 1;
    const state = makeState({
      board,
      scores: { [Player.One]: 34, [Player.Two]: 35 },
    });

    const result = executeMove(state, 0, 'cameroon');
    expect(result.status).toBe(GameStatus.Finished);
    expect(result.winner).toBe('Draw');
  });
});

// ─── Additional edge cases ──────────────────────────────────────────────────

describe('Edge cases — distribution', () => {
  it('distributes from Player Two pit correctly', () => {
    const board = emptyBoard();
    board[10] = 3;
    board[3] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeMove(state, 10);
    expect(result.board[10]).toBe(0);
    expect(result.board[11]).toBe(1);
    expect(result.board[12]).toBe(1);
    expect(result.board[13]).toBe(1);
  });

  it('empty pit after pickup stays at 0', () => {
    const board = emptyBoard();
    board[0] = 2;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.board[0]).toBe(0);
  });

  it('wraps from pit 13 to pit 0', () => {
    const board = emptyBoard();
    board[13] = 2;
    board[3] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    const result = executeMove(state, 13);
    expect(result.board[0]).toBe(1);
    expect(result.board[1]).toBe(1);
  });
});

describe('Edge cases — captures', () => {
  it('capture chain stops when pit has 0 seeds', () => {
    const board = emptyBoard();
    board[2] = 8; // lands on pit 10
    board[9] = 1;  // +1 = 2 ✓
    board[10] = 1; // +1 = 2 (landing) ✓
    board[8] = 0;  // 0 + 1 = 1 between 9 and 7 — but chain goes backward from 10
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 2);
    // Chain: 10(2), 9(2) — captured
    expect(result.board[10]).toBe(0);
    expect(result.board[9]).toBe(0);
    expect(result.scores[Player.One]).toBe(4);
  });

  it('no capture when landing on own side', () => {
    const board = emptyBoard();
    board[0] = 3; // lands on pit 3 (own)
    board[3] = 1; // becomes 2 but own side
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.board[3]).toBe(2);
    expect(result.scores[Player.One]).toBe(0);
  });

  it('capture of exactly 2 seeds', () => {
    const board = emptyBoard();
    board[5] = 4; // lands on pit 9
    board[9] = 1; // becomes 2
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 5);
    expect(result.board[9]).toBe(0);
    expect(result.scores[Player.One]).toBe(2);
  });

  it('capture of exactly 4 seeds', () => {
    const board = emptyBoard();
    board[5] = 4;
    board[9] = 3; // becomes 4
    board[12] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 5);
    expect(result.board[9]).toBe(0);
    expect(result.scores[Player.One]).toBe(4);
  });
});

describe('Edge cases — solidarity and stalemate', () => {
  it('solidarity mode resets after feeding', () => {
    const board = emptyBoard();
    board[6] = 1; // desperate auto-capture
    board[10] = 5;
    const state = makeState({ board });

    const afterDesperate = executeMove(state, 6);
    expect(afterDesperate.isSolidarityMode).toBe(true);

    // P2 must feed P1 now — P1 has 0 seeds
    // P2 plays pit 10 (5 seeds) → feeds P1 side
    const afterFeed = executeMove(afterDesperate, 10);
    expect(afterFeed.isSolidarityMode).toBe(false);
    expect(afterFeed.solidarityBeneficiary).toBeNull();
  });

  it('stalemate collects seeds to respective owners', () => {
    const board = emptyBoard();
    board[3] = 15;
    board[10] = 20;
    const state = makeState({ board });

    const result = resolveGameStalemate(state);
    expect(result.scores[Player.One]).toBe(15);
    expect(result.scores[Player.Two]).toBe(20);
    expect(result.board.every(v => v === 0)).toBe(true);
    expect(result.status).toBe(GameStatus.Finished);
  });

  it('stalemate with cameroon variant: 35 each = draw', () => {
    const board = emptyBoard();
    board[3] = 5;
    board[10] = 5;
    const state = makeState({
      board,
      scores: { [Player.One]: 30, [Player.Two]: 30 },
    });

    const result = resolveGameStalemate(state, 'cameroon');
    expect(result.scores[Player.One]).toBe(35);
    expect(result.scores[Player.Two]).toBe(35);
    expect(result.winner).toBe('Draw');
  });

  it('stalemate with gabon variant: 36 wins', () => {
    const board = emptyBoard();
    board[3] = 6;
    board[10] = 4;
    const state = makeState({
      board,
      scores: { [Player.One]: 30, [Player.Two]: 30 },
    });

    const result = resolveGameStalemate(state, 'gabon');
    expect(result.scores[Player.One]).toBe(36);
    expect(result.scores[Player.Two]).toBe(34);
    expect(result.winner).toBe(Player.One);
  });
});

describe('Edge cases — last pit rule', () => {
  it('rejects last pit with 2 seeds when player has other seeds', () => {
    const board = emptyBoard();
    board[3] = 5;
    board[6] = 1; // Last pit with 1 seed
    board[10] = 5;
    const state = makeState({ board });
    expect(isValidMove(state, 6).valid).toBe(false);
  });

  it('Player Two last pit (pit 13) with 1 seed rejected when others exist', () => {
    const board = emptyBoard();
    board[10] = 5;
    board[13] = 1;
    board[3] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });
    expect(isValidMove(state, 13).valid).toBe(false);
  });

  it('Player Two desperate auto-capture from pit 13', () => {
    const board = emptyBoard();
    board[13] = 1;
    board[3] = 5;
    const state = makeState({ board, currentPlayer: Player.Two });

    expect(isValidMove(state, 13).valid).toBe(true);
    const result = executeMove(state, 13);
    expect(result.scores[Player.Two]).toBe(1);
    expect(result.isSolidarityMode).toBe(true);
  });
});

describe('Edge cases — full lap distribution', () => {
  it('15 seeds: no auto-capture (remainder=2, 2%7=2)', () => {
    const board = emptyBoard();
    board[0] = 15;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    // 15-13=2, distributed to pits 7,8. Both become 2 → chain captures both
    expect(result.scores[Player.One]).toBe(4);
  });

  it('35 seeds: auto-capture (remainder=22, 22%7=1)', () => {
    const board = emptyBoard();
    board[0] = 35;
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 0);
    expect(result.scores[Player.One]).toBe(1);
  });

  it('full lap skips origin pit', () => {
    const board = emptyBoard();
    board[3] = 16; // remainder=3, distributed to opponent
    board[10] = 5;
    const state = makeState({ board });

    const result = executeMove(state, 3);
    // Origin pit should remain 0 (skipped during first 13, and not targeted in remainder)
    expect(result.board[3]).toBe(0);
  });
});

// ─── Stalemate ───────────────────────────────────────────────────────────────

describe('resolveGameStalemate', () => {
  it('distributes remaining seeds to their owners and ends game', () => {
    const board = emptyBoard();
    board[2] = 10;
    board[9] = 8;
    const state = makeState({ board });

    const result = resolveGameStalemate(state);
    expect(result.scores[Player.One]).toBe(10);
    expect(result.scores[Player.Two]).toBe(8);
    expect(result.board.every(v => v === 0)).toBe(true);
    expect(result.status).toBe(GameStatus.Finished);
  });
});

// ─── Pit ownership helpers ───────────────────────────────────────────────────

describe('Pit ownership and indices', () => {
  it('getPitOwner: pits 0-6 belong to Player One', () => {
    for (let i = 0; i < 7; i++) {
      expect(getPitOwner(i)).toBe(Player.One);
    }
  });

  it('getPitOwner: pits 7-13 belong to Player Two', () => {
    for (let i = 7; i < 14; i++) {
      expect(getPitOwner(i)).toBe(Player.Two);
    }
  });

  it('getPlayerIndices returns the correct slice for each player', () => {
    expect(getPlayerIndices(Player.One)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(getPlayerIndices(Player.Two)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it('getOpponentIndices is the symmetrical complement of getPlayerIndices', () => {
    expect(getOpponentIndices(Player.One)).toEqual(getPlayerIndices(Player.Two));
    expect(getOpponentIndices(Player.Two)).toEqual(getPlayerIndices(Player.One));
  });

  it('getWinningScore honours the regional variant flag', () => {
    expect(getWinningScore('gabon')).toBe(36);
    expect(getWinningScore('cameroon')).toBe(40);
  });

  it('createInitialState yields a fresh board: 5 seeds per pit, 0 scores, Player.One to move', () => {
    const fresh = createInitialState();
    expect(fresh.board).toHaveLength(14);
    expect(fresh.board.every(v => v === INITIAL_SEEDS)).toBe(true);
    expect(fresh.scores[Player.One]).toBe(0);
    expect(fresh.scores[Player.Two]).toBe(0);
    expect(fresh.currentPlayer).toBe(Player.One);
    expect(fresh.status).toBe(GameStatus.Playing);
  });
});
