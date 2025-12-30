import { GameState, Player, GameStatus, AnimationStep } from '../types';

export const PITS_PER_PLAYER = 7;
export const TOTAL_PITS = 14;
export const INITIAL_SEEDS = 5; // Standard Songo often starts with 35 each (5 per pit)
export const WINNING_SCORE = 36; // > 35 to win

// Helper to get pit owner
export const getPitOwner = (index: number): Player => {
  return index >= 0 && index < 7 ? Player.One : Player.Two;
};

// Get the indices belonging to a player
export const getPlayerIndices = (player: Player): number[] => {
  return player === Player.One ? [0, 1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12, 13];
};

// Get the opponent's indices
export const getOpponentIndices = (player: Player): number[] => {
  return player === Player.One ? [7, 8, 9, 10, 11, 12, 13] : [0, 1, 2, 3, 4, 5, 6];
};

export const createInitialState = (status: GameStatus = GameStatus.Playing): GameState => {
  return {
    board: Array(TOTAL_PITS).fill(INITIAL_SEEDS),
    scores: {
      [Player.One]: 0,
      [Player.Two]: 0,
    },
    currentPlayer: Player.One,
    status: status,
    winner: null,
    message: "Nouvelle partie ! Au tour du Joueur 1.",
    isSolidarityMode: false,
    solidarityBeneficiary: null,
  };
};

// Helper to get all valid moves for the current player
export const getValidMoves = (state: GameState): number[] => {
  const indices = getPlayerIndices(state.currentPlayer);
  return indices.filter(idx => isValidMove(state, idx).valid);
};

// Check if a move is valid based on "Interdits"
export const isValidMove = (state: GameState, pitIndex: number): { valid: boolean; reason?: string } => {
  const { board, currentPlayer, isSolidarityMode, solidarityBeneficiary } = state;
  const owner = getPitOwner(pitIndex);

  if (owner !== currentPlayer) return { valid: false, reason: "Ce n'est pas votre case." };

  const seeds = board[pitIndex];
  if (seeds === 0) return { valid: false, reason: "La case est vide." };

  // --- Solidarity Logic Check (The Feeder) ---
  // We enforce feeding if:
  // 1. The game is explicitly in 'Solidarity Mode' (triggered by Desperate Capture).
  // 2. OR implicitly, if the opponent has 0 seeds currently (e.g. manual simulation setup).

  const opponent = currentPlayer === Player.One ? Player.Two : Player.One;
  const opponentIndices = getOpponentIndices(currentPlayer);
  const opponentSeeds = opponentIndices.reduce((sum, idx) => sum + board[idx], 0);

  const enforceFeeding = (isSolidarityMode && solidarityBeneficiary !== null) || opponentSeeds === 0;

  if (enforceFeeding) {
    // The player MUST play a move that feeds the opponent.
    // Determine target indices (opponent's side)
    let targetIndices = opponentIndices;
    if (isSolidarityMode && solidarityBeneficiary !== null) {
      targetIndices = getPlayerIndices(solidarityBeneficiary);
    }

    // Check if the *current* move feeds
    let moveFeeds = false;

    if (seeds >= 14) {
      moveFeeds = true; // 14+ always goes everywhere
    } else {
      for (let i = 1; i <= seeds; i++) {
        const target = (pitIndex + i) % TOTAL_PITS;
        if (targetIndices.includes(target)) {
          moveFeeds = true;
          break;
        }
      }
    }

    // If this specific move doesn't feed, we need to check if ANY other move *could* have fed.
    // If no move exists that can feed, then we are allowed to play whatever (starvation unavoidable).
    // If a feeding move DOES exist, then playing a non-feeding move is INVALID.
    if (!moveFeeds) {
      const myIndices = getPlayerIndices(currentPlayer);
      let existsFeedingMove = false;

      for (const idx of myIndices) {
        if (board[idx] > 0) {
          let seedsInPit = board[idx];
          // Optimization: if seeds >= 14 it feeds.
          if (seedsInPit >= 14) {
            existsFeedingMove = true;
            break;
          }
          for (let i = 1; i <= seedsInPit; i++) {
            const target = (idx + i) % TOTAL_PITS;
            if (targetIndices.includes(target)) {
              existsFeedingMove = true;
              break;
            }
          }
        }
        if (existsFeedingMove) break;
      }

      // If I *can* feed with another move, this move (which doesn't feed) is invalid.
      if (existsFeedingMove) {
        return { valid: false, reason: "Règle de solidarité : Vous devez nourrir l'adversaire si possible." };
      }
      // If I cannot feed with ANY move, then I'm allowed to play this move (game will likely end soon).
    }
  }

  // Desperate Case Exception Check
  const myIndices = getPlayerIndices(currentPlayer);
  const totalSeeds = myIndices.reduce((sum, idx) => sum + board[idx], 0);

  // Specific MPEM Rule: Last Pit Restriction (A6 or B13)
  // Standard rule: Can't play 1 seed from last pit unless it captures (impossible with 1).
  // EXCEPTION: If it's the absolute last seed remaining (Desperate Auto-capture), it IS allowed.
  const isLastPit = (currentPlayer === Player.One && pitIndex === 6) || (currentPlayer === Player.Two && pitIndex === 13);

  if (isLastPit && seeds === 1) {
    if (totalSeeds === 1) {
      // Allowed: This triggers the auto-capture solidarity rule
      return { valid: true };
    } else {
      // Forbidden: You have other seeds elsewhere, you cannot play the last pit with 1 seed.
      return { valid: false, reason: "Interdit de jouer la dernière case avec 1 pierre (sauf si c'est votre unique pierre)." };
    }
  }

  return { valid: true };
};

