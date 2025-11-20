import { GameState, Player, GameStatus } from '../types';
import { executeMove, getValidMoves } from './songoLogic';

// Heuristic evaluation of the board
const evaluateState = (state: GameState, maximizingPlayer: Player): number => {
  const opponent = maximizingPlayer === Player.One ? Player.Two : Player.One;

  // Win/Loss check
  if (state.status === GameStatus.Finished) {
    if (state.winner === maximizingPlayer) return 1000000;
    if (state.winner === opponent) return -1000000;
    return 0; // Draw
  }

  // Score Difference
  const scoreDiff = (state.scores[maximizingPlayer] - state.scores[opponent]) * 1000;
  
  // Positional Strategy (Bonus for keeping own side defensible or threatening)
  // This is a lightweight heuristic to differentiate equal score states
  // We want to avoid having many empty pits (vulnerability) or efficient distribution
  // (This is minor compared to score)
  
  return scoreDiff;
};

// Helper to order moves at the root to improve alpha-beta pruning efficiency
const getOrderedMoves = (state: GameState, moves: number[]): number[] => {
    return moves.map(move => {
        const nextState = executeMove(state, move);
        let weight = nextState.scores[state.currentPlayer] - state.scores[state.currentPlayer];
        if (nextState.status === GameStatus.Finished && nextState.winner === state.currentPlayer) {
            weight += 100000;
        }
        return { move, weight };
    })
    .sort((a, b) => b.weight - a.weight)
    .map(item => item.move);
};

let deadline = 0;
const TIME_LIMIT_MS = 500; // Max time allocated for AI thinking

// Public entry point: Iterative Deepening Search
export const getBestMoveIterative = (state: GameState, maxDepthConfig: number = 5): number => {
  const moves = getValidMoves(state);
  if (moves.length === 0) return -1;
  if (moves.length === 1) return moves[0]; // Only one move, take it

  deadline = performance.now() + TIME_LIMIT_MS;
  
  let bestMove = moves[0];
  let currentMaxDepth = 1;
  
  // Only order moves once at the very beginning
  const orderedMoves = getOrderedMoves(state, moves);

  // Iterative Deepening Loop
  while (currentMaxDepth <= maxDepthConfig) {
      try {
          const { move, score } = minimaxRoot(state, orderedMoves, currentMaxDepth);
          
          // If we finished the search without timing out, update best move
          bestMove = move;
          
          // If we found a winning mate, stop searching deeper
          if (score > 900000) break;
          
      } catch (e) {
          // Timeout occurred, break loop and return best move found so far
          break; 
      }

      // If we are running low on time, don't start next depth
      if (performance.now() > deadline - 50) break; 

      currentMaxDepth++;
  }
  
  return bestMove;
};

// Root level minimax to handle the move selection
const minimaxRoot = (state: GameState, moves: number[], depth: number): { move: number, score: number } => {
    let bestMove = moves[0];
    let maxEval = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
        const nextState = executeMove(state, move);
        
        // Check turn logic
        const nextIsMaximizing = nextState.currentPlayer === state.currentPlayer;
        
        const evaluation = minimax(nextState, depth - 1, alpha, beta, nextIsMaximizing, state.currentPlayer);

        if (evaluation > maxEval) {
            maxEval = evaluation;
            bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
    }
    return { move: bestMove, score: maxEval };
};


const minimax = (
  state: GameState, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean,
  rootPlayer: Player
): number => {
  // Timeout Check - throws to abort the entire deepening level
  if ((depth % 2 === 0) && performance.now() > deadline) { // Check every few steps
      throw new Error("Timeout");
  }

  if (depth === 0 || state.status === GameStatus.Finished) {
    return evaluateState(state, rootPlayer);
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) {
      return evaluateState(state, rootPlayer);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = executeMove(state, move);
      const nextIsMaximizing = nextState.currentPlayer === rootPlayer;
      
      const evalScore = minimax(nextState, depth - 1, alpha, beta, nextIsMaximizing, rootPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nextState = executeMove(state, move);
      const nextIsMaximizing = nextState.currentPlayer === rootPlayer;

      const evalScore = minimax(nextState, depth - 1, alpha, beta, nextIsMaximizing, rootPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};