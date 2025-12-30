import { GameState, Player, GameStatus } from '../types';
import { executeMove, getValidMoves, getPitOwner, getPlayerIndices, getOpponentIndices } from './songoLogic';

// ============================================================================
// TRANSPOSITION TABLE - Cache for evaluated positions
// ============================================================================

interface TTEntry {
    hash: number;
    depth: number;
    score: number;
    flag: 'EXACT' | 'ALPHA' | 'BETA';
}

class TranspositionTable {
    private table: Map<number, TTEntry>;
    private maxSize: number;
    public hits: number = 0;
    public misses: number = 0;

    constructor(maxSize: number = 100000) {
        this.table = new Map();
        this.maxSize = maxSize;
    }

    store(hash: number, depth: number, score: number, flag: 'EXACT' | 'ALPHA' | 'BETA') {
        // If table is full, clear oldest entries (simple LRU approximation)
        if (this.table.size >= this.maxSize) {
            const firstKey = this.table.keys().next().value;
            this.table.delete(firstKey);
        }
        this.table.set(hash, { hash, depth, score, flag });
    }

    probe(hash: number, depth: number, alpha: number, beta: number): number | null {
        const entry = this.table.get(hash);
        if (!entry || entry.depth < depth) {
            this.misses++;
            return null;
        }

        this.hits++;

        if (entry.flag === 'EXACT') {
            return entry.score;
        } else if (entry.flag === 'ALPHA' && entry.score <= alpha) {
            return alpha;
        } else if (entry.flag === 'BETA' && entry.score >= beta) {
            return beta;
        }

        return null;
    }

    clear() {
        this.table.clear();
        this.hits = 0;
        this.misses = 0;
    }

    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : '0.0';
        return { hits: this.hits, misses: this.misses, hitRate: `${hitRate}%`, size: this.table.size };
    }
}

// ============================================================================
// ZOBRIST HASHING - Fast position hashing
// ============================================================================

// Initialize Zobrist random numbers (one-time setup)
const zobristTable: number[][] = [];
const zobristPlayer: number[] = [];

function initZobrist() {
    if (zobristTable.length > 0) return; // Already initialized

    // Random number generator with seed for consistency
    let seed = 12345;
    const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed;
    };

    // 14 pits, max ~50 seeds per pit (generous estimate)
    for (let pit = 0; pit < 14; pit++) {
        zobristTable[pit] = [];
        for (let seeds = 0; seeds <= 50; seeds++) {
            zobristTable[pit][seeds] = random();
        }
    }

    // Player to move
    zobristPlayer[Player.One] = random();
    zobristPlayer[Player.Two] = random();
}

function getZobristHash(state: GameState): number {
    initZobrist();

    let hash = 0;

    // Hash board state
    for (let i = 0; i < 14; i++) {
        const seeds = Math.min(state.board[i], 50); // Cap at 50 for table bounds
        hash ^= zobristTable[i][seeds];
    }

    // Hash current player
    hash ^= zobristPlayer[state.currentPlayer];

    return hash;
}

// ============================================================================
// MOVE ORDERING - Killer Moves & History Heuristic
// ============================================================================

interface KillerMoves {
    [depth: number]: number[];
}

const killerMoves: KillerMoves = {};
const historyTable: number[][] = Array(14).fill(0).map(() => Array(14).fill(0));

function addKillerMove(depth: number, move: number) {
    if (!killerMoves[depth]) {
        killerMoves[depth] = [];
    }

    // Keep only 2 killer moves per depth
    if (!killerMoves[depth].includes(move)) {
        killerMoves[depth].unshift(move);
        if (killerMoves[depth].length > 2) {
            killerMoves[depth].pop();
        }
    }
}

function updateHistory(move: number, depth: number) {
    // Simple history: increment score for good moves
    historyTable[move][depth] = (historyTable[move][depth] || 0) + depth * depth;
}

function orderMovesAdvanced(state: GameState, moves: number[], depth: number): number[] {
    return moves.map(move => {
        const nextState = executeMove(state, move);

        // Base weight: immediate score gain
        let weight = nextState.scores[state.currentPlayer] - state.scores[state.currentPlayer];

        // Bonus for winning moves
        if (nextState.status === GameStatus.Finished && nextState.winner === state.currentPlayer) {
            weight += 100000;
        }

        // Killer move bonus
        if (killerMoves[depth]?.includes(move)) {
            weight += 10000;
        }

        // History heuristic bonus
        weight += (historyTable[move]?.[depth] || 0);

        // Capture detection bonus
        const myIndices = getPlayerIndices(state.currentPlayer);
        const seeds = state.board[move];
        if (seeds > 0) {
            const landingIdx = seeds >= 14 ?
                getOpponentIndices(state.currentPlayer)[(seeds - 14) % 7] :
                (move + seeds) % 14;

            const landingOwner = getPitOwner(landingIdx);
            if (landingOwner !== state.currentPlayer) {
                const landingCount = nextState.board[landingIdx];
                if (landingCount >= 2 && landingCount <= 4) {
                    weight += 5000; // Prioritize captures
                }
            }
        }

        return { move, weight };
    })
        .sort((a, b) => b.weight - a.weight)
        .map(item => item.move);
}