/**
 * Generates a sequence of visual steps to animate the move.
 */
export const getMoveSteps = (initialState: GameState, pitIndex: number): AnimationStep[] => {
  const steps: AnimationStep[] = [];

  // Clone board to simulate locally
  const board = [...initialState.board];
  const currentPlayer = initialState.currentPlayer;

  let seeds = board[pitIndex];
  board[pitIndex] = 0; // Pick up

  // Step 1: Pickup
  steps.push({
    type: 'PICKUP',
    pitIndex: pitIndex,
    seedsInHand: seeds,
    boardState: [...board],
    description: 'Ramassage'
  });

  // --- Check for Desperate Auto-Capture (Total seeds = 1 AND Last Pit) ---
  const playerIndices = getPlayerIndices(currentPlayer);
  const totalSeedsOnSide = playerIndices.reduce((sum: number, idx: number) => sum + initialState.board[idx], 0);
  const isLastPit = (currentPlayer === Player.One && pitIndex === 6) || (currentPlayer === Player.Two && pitIndex === 13);

  if (totalSeedsOnSide === 1 && isLastPit) {
    // Special animation for desperate capture
    steps.push({
      type: 'SCORE',
      capturedAmount: 1,
      description: 'Dernière graine : Auto-capture & Solidarité !'
    });
    return steps;
  }

  // --- Normal Distribution Logic ---
  let currentIdx = pitIndex;

  if (seeds >= 14) {
    const remainingAfter13 = seeds - 13;
    const isAutoCapture = remainingAfter13 % 7 === 1; // 14, 21, 28... logic fixed to modulo 7

    // First 13 seeds (Lap 1 + part of opponent)
    for (let i = 0; i < 13; i++) {
      currentIdx = (currentIdx + 1) % TOTAL_PITS;
      board[currentIdx]++;
      seeds--;

      steps.push({
        type: 'DROP',
        pitIndex: currentIdx,
        seedsInHand: seeds,
        boardState: [...board]
      });
    }

    // Visual step to show we are skipping start and going to opponent
    const opponentIndices = getOpponentIndices(currentPlayer);
    steps.push({
      type: 'MOVE',
      pitIndex: opponentIndices[0],
      seedsInHand: seeds,
      description: 'Saut de la case de départ...'
    });

    if (isAutoCapture) {
      // We distribute everything EXCEPT the last one
      const seedsToDistribute = seeds - 1;
      let opIdxPointer = 0;

      for (let k = 0; k < seedsToDistribute; k++) {
        const targetIndex = opponentIndices[opIdxPointer];
        board[targetIndex]++;
        currentIdx = targetIndex;

        seeds--;
        opIdxPointer = (opIdxPointer + 1) % 7;

        steps.push({
          type: 'DROP',
          pitIndex: targetIndex,
          seedsInHand: seeds,
          boardState: [...board]
        });
      }

      // The last seed is auto-captured
      steps.push({
        type: 'SCORE',
        capturedAmount: 1,
        description: 'Auto-capture (Tour complet)'
      });
      return steps;

    } else {
      // Standard distribution in opponent camp until exhaustion
      let opIdxPointer = 0;

      while (seeds > 0) {
        const targetIndex = opponentIndices[opIdxPointer];
        board[targetIndex]++;
        currentIdx = targetIndex;

        seeds--;

        steps.push({
          type: 'DROP',
          pitIndex: targetIndex,
          seedsInHand: seeds,
          boardState: [...board]
        });

        opIdxPointer = (opIdxPointer + 1) % 7;
      }
    }
  } else {
    // Standard distribution (< 14)
    while (seeds > 0) {
      currentIdx = (currentIdx + 1) % TOTAL_PITS;
      board[currentIdx]++;
      seeds--;

      steps.push({
        type: 'DROP',
        pitIndex: currentIdx,
        seedsInHand: seeds,
        boardState: [...board]
      });
    }
  }

  // --- Capture Logic (La Prise) ---
  const ownerOfLastPit = getPitOwner(currentIdx);

  if (ownerOfLastPit !== currentPlayer && board[currentIdx] >= 2 && board[currentIdx] <= 4) {
    const isOpponentStart = (currentPlayer === Player.One && currentIdx === 7) || (currentPlayer === Player.Two && currentIdx === 0);

    if (!isOpponentStart) {
      let captureQueue: number[] = [];
      let checkIdx = currentIdx;

      while (true) {
        if (getPitOwner(checkIdx) === currentPlayer) break;

        const count = board[checkIdx];
        if (count >= 2 && count <= 4) {
          captureQueue.push(checkIdx);
        } else {
          break;
        }
        checkIdx = (checkIdx - 1 + TOTAL_PITS) % TOTAL_PITS;
      }

      const opponentIndices = getOpponentIndices(currentPlayer);
      const opponentPitsWithSeeds = opponentIndices.filter((idx: number) => board[idx] > 0);
      const opponentHas7Full = opponentPitsWithSeeds.length === 7;
      const capturingAll7 = captureQueue.length === 7;
      const isProtected = opponentHas7Full && capturingAll7;

      if (!isProtected && captureQueue.length > 0) {
        let totalCaptured = 0;

        // Visualize capture
        steps.push({
          type: 'CAPTURE_PHASE',
          description: 'Prise !'
        });

        captureQueue.forEach(idx => {
          const amount = board[idx];
          totalCaptured += amount;
          board[idx] = 0;

          // We show the hand moving to pick up captured seeds
          steps.push({
            type: 'MOVE',
            pitIndex: idx,
            seedsInHand: 0, // purely visual here
          });

          // Then "sucking" them up
          steps.push({
            type: 'PICKUP', // Reuse pickup for visual effect of clearing pit
            pitIndex: idx,
            seedsInHand: totalCaptured,
            boardState: [...board]
          });
        });

        steps.push({
          type: 'SCORE',
          capturedAmount: totalCaptured
        });
      }
    }
  }

  return steps;
};


