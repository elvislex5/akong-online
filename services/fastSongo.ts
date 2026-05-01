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
    // [17]: Winning score (36=Gabon, 40=Cameroon)
    public data: Int8Array;

    constructor() {
        this.data = new Int8Array(18);
        this.data[17] = 36;
    }

    static fromGameState(state: any, winningScore: number = 36): FastGameState {
        const fast = new FastGameState();
        for (let i = 0; i < 14; i++) {
            fast.data[i] = state.board[i] > 127 ? 127 : state.board[i];
        }
        fast.data[14] = state.scores[0];
        fast.data[15] = state.scores[1];
        fast.data[16] = state.currentPlayer === 0 ? 0 : 1;
        fast.data[17] = winningScore;
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

            let capturedIndicesBuffer = 0;
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
 * Fast evaluation of the state for AI.
 *
 * Heuristiques intégrées (inspirées des stratégies du PDF Songo) :
 *  1. Score différentiel          — avantage matériel
 *  2. Menaces (capture potential) — cases pouvant capturer au prochain coup
 *  3. Menace double               — bonus si ≥ 2 cases menaçantes simultanément
 *  4. Grenier (ndà)               — bonus pour les cases > 13 graines
 *  5. Bidoua                      — mobilité : graines "libres" sans offrir de capture
 *  6. Vulnérabilité               — pénalité pour les cases exposées (2-4 graines) adverses
 */
export function fastEvaluate(state: FastGameState, maximizingPlayer: number): number {
    const { data } = state;
    const p1Score = data[14];
    const p2Score = data[15];

    const winScore = data[17] === 40 ? 40 : 36;
    if (p1Score >= winScore) return maximizingPlayer === 0 ? 100000 : -100000;
    if (p2Score >= winScore) return maximizingPlayer === 1 ? 100000 : -100000;

    const cp = maximizingPlayer;
    const op = 1 - cp;
    const cpStart = cp === 0 ? 0 : 7;
    const opStart = cp === 0 ? 7 : 0;

    // 1. Score différentiel (poids fort)
    let score = (data[14 + cp] - data[14 + op]) * 100;

    // 2-3. Menaces et menace double
    let myThreats = 0, myThreatValue = 0;
    let opThreats = 0, opThreatValue = 0;

    for (let i = 0; i < 7; i++) {
        // Mes menaces
        const s = data[cpStart + i];
        if (s > 0 && s < 14) {
            const lastDrop = (cpStart + i + s) % 14;
            if ((lastDrop < 7 ? 0 : 1) === op) {
                const post = data[lastDrop] + 1;
                if (post >= 2 && post <= 4) {
                    myThreats++;
                    let cap = post;
                    let check = (lastDrop - 1 + 14) % 14;
                    while ((check < 7 ? 0 : 1) === op && data[check] >= 2 && data[check] <= 4) {
                        cap += data[check];
                        check = (check - 1 + 14) % 14;
                    }
                    myThreatValue += cap;
                }
            }
        }
        // Menaces adverses (ma vulnérabilité)
        const t = data[opStart + i];
        if (t > 0 && t < 14) {
            const lastDrop = (opStart + i + t) % 14;
            if ((lastDrop < 7 ? 0 : 1) === cp) {
                const post = data[lastDrop] + 1;
                if (post >= 2 && post <= 4) {
                    opThreats++;
                    let cap = post;
                    let check = (lastDrop - 1 + 14) % 14;
                    while ((check < 7 ? 0 : 1) === cp && data[check] >= 2 && data[check] <= 4) {
                        cap += data[check];
                        check = (check - 1 + 14) % 14;
                    }
                    opThreatValue += cap;
                }
            }
        }
    }

    score += (myThreatValue - opThreatValue) * 15;
    if (myThreats >= 2) score += 40;   // Menace double
    if (opThreats >= 2) score -= 40;

    // 4. Greniers (ndà) : cases > 13 graines = atout stratégique majeur
    let myGreniers = 0, opGreniers = 0;
    for (let i = 0; i < 7; i++) {
        if (data[cpStart + i] >= 14) myGreniers++;
        if (data[opStart + i] >= 14) opGreniers++;
    }
    score += (myGreniers - opGreniers) * 60;

    // 5. Bidoua : graines mobiles sans offrir de capture immédiate à l'adversaire
    let myBidoua = 0, opBidoua = 0;
    for (let i = 0; i < 7; i++) {
        const s = data[cpStart + i];
        if (s > 0) {
            if (s >= 14) { myBidoua += s; }
            else {
                const lastDrop = (cpStart + i + s) % 14;
                if ((lastDrop < 7 ? 0 : 1) === op) {
                    const post = data[lastDrop] + 1;
                    if (post < 2 || post > 4) myBidoua += s;
                } else { myBidoua += s; }
            }
        }
        const t = data[opStart + i];
        if (t > 0) {
            if (t >= 14) { opBidoua += t; }
            else {
                const lastDrop = (opStart + i + t) % 14;
                if ((lastDrop < 7 ? 0 : 1) === cp) {
                    const post = data[lastDrop] + 1;
                    if (post < 2 || post > 4) opBidoua += t;
                } else { opBidoua += t; }
            }
        }
    }
    score += (myBidoua - opBidoua) * 5;

    return score;
}
