import { GameState } from '../types';
import { FastGameState, fastExecuteMove, getFastValidMoves, fastEvaluate } from './fastSongo';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_TT_SIZE = 2000000; // 2M entries ~ 40-50MB RAM
const KILLER_MOVE_COUNT = 2;

// ============================================================================
// TRANSPOSITION TABLE
// ============================================================================

interface TTEntry {
    hash: number;
    depth: number;
    score: number;
    flag: 0 | 1 | 2; // 0=EXACT, 1=ALPHA, 2=BETA
    bestMove?: number;
}

class FastTranspositionTable {
    private table: Map<number, TTEntry>;
    public hits: number = 0;

    constructor() {
        this.table = new Map();
    }

    store(hash: number, depth: number, score: number, flag: 0 | 1 | 2, bestMove?: number) {
        if (this.table.size >= MAX_TT_SIZE) {
            this.table.clear();
        }
        this.table.set(hash, { hash, depth, score, flag, bestMove });
    }

    probe(hash: number): TTEntry | undefined {
        return this.table.get(hash);
    }

    clear() {
        this.table.clear();
        this.hits = 0;
    }
}

const tt = new FastTranspositionTable();

// ============================================================================
// ZOBRIST HASHING
// ============================================================================

const zobristTable = new Int32Array(14 * 60); // 14 pits * 60 seeds cap
const zobristPlayer = new Int32Array(2);

function initZobrist() {
    if (zobristPlayer[0] !== 0) return;

    let seed = 123456789;
    const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed;
    };

    for (let i = 0; i < zobristTable.length; i++) zobristTable[i] = rand();
    zobristPlayer[0] = rand();
    zobristPlayer[1] = rand();
}

function getZobristHash(state: FastGameState): number {
    let h = 0;
    for (let i = 0; i < 14; i++) {
        const seeds = state.data[i];
        if (seeds > 0) {
            const s = seeds >= 60 ? 59 : seeds;
            h ^= zobristTable[i * 60 + s];
        }
    }
    h ^= zobristPlayer[state.data[16]]; // currentPlayer
    return h;
}

// ============================================================================
// MOVE ORDERING
// ============================================================================

const killerMoves: number[][] = [];
const moveHistory = new Int32Array(14); // Simply 1D history for Songo pits 0-13

function addKillerMove(depth: number, move: number) {
    if (!killerMoves[depth]) killerMoves[depth] = [];
    if (!killerMoves[depth].includes(move)) {
        killerMoves[depth].unshift(move);
        if (killerMoves[depth].length > KILLER_MOVE_COUNT) killerMoves[depth].pop();
    }
}

function orderMoves(state: FastGameState, moves: Uint8Array, depth: number, ttMove?: number): number[] {
    const scoredMoves = [];
    for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        let score = 0;

        if (m === ttMove) score += 1000000;
        if (killerMoves[depth]?.includes(m)) score += 1000;
        score += moveHistory[m];

        // Capture Heuristic (Simulated simply)
        // If I play here, does it end in a capture spot? Expensive to check properly.
        // Just use history/TT for now.

        scoredMoves.push({ m, score });
    }

    return scoredMoves.sort((a, b) => b.score - a.score).map(x => x.m);
}

// ============================================================================
// MINIMAX ENGINE
// ============================================================================

let nodesEvaluated = 0;
let deadline = 0;