// The Core Move Logic (Calculates final state directly)
export const executeMove = (currentState: GameState, pitIndex: number): GameState => {
  // Performance Optimization: Use spread instead of JSON.parse/stringify for AI speed
  const state: GameState = {
    ...currentState,
    board: [...currentState.board],
    scores: { ...currentState.scores }
  };

  const { board, scores, currentPlayer } = state;

  // Calculate total seeds BEFORE picking up to detect "Desperate" scenario
  const playerIndices = getPlayerIndices(currentPlayer);
  const totalSeedsOnSide = playerIndices.reduce((sum: number, idx: number) => sum + board[idx], 0);
  const isLastPit = (currentPlayer === Player.One && pitIndex === 6) || (currentPlayer === Player.Two && pitIndex === 13);

  let seeds = board[pitIndex];
  board[pitIndex] = 0; // Pick up seeds

  // --- Check for Desperate Auto-Capture (TOTAL seeds = 1 AND Last Pit) ---
  // If this was the ONLY seed the player had AND it was in the last pit, they eat it and trigger solidarity.
  if (totalSeedsOnSide === 1 && isLastPit) {
    state.scores[currentPlayer] += 1;
    state.message = "Dernière graine auto-capturée ! Solidarité requise.";
    state.isSolidarityMode = true;
    state.solidarityBeneficiary = currentPlayer;

    state.currentPlayer = currentPlayer === Player.One ? Player.Two : Player.One;
    return checkWinCondition(state);
  }

  // --- Normal Distribution Logic ---
  let currentIdx = pitIndex;

  if (seeds >= 14) {
    const remainingAfter13 = seeds - 13;
    const isAutoCapture = remainingAfter13 % 7 === 1;

    for (let i = 0; i < 13; i++) {
      currentIdx = (currentIdx + 1) % TOTAL_PITS;
      board[currentIdx]++;
      seeds--;
    }

    if (isAutoCapture) {
      // Distribute the rest EXCEPT the last one
      const seedsToDistribute = seeds - 1;
      const opponentIndices = getOpponentIndices(currentPlayer);
      let opIdxPointer = 0;

      for (let k = 0; k < seedsToDistribute; k++) {
        const targetIndex = opponentIndices[opIdxPointer];
        board[targetIndex]++;
        currentIdx = targetIndex;
        opIdxPointer = (opIdxPointer + 1) % 7;
      }

      scores[currentPlayer] += 1; // Capture the last seed
      board[pitIndex] = 0; // Ensure start pit is 0 (it was skipped)
      state.message = `Tour complet avec ${seeds + 13} pierres : Auto-capture !`;

    } else {
      // Standard behavior: Distribute until exhausted in opponent side
      const opponentIndices = getOpponentIndices(currentPlayer);
      let opIdxPointer = 0;

      while (seeds > 0) {
        const targetIndex = opponentIndices[opIdxPointer];
        board[targetIndex]++;
        currentIdx = targetIndex;

        opIdxPointer = (opIdxPointer + 1) % 7;
        seeds--;
      }
    }
  } else {
    while (seeds > 0) {
      currentIdx = (currentIdx + 1) % TOTAL_PITS;
      board[currentIdx]++;
      seeds--;
    }
  }

  // --- Capture Logic (La Prise) ---
  const remainingAfter13Check = (currentState.board[pitIndex] - 13);
  const wasAutoCapture = currentState.board[pitIndex] >= 14 && (remainingAfter13Check % 7 === 1);

  if (!wasAutoCapture) {
    const ownerOfLastPit = getPitOwner(currentIdx);

    if (ownerOfLastPit !== currentPlayer && board[currentIdx] >= 2 && board[currentIdx] <= 4) {
      const isOpponentStart = (currentPlayer === Player.One && currentIdx === 7) || (currentPlayer === Player.Two && currentIdx === 0);

      if (!isOpponentStart) {
        let captureQueue: number[] = [];
        let checkIdx = currentIdx;

        while (true) {
          if (getPitOwner(checkIdx) === currentPlayer) break;

          const count = board[checkIdx];
          if (count >= 2 && count <= 4) {
            captureQueue.push(checkIdx);
          } else {
            break;
          }

          checkIdx = (checkIdx - 1 + TOTAL_PITS) % TOTAL_PITS;
        }

        const opponentIndices = getOpponentIndices(currentPlayer);
        const opponentPitsWithSeeds = opponentIndices.filter((idx: number) => board[idx] > 0);
        const opponentHas7Full = opponentPitsWithSeeds.length === 7;
        const capturingAll7 = captureQueue.length === 7;

        const isProtected = opponentHas7Full && capturingAll7;

        if (!isProtected) {
          let capturedAmount = 0;
          captureQueue.forEach(idx => {
            capturedAmount += board[idx];
            board[idx] = 0;
          });
          scores[currentPlayer] += capturedAmount;
          state.message = `Prise ! ${capturedAmount} pierres capturées.`;
        } else {
          state.message = "Coup joué. Prise annulée (Protection contre l'assèchement).";
        }
      }
    }
  }

  // --- End Turn Logic ---

  // Determine if we need to verify "Solidarity" feeding fulfillment.
  const opponent = currentPlayer === Player.One ? Player.Two : Player.One;
  const opponentIndices = getPlayerIndices(opponent);
  const opponentSeedsBeforeMove = opponentIndices.reduce((sum, idx) => sum + currentState.board[idx], 0);

  // If opponent was starving (0 seeds), did we feed them?
  if (state.isSolidarityMode || (opponentSeedsBeforeMove === 0 && currentState.board[pitIndex] > 0)) {
    const fed = opponentIndices.some((idx: number) => board[idx] > 0);

    if (fed) {
      state.isSolidarityMode = false;
      state.solidarityBeneficiary = null;
      state.message = "Solidarité respectée. La partie continue.";
    } else {
      // Opponent is still empty.
      // This implies no feeding move was possible, as it would have been enforced by isValidMove.
      // The game ends, and the current player captures all remaining seeds.
      const myIndices = getPlayerIndices(currentPlayer);
      let remaining = 0;
      myIndices.forEach((idx: number) => {
        remaining += board[idx];
        board[idx] = 0;
      });
      scores[currentPlayer] += remaining;
      state.message = "Impossible de nourrir l'adversaire. Fin de partie.";
      return checkWinCondition(state, true); // Force end
    }
  }

  // --- CRITICAL FIX: Check if NEXT player can play BEFORE switching turns ---
  const nextPlayer = currentPlayer === Player.One ? Player.Two : Player.One;
  const nextPlayerIndices = getPlayerIndices(nextPlayer);

  // First: Check if next player has ANY seeds at all
  const nextPlayerSeeds = nextPlayerIndices.reduce((sum, idx) => sum + board[idx], 0);

  if (nextPlayerSeeds === 0) {
    // Next player has NO seeds - game MUST end
    // Current player collects all their remaining seeds
    const myIndices = getPlayerIndices(currentPlayer);
    let remaining = 0;
    myIndices.forEach((idx: number) => {
      remaining += board[idx];
      board[idx] = 0;
    });
    scores[currentPlayer] += remaining;
    state.message = "L'adversaire n'a plus de graines. Fin de partie.";
    return checkWinCondition(state, true); // Force end
  }

  // Second: Check if next player has any VALID moves
  const nextPlayerHasMoves = nextPlayerIndices.some(idx => isValidMove({ ...state, currentPlayer: nextPlayer }, idx).valid);

  if (!nextPlayerHasMoves) {
    // Next player has seeds but no valid moves (forbidden by rules)
    // This is a stalemate - collect remaining seeds for owners
    return resolveGameStalemate(state);
  }

  state.currentPlayer = nextPlayer;
  return checkWinCondition(state);
};