// ============================================================================
// EVALUATION FUNCTION - Enhanced with optimized weights
// ============================================================================

const evaluateState = (state: GameState, maximizingPlayer: Player): number => {
    const opponent = maximizingPlayer === Player.One ? Player.Two : Player.One;

    // Win/Loss check
    if (state.status === GameStatus.Finished) {
        if (state.winner === maximizingPlayer) return 1000000;
        if (state.winner === opponent) return -1000000;
        return 0; // Draw
    }

    // === PRIMARY FACTOR: Score Difference (Most Important) ===
    const myScore = state.scores[maximizingPlayer];
    const oppScore = state.scores[opponent];
    const scoreDiff = (myScore - oppScore) * 1000;

    // Endgame evaluation: If close to winning, prioritize aggressive play
    const totalScore = myScore + oppScore;
    const gamePhase = totalScore < 20 ? 'early' : totalScore < 50 ? 'mid' : 'late';
    let endgameBonus = 0;

    if (gamePhase === 'late') {
        // In endgame, winning margin matters more
        if (myScore > 35) endgameBonus += (myScore - 35) * 5000; // Very close to winning
        if (oppScore > 35) endgameBonus -= (oppScore - 35) * 5000; // Opponent close to winning
    }

    // === STRATEGIC FACTORS ===

    const myIndices = getPlayerIndices(maximizingPlayer);
    const oppIndices = getPlayerIndices(opponent);

    // 1. Seed Control - More important in endgame
    const mySeedsOnBoard = myIndices.reduce((sum, idx) => sum + state.board[idx], 0);
    const oppSeedsOnBoard = oppIndices.reduce((sum, idx) => sum + state.board[idx], 0);
    const seedControlWeight = gamePhase === 'late' ? 15 : gamePhase === 'mid' ? 10 : 5;
    const seedControlBonus = (mySeedsOnBoard - oppSeedsOnBoard) * seedControlWeight;

    // 2. Pit Distribution - Having more active pits = more options
    const myActivePits = myIndices.filter(idx => state.board[idx] > 0).length;
    const oppActivePits = oppIndices.filter(idx => state.board[idx] > 0).length;
    const distributionBonus = (myActivePits - oppActivePits) * 35;

    // 2b. Seed concentration analysis - Avoid having too many seeds in one pit (except for planned captures)
    let concentrationPenalty = 0;
    for (const idx of myIndices) {
        if (state.board[idx] > 20) {
            concentrationPenalty += 15; // Penalty for over-concentration
        }
    }

    // 3. Capture Opportunities - Significantly more important
    let captureScore = 0;
    let multiCaptureBonus = 0;

    for (const pitIdx of myIndices) {
        const seeds = state.board[pitIdx];
        if (seeds === 0) continue;

        let landingIdx: number;
        if (seeds >= 14) {
            const remainingAfter13 = seeds - 13;
            const isAutoCapture = remainingAfter13 % 7 === 1;
            if (isAutoCapture) {
                captureScore += 50; // Auto-capture is very valuable
                continue;
            }
            landingIdx = oppIndices[(remainingAfter13 - 1) % 7];
        } else {
            landingIdx = (pitIdx + seeds) % 14;
        }

        if (getPitOwner(landingIdx) === opponent) {
            const landingCount = state.board[landingIdx] + 1;

            if (landingCount >= 2 && landingCount <= 4) {
                let potentialCapture = landingCount;
                let captureChainLength = 1;

                let checkIdx = (landingIdx - 1 + 14) % 14;
                while (getPitOwner(checkIdx) === opponent) {
                    const count = state.board[checkIdx];
                    if (count >= 2 && count <= 4) {
                        potentialCapture += count;
                        captureChainLength++;
                        checkIdx = (checkIdx - 1 + 14) % 14;
                    } else {
                        break;
                    }
                }

                // Reward based on capture amount and chain length
                captureScore += potentialCapture * 25;
                if (captureChainLength > 1) {
                    multiCaptureBonus += captureChainLength * 40; // Chain captures are strategic gold
                }
            }
        }
    }

    // 4. Defensive Evaluation - Much more sophisticated
    let vulnerabilityPenalty = 0;
    let criticalThreatPenalty = 0;

    for (const oppPitIdx of oppIndices) {
        const seeds = state.board[oppPitIdx];
        if (seeds === 0) continue;

        let landingIdx: number;
        if (seeds >= 14) {
            const remainingAfter13 = seeds - 13;
            if (remainingAfter13 % 7 === 1) {
                vulnerabilityPenalty += 35; // Auto-capture threat is serious
                continue;
            }
            landingIdx = myIndices[(remainingAfter13 - 1) % 7];
        } else {
            landingIdx = (oppPitIdx + seeds) % 14;
        }

        if (getPitOwner(landingIdx) === maximizingPlayer) {
            const landingCount = state.board[landingIdx] + 1;

            if (landingCount >= 2 && landingCount <= 4) {
                let threatValue = landingCount;
                let threatChainLength = 1;

                let checkIdx = (landingIdx - 1 + 14) % 14;
                while (getPitOwner(checkIdx) === maximizingPlayer) {
                    const count = state.board[checkIdx];
                    if (count >= 2 && count <= 4) {
                        threatValue += count;
                        threatChainLength++;
                        checkIdx = (checkIdx - 1 + 14) % 14;
                    } else {
                        break;
                    }
                }

                // More severe penalty for larger threats
                vulnerabilityPenalty += threatValue * 15;
                if (threatChainLength > 2) {
                    criticalThreatPenalty += threatValue * 25; // Critical: big chain threat
                }
            }
        }
    }

    // 5. Mobility - Critical for long-term strategy
    const myMoves = getValidMoves(state).length;
    const oppState = { ...state, currentPlayer: opponent };
    const oppMoves = getValidMoves(oppState).length;
    const mobilityBonus = (myMoves - oppMoves) * 20;

    // Severe penalty if we have very few moves
    let mobilityPenalty = 0;
    if (myMoves <= 2 && gamePhase !== 'early') {
        mobilityPenalty += 100; // Danger: very limited options
    }

    // 6. Strategic Positioning & Setup Detection
    let positionalBonus = 0;
    let setupBonus = 0;

    const middlePits = maximizingPlayer === Player.One ? [2, 3, 4] : [9, 10, 11];
    for (const pit of middlePits) {
        if (state.board[pit] > 0) {
            positionalBonus += 5;
        }
    }

    const lastPit = maximizingPlayer === Player.One ? 6 : 13;
    if (state.board[lastPit] >= 14) {
        positionalBonus += 20; // Good for future auto-capture
    }

    // 7. Strategic Setup Detection - Look for pits that can create future captures
    for (let i = 0; i < myIndices.length; i++) {
        const pitIdx = myIndices[i];
        const seeds = state.board[pitIdx];

        // Look for "setup" pits - pits that are being prepared for future big captures
        if (seeds >= 7 && seeds <= 13) {
            // Check if this could lead to landing on opponent side
            const targetIdx = (pitIdx + seeds) % 14;
            if (getPitOwner(targetIdx) === opponent) {
                setupBonus += 10; // Reward preparing strategic moves
            }
        }
    }

    // 8. Tempo/Initiative - Reward forcing opponent into bad positions
    let tempoBonus = 0;
    if (oppMoves < myMoves && gamePhase !== 'early') {
        tempoBonus += 30; // We have initiative
    }

    // === COMBINE ALL FACTORS ===
    const totalEvaluation =
        scoreDiff +
        endgameBonus +
        seedControlBonus +
        distributionBonus +
        -concentrationPenalty +
        captureScore +
        multiCaptureBonus +
        -vulnerabilityPenalty +
        -criticalThreatPenalty +
        mobilityBonus +
        -mobilityPenalty +
        positionalBonus +
        setupBonus +
        tempoBonus;

    return totalEvaluation;
};

