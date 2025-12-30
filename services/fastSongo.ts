import { Player } from '../types';

// ============================================================================
// FAST GAME STATE - Optimized for AI Search (Zero Allocation)
// ============================================================================

export class FastGameState {
    // Data layout (Int8Array[18]):
    // [0-13]: Pits (seeds count)
    // [14]: Player 1 Score
    // [15]: Player 2 Score
    // [16]: Current Player (0=P1, 1=P2)
    // [17]: Unused/Padding or Solidarity Flag
    public data: Int8Array;

    constructor() {
        this.data = new Int8Array(18);
    }

    static fromGameState(state: any): FastGameState {
        const fast = new FastGameState();
        for (let i = 0; i < 14; i++) {
            fast.data[i] = state.board[i] > 127 ? 127 : state.board[i]; // Clamp for Int8 safety
        }
        fast.data[14] = state.scores[0];
        fast.data[15] = state.scores[1];
        fast.data[16] = state.currentPlayer === 0 ? 0 : 1;
        return fast;
    }

    clone(): FastGameState {
        const newBoard = new FastGameState();
        newBoard.data.set(this.data);
        return newBoard;
    }
}

// ============================================================================
// CORE LOGIC ENGINE - Optimized non-allocating functions
// ============================================================================

// Pre-calculated indices for performance
const P1_INDICES = [0, 1, 2, 3, 4, 5, 6];
const P2_INDICES = [7, 8, 9, 10, 11, 12, 13];

/**
 * Executes a move on the FastGameState in-place.
 */
export function fastExecuteMove(state: FastGameState, pitIndex: number): void {
    const { data } = state;
    let currentPlayer = data[16];
    let seeds = data[pitIndex];

    data[pitIndex] = 0; // Pickup

    // Track metrics for rules
    const myStart = currentPlayer === 0 ? 0 : 7;
    const oppStart = currentPlayer === 0 ? 7 : 0;

    // --- DISTRIBUTION ---
    let currentIdx = pitIndex;

    if (seeds >= 14) {
        // "Tour complet" logic
        const remainingAfter13 = seeds - 13;
        const isAutoCapture = remainingAfter13 % 7 === 1;

        // First 13 seeds
        for (let i = 0; i < 13; i++) {
            currentIdx = (currentIdx + 1) % 14;
            data[currentIdx]++;
        }
        seeds -= 13;

        if (isAutoCapture) {
            // Distribute remaining seeds strictly to opponent until last one
            const seedsToDistribute = seeds - 1;
            let opOffset = 0;
            for (let k = 0; k < seedsToDistribute; k++) {
                const target = (oppStart + opOffset) % 14;
                data[target]++;
                currentIdx = target;
                opOffset = (opOffset + 1) % 7;
            }

            // Auto-capture the VERY last seed
            const scoreIdx = currentPlayer === 0 ? 14 : 15;
            data[scoreIdx]++;
            // Optimization: No need to set data[pitIndex]=0, it's already 0

            state.data[16] = 1 - currentPlayer; // Switch turn
            return; // Move ends immediately on auto-capture
        } else {
            // Standard distribution of remainder in opponent side
            let opOffset = 0;
            while (seeds > 0) {
                const target = (oppStart + opOffset) % 14;
                data[target]++;
                currentIdx = target;
                opOffset = (opOffset + 1) % 7;
                seeds--;
            }
        }
    } else {
        // Standard simple distribution
        while (seeds > 0) {
            currentIdx = (currentIdx + 1) % 14;
            data[currentIdx]++;
            seeds--;
        }
    }

    // --- CAPTURE ("La Prise") ---
    // If last seed lands in opponent pit making 2, 3, or 4
    const ownerOfLastPit = (currentIdx >= 0 && currentIdx <= 6) ? 0 : 1;

    if (ownerOfLastPit !== currentPlayer) {
        const count = data[currentIdx];
        if (count >= 2 && count <= 4) {
            // Check for "Assèchement" (Starvation) Protection

            // 1. Identify all potential captures inline
            let capturedIndicesBuffer = 0; // Bitmask for indices 0-13 

            let checkIdx = currentIdx;
            while (true) {
                const checkOwner = (checkIdx >= 0 && checkIdx <= 6) ? 0 : 1;
                if (checkOwner === currentPlayer) break;

                const c = data[checkIdx];
                if (c >= 2 && c <= 4) {
                    capturedIndicesBuffer |= (1 << checkIdx);
                } else {
                    break;
                }
                checkIdx = (checkIdx - 1 + 14) % 14;
            }

            if (capturedIndicesBuffer !== 0) {
                // Check opponent total seeds vs captured seeds
                let opponentTotalSeeds = 0;
                let opponentPitsWithSeeds = 0;
                const oStart = currentPlayer === 0 ? 7 : 0;

                for (let i = 0; i < 7; i++) {
                    const idx = oStart + i;
                    if (data[idx] > 0) {
                        opponentTotalSeeds += data[idx];
                        opponentPitsWithSeeds++;
                    }
                }

                let capturedSum = 0;
                let capturedCount = 0;
                for (let i = 0; i < 14; i++) {
                    if ((capturedIndicesBuffer >> i) & 1) {
                        capturedSum += data[i];
                        capturedCount++;
                    }
                }

                const isGrandSlam = (opponentPitsWithSeeds === 7 && capturedCount === 7);
                const wouldStarve = (opponentTotalSeeds - capturedSum === 0);

                if (!wouldStarve && !isGrandSlam) {
                    // Apply capture
                    for (let i = 0; i < 14; i++) {
                        if ((capturedIndicesBuffer >> i) & 1) {
                            data[i] = 0; // Remove seeds
                        }
                    }
                    const scoreIdx = currentPlayer === 0 ? 14 : 15;
                    data[scoreIdx] += capturedSum;
                }
            }
        }
    }

    state.data[16] = 1 - currentPlayer;
}

