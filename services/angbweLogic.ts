import { GameState, Player, GameStatus, AnimationStep } from '../types';

export const PITS_PER_PLAYER = 7;
export const TOTAL_PITS = 14;
export const INITIAL_SEEDS_ANGBWE = 4;

export const getPitOwner = (index: number): Player =>
  index < PITS_PER_PLAYER ? Player.One : Player.Two;

export const getPlayerIndices = (player: Player): number[] =>
  player === Player.One ? [0, 1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12, 13];

export function createInitialAngbweState(): GameState {
  const board = new Array(TOTAL_PITS).fill(INITIAL_SEEDS_ANGBWE);
  return {
    board,
    scores: { [Player.One]: 0, [Player.Two]: 0 },
    currentPlayer: Player.One,
    status: GameStatus.Playing,
    winner: null,
    message: 'Angbwé — Le perchoir. À vous de jouer !',
    isSolidarityMode: false,
    solidarityBeneficiary: null,
  };
}

export function isValidAngbweMove(
  state: GameState,
  pitIndex: number
): { valid: boolean; error?: string } {
  if (state.status !== GameStatus.Playing) {
    return { valid: false, error: 'La partie est terminée.' };
  }
  if (pitIndex < 0 || pitIndex >= TOTAL_PITS) {
    return { valid: false, error: 'Case invalide.' };
  }
  if (getPitOwner(pitIndex) !== state.currentPlayer) {
    return { valid: false, error: "Ce n'est pas votre case." };
  }
  if (state.board[pitIndex] === 0) {
    return { valid: false, error: 'Cette case est vide.' };
  }
  return { valid: true };
}

export function executeAngbweMove(currentState: GameState, pitIndex: number): GameState {
  const state: GameState = {
    ...currentState,
    board: [...currentState.board],
    scores: { ...currentState.scores },
  };
  const { board, scores } = state;
  const currentPlayer = state.currentPlayer;

  let seeds = board[pitIndex];
  board[pitIndex] = 0;
  let currentIdx = pitIndex;

  // Relay sowing loop
  while (true) {
    // Distribute seeds one by one
    while (seeds > 0) {
      currentIdx = (currentIdx + 1) % TOTAL_PITS;
      board[currentIdx]++;
      seeds--;

      // Capture: pit reaches exactly 4 after drop
      if (board[currentIdx] === 4) {
        scores[currentPlayer] += 4;
        board[currentIdx] = 0;
      }
    }

    // Check relay condition: was the pit non-empty BEFORE the drop?
    // After drop: board[currentIdx] is the current count.
    // If it's 0, either it was captured (had 3→4→captured) or was empty before drop (had 0→1... no, 0+1=1 not 0).
    // Actually: if board[currentIdx] === 0, the pit was captured (3→4→0). Turn ends (empty pit).
    // If board[currentIdx] === 1, the pit was empty before (0→1). Turn ends (landed in empty pit).
    // If board[currentIdx] > 1, the pit was non-empty. Relay: pick up and continue.
    if (board[currentIdx] <= 1) {
      break; // Turn ends
    }

    // Relay: pick up all seeds from this pit and continue
    seeds = board[currentIdx];
    board[currentIdx] = 0;
  }

  // Switch player
  const nextPlayer = currentPlayer === Player.One ? Player.Two : Player.One;
  const nextPlayerIndices = getPlayerIndices(nextPlayer);
  const nextPlayerSeeds = nextPlayerIndices.reduce((sum, idx) => sum + board[idx], 0);

  if (nextPlayerSeeds === 0) {
    // Next player can't move — collect remaining seeds
    const myIndices = getPlayerIndices(currentPlayer);
    myIndices.forEach(idx => {
      scores[currentPlayer] += board[idx];
      board[idx] = 0;
    });

    state.status = GameStatus.Finished;
    if (scores[Player.One] > scores[Player.Two]) {
      state.winner = Player.One;
      state.message = 'Le Joueur 1 remporte la partie !';
    } else if (scores[Player.Two] > scores[Player.One]) {
      state.winner = Player.Two;
      state.message = 'Le Joueur 2 remporte la partie !';
    } else {
      state.winner = 'Draw';
      state.message = 'Asalan — Match nul !';
    }
    return state;
  }

  state.currentPlayer = nextPlayer;
  state.message = `Au tour du Joueur ${nextPlayer === Player.One ? '1' : '2'}.`;
  return state;
}

export function getAngbweMoveSteps(initialState: GameState, pitIndex: number): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const board = [...initialState.board];
  const currentPlayer = initialState.currentPlayer;

  let seeds = board[pitIndex];
  board[pitIndex] = 0;
  let currentIdx = pitIndex;

  steps.push({
    type: 'PICKUP',
    pitIndex,
    seedsInHand: seeds,
    boardState: [...board],
  });

  while (true) {
    while (seeds > 0) {
      currentIdx = (currentIdx + 1) % TOTAL_PITS;
      board[currentIdx]++;
      seeds--;

      steps.push({
        type: 'DROP',
        pitIndex: currentIdx,
        seedsInHand: seeds,
        boardState: [...board],
      });

      if (board[currentIdx] === 4) {
        steps.push({
          type: 'CAPTURE_PHASE',
          pitIndex: currentIdx,
          capturedAmount: 4,
          description: 'Adzi ! 4 pierres capturées.',
        });
        board[currentIdx] = 0;
        steps.push({
          type: 'SCORE',
          pitIndex: currentIdx,
          boardState: [...board],
          capturedAmount: 4,
        });
      }
    }

    if (board[currentIdx] <= 1) {
      break;
    }

    // Relay pickup
    seeds = board[currentIdx];
    board[currentIdx] = 0;
    steps.push({
      type: 'PICKUP',
      pitIndex: currentIdx,
      seedsInHand: seeds,
      boardState: [...board],
      description: 'Relais !',
    });
  }

  return steps;
}