// ============================================================================
// MINIMAX WITH TRANSPOSITION TABLE
// ============================================================================

const transpositionTable = new TranspositionTable(500000); // Increased from 100k to 500k
let deadline = 0;
const DEFAULT_TIME_LIMIT_MS = 1000; // Default time limit

// Public entry point: Iterative Deepening Search
const getBestMoveIterative = (state: GameState, maxDepthConfig: number = 8, timeLimitMs: number = DEFAULT_TIME_LIMIT_MS): number => {
    const moves = getValidMoves(state);
    if (moves.length === 0) return -1;
    if (moves.length === 1) return moves[0];

    // Clear transposition table and killer moves for new search
    transpositionTable.clear();
    Object.keys(killerMoves).forEach(key => delete killerMoves[parseInt(key)]);

    deadline = performance.now() + timeLimitMs;

    let bestMove = moves[0];
    let currentMaxDepth = 1;

    const orderedMoves = orderMovesAdvanced(state, moves, 0);

    // Iterative Deepening Loop
    while (currentMaxDepth <= maxDepthConfig) {
        try {
            const { move, score } = minimaxRoot(state, orderedMoves, currentMaxDepth);

            bestMove = move;

            // If we found a winning mate, stop searching deeper
            if (score > 900000) break;

        } catch (e) {
            // Timeout occurred
            break;
        }

        // If we are running low on time, don't start next depth
        if (performance.now() > deadline - 100) break;

        currentMaxDepth++;
    }

    // Log stats for debugging
    const stats = transpositionTable.getStats();
    console.log(`AI Search (Worker): depth=${currentMaxDepth - 1}, TT hits=${stats.hits}, misses=${stats.misses}, hit rate=${stats.hitRate}`);

    return bestMove;
};