/**
 * Returns list of valid moves (indices).
 * Handles the "Must Feed" rule.
 */
export function getFastValidMoves(state: FastGameState): Uint8Array {
    const { data } = state;
    const currentPlayer = data[16];
    const myStart = currentPlayer === 0 ? 0 : 7;
    const oppStart = currentPlayer === 0 ? 7 : 0;

    // 1. Check if opponent is starving
    let oppSeeds = 0;
    for (let i = 0; i < 7; i++) oppSeeds += data[oppStart + i];

    const mustFeed = (oppSeeds === 0);

    // Temp buffer for moves (max 7)
    const moves = new Uint8Array(7);
    let count = 0;

    // 2. Iterate my pits
    for (let i = 0; i < 7; i++) {
        const pitIdx = myStart + i;
        const seeds = data[pitIdx];
        if (seeds === 0) continue;

        let isValid = true;

        // Rule: Single seed in last pit (6 or 13) cannot check ??
        const isLastPit = (pitIdx === 6 || pitIdx === 13);
        if (isLastPit && seeds === 1) {
            // Check total seeds
            let total = 0;
            for (let j = 0; j < 7; j++) total += data[myStart + j];
            if (total > 1) isValid = false;
        }

        if (isValid && mustFeed) {
            // Check if this move feeds
            let feeds = false;
            if (seeds >= 14) {
                feeds = true;
            } else {
                // Simulate reach
                for (let s = 1; s <= seeds; s++) {
                    const target = (pitIdx + s) % 14;
                    if (currentPlayer === 0) {
                        if (target >= 7 && target <= 13) { feeds = true; break; }
                    } else {
                        if (target >= 0 && target <= 6) { feeds = true; break; }
                    }
                }
            }
            if (!feeds) isValid = false;
        }

        if (isValid) {
            moves[count++] = pitIdx;
        }
    }

    return moves.subarray(0, count);
}


/**
 * Fast evaluation of the state for AI
 */
export function fastEvaluate(state: FastGameState, maximizingPlayer: number): number {
    const { data } = state;
    const p1Score = data[14];
    const p2Score = data[15];

    // Game Over Check
    if (p1Score > 35) return maximizingPlayer === 0 ? 100000 : -100000;
    if (p2Score > 35) return maximizingPlayer === 1 ? 100000 : -100000;

    // Score Diff
    let scoreDiff = (p1Score - p2Score);
    if (maximizingPlayer === 1) scoreDiff = -scoreDiff;

    // Heuristics
    // 1. Mobility (Count moves)
    // 2. Vulnerability (Opponent can capture) -> Requires lookahead (expensive in eval)
    // 3. Setup (Seeds in 10-12 range for big moves)

    return scoreDiff * 100; // Simple baseline for testing
}