function minimax(
    state: FastGameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: number // 0 or 1
): number {
    nodesEvaluated++;

    // Time check every 2048 nodes
    if ((nodesEvaluated & 2047) === 0) {
        if (performance.now() > deadline) throw "TIMEOUT";
    }

    const hash = getZobristHash(state);
    const ttEntry = tt.probe(hash);

    if (ttEntry && ttEntry.depth >= depth) {
        tt.hits++;
        if (ttEntry.flag === 0) return ttEntry.score;
        if (ttEntry.flag === 1 && ttEntry.score <= alpha) return alpha;
        // Logic fix: ALPHA flag means "At most score" (upper bound)? No.
        // Standard: 
        // EXACT (0): score is exact.
        // ALPHA (1): score <= alpha (upper bound, failed low). Return alpha if score <= alpha? No.
        // If entry.flag == ALPHA (Upper Bound): if entry.score <= alpha, return alpha. (We can't do better than alpha).
        // If entry.flag == BETA (Lower Bound): if entry.score >= beta, return beta.

        // Let's rely on standard:
        if (ttEntry.flag === 1) { // UPPER BOUND (Alpha)
            if (ttEntry.score <= alpha) return alpha;
        } else if (ttEntry.flag === 2) { // LOWER BOUND (Beta)
            if (ttEntry.score >= beta) return beta;
        }
    }

    if (depth === 0) {
        return fastEvaluate(state, maximizingPlayer);
    }

    const moves = getFastValidMoves(state);

    if (moves.length === 0) {
        return fastEvaluate(state, maximizingPlayer);
    }

    const ttMove = ttEntry?.bestMove;
    const ordered = orderMoves(state, moves, depth, ttMove);

    let bestMove = -1;
    let value = -Infinity;
    let bestFlag: 0 | 1 | 2 = 1; // Default to ALPHA (Upper Bound / Fail Low)

    for (const m of ordered) {
        const nextState = state.clone();
        fastExecuteMove(nextState, m);

        // NegaMax: -minimax(..., 1 - maximizingPlayer)
        // Note: maximizingPlayer parameter in fastEvaluate needs to be the root maximizer?
        // fastEvaluate takes "who is maximizing". 
        // If we switch turns, the evaluation should be from perspective of current player?
        // Standard Negamax: eval is usually relative to "player to move".
        // BUT fastEvaluate computes (P1 - P2).
        // Let's stick to strict Minimax logic with turn switching implicitly handled by recursion?
        // Actually, simple Negamax:

        // val = -minimax(nextState, depth-1, -beta, -alpha, 1 - maximizingPlayer... wait.
        // 'maximizingPlayer' arg in function is visual only for evaluation?
        // fastEvaluate needs to know "who implies positive score".
        // Let's assume fastEvaluate ALWAYS returns (P1 - P2).
        // Then Maximize P1, Minimize P2.

        // Let's use standard Minimax (not Negamax) for clarity with P1/P2 scores.
        // If state.currentPlayer == maximizingPlayer (Root), we MAX.
        // Else we MIN.

        // But `state.currentPlayer` changes. 
        // Let's pass rootPlayer.

        // REVERTING TO STANDARD MINIMAX (Easier with Score-Based Eval)
    }

    // RE-IMPLEMENTATION: STANDARD ALPHA-BETA (MAXIMIZING ROOT)
    // Actually, simpler:
    // fastEvaluate(state, rootPlayer) -> returns +ve if root is winning.

    const isMaximizing = state.data[16] === maximizingPlayer;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const m of ordered) {
            const next = state.clone();
            fastExecuteMove(next, m);
            const evalScore = minimax(next, depth - 1, alpha, beta, maximizingPlayer);
            if (evalScore > maxEval) {
                maxEval = evalScore;
                bestMove = m;
            }
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) {
                bestFlag = 2; // BETA (Lower Bound for Max node? No, Cutoff)
                addKillerMove(depth, m);
                break;
            }
        }
        tt.store(hash, depth, maxEval, bestFlag, bestMove);
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const m of ordered) {
            const next = state.clone();
            fastExecuteMove(next, m);
            const evalScore = minimax(next, depth - 1, alpha, beta, maximizingPlayer);
            if (evalScore < minEval) {
                minEval = evalScore;
                bestMove = m;
            }
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) {
                bestFlag = 1; // ALPHA (Upper Bound for Min node? Cutoff)
                addKillerMove(depth, m);
                break;
            }
        }
        tt.store(hash, depth, minEval, bestFlag, bestMove);
        return minEval;
    }
}


// ============================================================================
// DRIVER
// ============================================================================

initZobrist();

self.onmessage = (e: MessageEvent) => {
    const { type, state, depth, timeLimit } = e.data;

    if (type === 'COMPUTE_MOVE') {
        const fastState = FastGameState.fromGameState(state);
        const rootPlayer = fastState.data[16];

        const moves = getFastValidMoves(fastState);
        if (moves.length === 0) {
            self.postMessage({ type: 'BEST_MOVE', moveIndex: -1 });
            return;
        }
        if (moves.length === 1) {
            self.postMessage({ type: 'BEST_MOVE', moveIndex: moves[0] });
            return;
        }

        deadline = performance.now() + timeLimit;
        nodesEvaluated = 0;
        tt.clear();
        moveHistory.fill(0);

        let bestMove = moves[0];
        let currentDepth = 1;

        while (currentDepth <= depth) { // Respect max allowed depth
            try {
                let alpha = -Infinity;
                let beta = Infinity;
                let bestVal = -Infinity;
                let bestMoveThisDepth = -1;

                const ordered = orderMoves(fastState, moves, currentDepth, undefined);

                for (const m of ordered) {
                    const next = fastState.clone();
                    fastExecuteMove(next, m);

                    const val = minimax(next, currentDepth - 1, alpha, beta, rootPlayer);

                    if (val > bestVal) {
                        bestVal = val;
                        bestMoveThisDepth = m;
                    }
                    alpha = Math.max(alpha, bestVal);

                    if (performance.now() > deadline) throw "TIMEOUT";
                }

                if (bestMoveThisDepth !== -1) {
                    bestMove = bestMoveThisDepth;
                }

                if (bestVal > 90000) break;

            } catch (timeout) {
                break;
            }

            // If we are close to timeout, don't start next depth
            if (performance.now() > deadline - 20) break;
            currentDepth++;
        }

        console.log(`AI Fast: Depth=${currentDepth - 1} Nodes=${nodesEvaluated} TT=${tt['table'].size}`);
        self.postMessage({ type: 'BEST_MOVE', moveIndex: bestMove });
    }
};