// Root level minimax
const minimaxRoot = (state: GameState, moves: number[], depth: number): { move: number, score: number } => {
    let bestMove = moves[0];
    let maxEval = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
        const nextState = executeMove(state, move);
        const nextIsMaximizing = nextState.currentPlayer === state.currentPlayer;

        const evaluation = minimax(nextState, depth - 1, alpha, beta, nextIsMaximizing, state.currentPlayer, depth - 1);

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
    rootPlayer: Player,
    plyFromRoot: number
): number => {
    // Timeout Check
    if ((depth % 2 === 0) && performance.now() > deadline) {
        throw new Error("Timeout");
    }

    // Check transposition table
    const hash = getZobristHash(state);
    const ttScore = transpositionTable.probe(hash, depth, alpha, beta);
    if (ttScore !== null) {
        return ttScore;
    }

    if (depth === 0 || state.status === GameStatus.Finished) {
        const score = evaluateState(state, rootPlayer);
        transpositionTable.store(hash, depth, score, 'EXACT');
        return score;
    }

    const moves = getValidMoves(state);
    if (moves.length === 0) {
        const score = evaluateState(state, rootPlayer);
        transpositionTable.store(hash, depth, score, 'EXACT');
        return score;
    }

    // Order moves for better pruning
    const orderedMoves = orderMovesAdvanced(state, moves, plyFromRoot);

    if (isMaximizing) {
        let maxEval = -Infinity;
        let flag: 'EXACT' | 'ALPHA' | 'BETA' = 'ALPHA';

        for (const move of orderedMoves) {
            const nextState = executeMove(state, move);
            const nextIsMaximizing = nextState.currentPlayer === rootPlayer;

            const evalScore = minimax(nextState, depth - 1, alpha, beta, nextIsMaximizing, rootPlayer, plyFromRoot + 1);

            if (evalScore > maxEval) {
                maxEval = evalScore;
            }

            alpha = Math.max(alpha, evalScore);

            if (beta <= alpha) {
                // Beta cutoff - this move is too good, opponent won't allow it
                addKillerMove(plyFromRoot, move);
                updateHistory(move, depth);
                flag = 'BETA';
                break;
            }
        }

        if (maxEval > alpha) flag = 'EXACT';
        transpositionTable.store(hash, depth, maxEval, flag);
        return maxEval;

    } else {
        let minEval = Infinity;
        let flag: 'EXACT' | 'ALPHA' | 'BETA' = 'BETA';

        for (const move of orderedMoves) {
            const nextState = executeMove(state, move);
            const nextIsMaximizing = nextState.currentPlayer === rootPlayer;

            const evalScore = minimax(nextState, depth - 1, alpha, beta, nextIsMaximizing, rootPlayer, plyFromRoot + 1);

            if (evalScore < minEval) {
                minEval = evalScore;
            }

            beta = Math.min(beta, evalScore);

            if (beta <= alpha) {
                // Alpha cutoff
                addKillerMove(plyFromRoot, move);
                updateHistory(move, depth);
                flag = 'ALPHA';
                break;
            }
        }

        if (minEval < beta) flag = 'EXACT';
        transpositionTable.store(hash, depth, minEval, flag);
        return minEval;
    }
};

// ============================================================================
// WORKER MESSAGE HANDLING
// ============================================================================

self.onmessage = (e: MessageEvent) => {
    const { type, state, depth, timeLimit } = e.data;

    if (type === 'COMPUTE_MOVE') {
        const bestMove = getBestMoveIterative(state, depth, timeLimit);
        self.postMessage({ type: 'BEST_MOVE', moveIndex: bestMove });
    }
};