// Helper to resolve stalemate (No valid moves available for current player)
export const resolveGameStalemate = (state: GameState): GameState => {
  const newState: GameState = {
    ...state,
    board: [...state.board],
    scores: { ...state.scores }
  };
  const { scores, board } = newState;

  // Collect remaining seeds for respective owners
  for (let i = 0; i < TOTAL_PITS; i++) {
    if (board[i] > 0) {
      const owner = getPitOwner(i);
      scores[owner] += board[i];
      board[i] = 0;
    }
  }

  newState.status = GameStatus.Finished;
  if (scores[Player.One] > 35) newState.winner = Player.One;
  else if (scores[Player.Two] > 35) newState.winner = Player.Two;
  else newState.winner = 'Draw';

  newState.message = "Plus de coups possibles. Fin de partie (Pat).";
  return newState;
};

// Check for Game Over
function checkWinCondition(state: GameState, forceEnd: boolean = false): GameState {
  const { scores, board } = state;

  if (scores[Player.One] > WINNING_SCORE) {
    state.status = GameStatus.Finished;
    state.winner = Player.One;
    state.message = "Le Joueur 1 a gagné par score !";
    return state;
  }
  if (scores[Player.Two] > WINNING_SCORE) {
    state.status = GameStatus.Finished;
    state.winner = Player.Two;
    state.message = "Le Joueur 2 a gagné par score !";
    return state;
  }

  if (forceEnd) {
    state.status = GameStatus.Finished;
    state.winner = scores[Player.One] > scores[Player.Two] ? Player.One : (scores[Player.Two] > scores[Player.One] ? Player.Two : 'Draw');
    return state;
  }

  const currentIndices = getPlayerIndices(state.currentPlayer);
  // Vérifier si le joueur a des coups VALIDES (pas juste des graines)
  const canPlay = currentIndices.some((idx: number) => isValidMove(state, idx).valid);

  if (!canPlay) {
    // Game Over: Collect remaining seeds for respective owners
    for (let i = 0; i < TOTAL_PITS; i++) {
      if (board[i] > 0) {
        const owner = getPitOwner(i);
        scores[owner] += board[i];
        board[i] = 0;
      }
    }

    state.status = GameStatus.Finished;
    if (scores[Player.One] > 35) state.winner = Player.One;
    else if (scores[Player.Two] > 35) state.winner = Player.Two;
    else state.winner = 'Draw';

    state.message = "Plus de coups possibles. Fin de partie.";
  }

  return state;
}