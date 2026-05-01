/**
 * Neural AI — AlphaZero MCTS via ONNX Runtime Web
 *
 * Runs a full MCTS loop (selection → expansion → backpropagation) within a
 * configurable time budget. Each leaf evaluation calls the neural network
 * (policy head + value head). The number of simulations scales with hardware:
 * ~3 000–8 000 simulations per 5-second budget on modern hardware.
 */
import * as ort from 'onnxruntime-web';
import { GameState, Player, GameStatus } from '../types';
import { getValidMoves, executeMove } from './songoLogic';

ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/`;

const C_PUCT = 1.5;
const BATCH_SIZE = 8; // Leaves evaluated per batched inference call

// ─── ONNX session (lazy, singleton) ──────────────────────────────────────────

let session: ort.InferenceSession | null = null;
let sessionLoading = false;
let modelVersion = Date.now();

export function reloadNeuralAI() {
  session = null;
  modelVersion = Date.now();
}

async function getSession(): Promise<ort.InferenceSession> {
  if (session) return session;
  if (sessionLoading) {
    while (sessionLoading) await new Promise(r => setTimeout(r, 30));
    return session!;
  }
  sessionLoading = true;
  try {
    // Log WebGPU availability before attempting to create session
    const gpuAvailable = !!(navigator as any).gpu;
    if (gpuAvailable) {
      const adapter = await (navigator as any).gpu.requestAdapter();
    }
    session = await ort.InferenceSession.create(`/songo_nn.onnx?v=${modelVersion}`, {
      executionProviders: ['webgpu', 'wasm'],
    });
    const backend = (session as any).handler?.backend
      ?? (session as any)._backend
      ?? (session as any).handler?.sessionOptions?.executionProviders?.[0]
      ?? 'unknown';
    // Detect actual backend by running a probe — timing reveals CPU vs GPU
    const probeStart = Date.now();
    const probe = new ort.Tensor('float32', new Float32Array(80), [1, 80]);
    await session.run({ state: probe });
    const probeMs = Date.now() - probeStart;
    const inferredBackend = probeMs < 50 ? 'GPU (fast)' : probeMs < 300 ? 'CPU-optimized' : 'WASM (slow)';
    // Warm-up: trigger WebGPU shader compilation now so the first real game
    // doesn't pay the cold-start penalty (~10x slower first inference).
    const warmupBatch = new ort.Tensor('float32', new Float32Array(BATCH_SIZE * 80), [BATCH_SIZE, 80]);
    await session.run({ state: warmupBatch });
  } finally {
    sessionLoading = false;
  }
  return session!;
}

// ─── State encoding (must mirror songo_game.py encode_state) ─────────────────

function encodeState(state: GameState): Float32Array {
  const f = new Float32Array(80);
  const cp = state.currentPlayer as number;
  const op = 1 - cp;
  const cpStart = cp === Player.One ? 0 : 7;
  const opStart = cp === Player.One ? 7 : 0;
  const board = state.board;
  const ben = state.solidarityBeneficiary as number | null;

  // ── Base features [0-27] ──────────────────────────────────────────────────
  for (let i = 0; i < 7; i++) {
    f[i]     = board[cpStart + i] / 70;
    f[7 + i] = board[opStart + i] / 70;
  }
  const cpScore = state.scores[cp as Player];
  const opScore = state.scores[op as Player];
  f[14] = cpScore / 70;
  f[15] = opScore / 70;
  f[16] = (state.isSolidarityMode && ben === op) ? 1 : 0;
  f[17] = (cpScore - opScore) / 70;

  let cpSeeds = 0, opSeeds = 0;
  for (let i = 0; i < 7; i++) { cpSeeds += board[cpStart + i]; opSeeds += board[opStart + i]; }
  f[18] = cpSeeds / 70;
  f[19] = opSeeds / 70;
  f[20] = (cpSeeds + opSeeds) / 70;

  let cpNE = 0, opNE = 0;
  for (let i = 0; i < 7; i++) {
    if (board[cpStart + i] > 0) cpNE++;
    if (board[opStart + i] > 0) opNE++;
  }
  f[21] = cpNE / 7;
  f[22] = opNE / 7;

  let reach = 0;
  for (let i = 0; i < 7; i++) {
    const idx = cpStart + i;
    const s = board[idx];
    if (s > 0) {
      const lastDrop = (idx + s) % 14;
      if ((lastDrop < 7 ? Player.One : Player.Two) !== cp || s >= 14) reach += s;
    }
  }
  f[23] = reach / 70;
  f[24] = (state.isSolidarityMode && ben === cp) ? 1 : 0;
  f[25] = (cpScore + opScore) / 70;
  f[26] = Math.max(...board) / 70;
  f[27] = board.slice(cpStart, cpStart + 7).some(s => s >= 14) ? 1 : 0;

  // ── Bidoua + Menace double [28-31] ──────────────────────────────────────
  let myBidoua = 0, opBidoua = 0, myThreats = 0, opThreats = 0;
  for (let i = 0; i < 7; i++) {
    const s = board[cpStart + i];
    if (s > 0) {
      if (s >= 14) { myBidoua += s; myThreats++; }
      else {
        const lastPos = (cpStart + i + s) % 14;
        const lastOwner = lastPos < 7 ? Player.One : Player.Two;
        if (lastOwner === op) {
          const post = board[lastPos] + 1;
          if (post >= 2 && post <= 4) myThreats++;
          else myBidoua += s;
        } else { myBidoua += s; }
      }
    }
    const t = board[opStart + i];
    if (t > 0) {
      if (t >= 14) { opBidoua += t; opThreats++; }
      else {
        const lastPos = (opStart + i + t) % 14;
        const lastOwner = lastPos < 7 ? Player.One : Player.Two;
        if (lastOwner === cp) {
          const post = board[lastPos] + 1;
          if (post >= 2 && post <= 4) opThreats++;
          else opBidoua += t;
        } else { opBidoua += t; }
      }
    }
  }
  f[28] = myBidoua / 70;
  f[29] = myThreats >= 2 ? 1 : 0;
  f[30] = opBidoua / 70;
  f[31] = opThreats >= 2 ? 1 : 0;

  // ── Zone features [32-37] ─────────────────────────────────────────────────
  // Zones (relative): Tête=[0,1,2]  Pivot=[3]  Membres=[4,5,6]
  const myTete    = board[cpStart] + board[cpStart+1] + board[cpStart+2];
  const myPivot   = board[cpStart + 3];
  const myMembres = board[cpStart+4] + board[cpStart+5] + board[cpStart+6];
  const opTete    = board[opStart] + board[opStart+1] + board[opStart+2];
  const opPivot   = board[opStart + 3];
  const opMembres = board[opStart+4] + board[opStart+5] + board[opStart+6];

  f[32] = myTete    / 21;
  f[33] = myPivot   / 14;
  f[34] = myMembres / 21;
  f[35] = opTete    / 21;
  f[36] = opPivot   / 14;
  f[37] = opMembres / 21;

  // ── Maison proximity [38-44] ──────────────────────────────────────────────
  for (let i = 0; i < 7; i++) f[38 + i] = Math.min(board[cpStart + i], 14) / 14;

  // ── Capture potential [45-51] ─────────────────────────────────────────────
  for (let i = 0; i < 7; i++) {
    const idx = cpStart + i;
    const s = board[idx];
    if (s >= 14) {
      f[45 + i] = 1.0; // Maison = max potential
    } else if (s > 0) {
      const lastPos = (idx + s) % 14;
      const lastOwner = lastPos < 7 ? Player.One : Player.Two;
      if (lastOwner === op) {
        const postCount = board[lastPos] + 1;
        if (postCount >= 2 && postCount <= 4) {
          // Walk chain backwards
          let totalCap = postCount;
          let check = (lastPos - 1 + 14) % 14;
          while ((check < 7 ? Player.One : Player.Two) === op && board[check] >= 2 && board[check] <= 4) {
            totalCap += board[check];
            check = (check - 1 + 14) % 14;
          }
          f[45 + i] = Math.min(totalCap, 14) / 14;
        }
      }
    }
  }

  // ── Vulnerability [52-57] ─────────────────────────────────────────────────
  const exposed = (pit: number) => board[pit] >= 2 && board[pit] <= 4;

  f[52] = ([0,1,2].filter(i => exposed(cpStart+i)).length) / 3;
  f[53] = exposed(cpStart+3) ? 1 : 0;
  f[54] = ([4,5,6].filter(i => exposed(cpStart+i)).length) / 3;
  f[55] = ([0,1,2].filter(i => exposed(opStart+i)).length) / 3;
  f[56] = exposed(opStart+3) ? 1 : 0;
  f[57] = ([4,5,6].filter(i => exposed(opStart+i)).length) / 3;

  // ── Strategic balance [58-62] ─────────────────────────────────────────────
  f[58] = board.slice(opStart, opStart+7).filter(s => s >= 14).length / 7;
  f[59] = Math.max(...Array.from({length:7}, (_,i) => Math.min(board[cpStart+i],14))) / 14;
  f[60] = Math.max(...Array.from({length:7}, (_,i) => Math.min(board[opStart+i],14))) / 14;
  f[61] = (myTete    - opTete)    / 21;
  f[62] = (myMembres - opMembres) / 21;
  // [63]: padding

  // ── v2: Book features [64-76] ──────────────────────────────────────────────
  // Landing positions [64-70] — affine equations from the Songo book
  for (let i = 0; i < 7; i++) {
    const s = board[cpStart + i];
    if (s > 0) {
      const landing = (cpStart + i + s) % 14;
      f[64 + i] = (landing + 1) / 14;  // +1 to distinguish from empty
    }
  }

  // Yini [71-72] — pits with exactly 5 seeds (mother pit)
  let myYini = 0, opYini = 0;
  for (let i = 0; i < 7; i++) {
    if (board[cpStart + i] === 5) myYini++;
    if (board[opStart + i] === 5) opYini++;
  }
  f[71] = myYini / 7;
  f[72] = opYini / 7;

  // Olôa [73-74] — pits with exactly 14 seeds (sentinel pit)
  let myOloa = 0, opOloa = 0;
  for (let i = 0; i < 7; i++) {
    if (board[cpStart + i] === 14) myOloa++;
    if (board[opStart + i] === 14) opOloa++;
  }
  f[73] = myOloa / 7;
  f[74] = opOloa / 7;

  // Akuru [75-76] — pits with ≥19 seeds (critical mass)
  let myAkuru = 0, opAkuru = 0;
  for (let i = 0; i < 7; i++) {
    if (board[cpStart + i] >= 19) myAkuru++;
    if (board[opStart + i] >= 19) opAkuru++;
  }
  f[75] = myAkuru / 7;
  f[76] = opAkuru / 7;
  // [77-79]: reserved

  return f;
}

// ─── Neural network inference ─────────────────────────────────────────────────

async function runInference(
  state: GameState,
  sess: ort.InferenceSession,
): Promise<{ policy: Float32Array; value: number }> {
  const tensor = new ort.Tensor('float32', encodeState(state), [1, 80]);
  const out = await sess.run({ state: tensor });
  return {
    policy: out['policy'].data as Float32Array,
    value:  (out['value'].data as Float32Array)[0],
  };
}

// ─── MCTS ─────────────────────────────────────────────────────────────────────

class MCTSNode {
  state: GameState;
  parent: MCTSNode | null;
  prior: number;
  visitCount = 0;
  valueSum  = 0;
  isExpanded = false;
  children = new Map<number, MCTSNode>(); // absolute pit index → child

  constructor(state: GameState, parent: MCTSNode | null, prior: number) {
    this.state  = state;
    this.parent = parent;
    this.prior  = prior;
  }

  get q(): number {
    return this.visitCount > 0 ? this.valueSum / this.visitCount : 0;
  }

  ucbScore(): number {
    const parentVisits = this.parent!.visitCount;
    return -this.q + C_PUCT * this.prior * Math.sqrt(parentVisits) / (1 + this.visitCount);
  }

  bestUcbChild(): MCTSNode {
    let best!: MCTSNode;
    let bestScore = -Infinity;
    for (const child of this.children.values()) {
      const s = child.ucbScore();
      if (s > bestScore) { bestScore = s; best = child; }
    }
    return best;
  }

  backpropagate(value: number): void {
    this.visitCount++;
    this.valueSum += value;
    // Negate at each level: parent played from the opposing perspective
    if (this.parent) this.parent.backpropagate(-value);
  }
}

/**
 * Batch-expand up to BATCH_SIZE leaf nodes in a single inference call.
 * Handles terminal states and already-expanded nodes without network calls.
 * Returns one value per node from that node's current player perspective.
 */
async function expandNodesBatch(
  nodes: MCTSNode[],
  sess: ort.InferenceSession,
): Promise<number[]> {
  const results = new Array<number>(nodes.length).fill(0);

  // Identify which nodes actually need network inference
  const inferIndices: number[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const { state } = nodes[i];

    if (nodes[i].isExpanded) {
      // Duplicate leaf in this batch — reuse current Q as estimate
      results[i] = nodes[i].q;
      continue;
    }
    if (state.status === GameStatus.Finished) {
      const cp = state.currentPlayer;
      results[i] = state.winner === cp ? 1.0 : state.winner === 'Draw' ? 0.0 : -1.0;
      continue;
    }
    const moves = getValidMoves(state);
    if (moves.length === 0) { results[i] = 0.0; continue; }

    inferIndices.push(i);
  }

  if (inferIndices.length > 0) {
    // Build one batched Float32 tensor
    const B = inferIndices.length;
    const batchData = new Float32Array(B * 80);
    for (let b = 0; b < B; b++) {
      batchData.set(encodeState(nodes[inferIndices[b]].state), b * 80);
    }

    const tensor = new ort.Tensor('float32', batchData, [B, 80]);
    const out = await sess.run({ state: tensor });
    const allPolicies = out['policy'].data as Float32Array;
    const allValues   = out['value'].data as Float32Array;

    for (let b = 0; b < B; b++) {
      const i     = inferIndices[b];
      const node  = nodes[i];
      const state = node.state;

      node.isExpanded = true;
      results[i] = allValues[b];

      const moves   = getValidMoves(state);
      const cpStart = (state.currentPlayer as number) === Player.One ? 0 : 7;
      const pol     = allPolicies.subarray(b * 7, (b + 1) * 7);

      // Stable softmax over valid actions only
      let maxLogit = -Infinity;
      for (const pit of moves) { const l = pol[pit - cpStart]; if (l > maxLogit) maxLogit = l; }
      let pSum = 0;
      const raw = new Map<number, number>();
      for (const pit of moves) { const p = Math.exp(pol[pit - cpStart] - maxLogit); raw.set(pit, p); pSum += p; }
      for (const pit of moves) {
        const prior = pSum > 0 ? raw.get(pit)! / pSum : 1 / moves.length;
        node.children.set(pit, new MCTSNode(executeMove(state, pit), node, prior));
      }
    }
  }

  return results;
}

/** Expand a leaf node. Returns value from current player's perspective. */
async function expandNode(node: MCTSNode, sess: ort.InferenceSession): Promise<number> {
  const { state } = node;

  if (state.status === GameStatus.Finished) {
    const cp = state.currentPlayer;
    if (state.winner === cp)     return  1.0;
    if (state.winner === 'Draw') return  0.0;
    return -1.0;
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) return 0.0;

  node.isExpanded = true;
  const { policy, value } = await runInference(state, sess);

  const cpStart = (state.currentPlayer as number) === Player.One ? 0 : 7;

  // Stable softmax over valid actions only
  let maxLogit = -Infinity;
  for (const pit of moves) {
    const logit = policy[pit - cpStart];
    if (logit > maxLogit) maxLogit = logit;
  }
  let pSum = 0;
  const raw = new Map<number, number>();
  for (const pit of moves) {
    const p = Math.exp(policy[pit - cpStart] - maxLogit);
    raw.set(pit, p);
    pSum += p;
  }

  for (const pit of moves) {
    const prior = pSum > 0 ? raw.get(pit)! / pSum : 1 / moves.length;
    node.children.set(pit, new MCTSNode(executeMove(state, pit), node, prior));
  }

  return value;
}

export interface NeuralMoveResult {
  pit: number;          // Coup choisi
  policy: number[];     // Distribution de visites MCTS sur les 7 actions (indices 0-6)
}

/**
 * Run MCTS for `timeLimitMs` milliseconds and return the best pit index
 * along with the full visit distribution (policy) for training.
 */
export async function getNeuralMCTSMove(
  state: GameState,
  timeLimitMs = 5000,
): Promise<NeuralMoveResult> {
  const moves = getValidMoves(state);
  if (moves.length === 0) return { pit: -1, policy: new Array(7).fill(0) };
  if (moves.length === 1) {
    const policy = new Array(7).fill(0);
    const cpStart = (state.currentPlayer as number) === Player.One ? 0 : 7;
    policy[moves[0] - cpStart] = 1.0;
    return { pit: moves[0], policy };
  }

  try {
    const sess = await getSession();
    const root = new MCTSNode(state, null, 1.0);

    // Expand root first so children exist before the loop
    await expandNode(root, sess);
    if (!root.isExpanded) return moves[0];

    // Add exploration noise to root node to guarantee diverse games (AlphaZero style)
    const epsilon = 0.25;
    let sumNoise = 0;
    const noiseArray: number[] = [];
    for (let i = 0; i < root.children.size; i++) {
        // Approximate Dirichlet noise with uniform for simplicity
        const v = Math.random(); 
        noiseArray.push(v);
        sumNoise += v;
    }
    
    let i = 0;
    for (const [pit, child] of root.children) {
      const noise = sumNoise > 0 ? noiseArray[i] / sumNoise : 1 / root.children.size;
      child.prior = (1 - epsilon) * child.prior + epsilon * noise;
      i++;
    }

    const deadline = Date.now() + timeLimitMs;
    // Minimum simulations before early stopping is allowed
    // Raised: 128 was too few — a biased prior could stop search before finding better moves
    const MIN_SIMS = BATCH_SIZE * 64; // at least 512 sims before checking confidence
    let sims = 0;

    while (Date.now() < deadline) {
      // Early stopping: only if one move is truly dominant after sufficient search
      if (sims >= MIN_SIMS && root.children.size > 0) {
        let totalV = 0;
        let maxV = 0;
        for (const c of root.children.values()) { totalV += c.visitCount; if (c.visitCount > maxV) maxV = c.visitCount; }
        if (totalV > 0 && maxV / totalV >= 0.95) break; // raised 0.90→0.95: require stronger confidence
      }
      // 1. Selection — collect BATCH_SIZE leaves, applying virtual loss to
      //    steer subsequent selections away from already-chosen paths.
      const batchNodes: MCTSNode[] = [];
      const batchPaths: MCTSNode[][] = [];

      for (let b = 0; b < BATCH_SIZE; b++) {
        let node = root;
        const path: MCTSNode[] = [];

        while (node.isExpanded && node.children.size > 0) {
          node = node.bestUcbChild();
          // Virtual loss: pessimistically count this visit now so the next
          // selection in this batch diverges to a different subtree.
          node.visitCount++;
          node.valueSum--;
          path.push(node);
        }

        batchNodes.push(node);
        batchPaths.push(path);
      }

      // 2. Expansion + evaluation — one batched inference call for all leaves
      const values = await expandNodesBatch(batchNodes, sess);

      // 3. Backpropagation — undo virtual loss then apply real value
      for (let b = 0; b < batchNodes.length; b++) {
        for (const n of batchPaths[b]) { n.visitCount--; n.valueSum++; }
        batchNodes[b].backpropagate(values[b]);
        sims++;
      }
    }


    const cpStart = (state.currentPlayer as number) === Player.One ? 0 : 7;

    // Build visit distribution over 7 actions (relative indices)
    let totalVisits = 0;
    for (const child of root.children.values()) totalVisits += child.visitCount;

    const policy = new Array(7).fill(0);
    let bestPit = moves[0];
    let bestVisits = -1;
    for (const [pit, child] of root.children) {
      const action = pit - cpStart;
      policy[action] = totalVisits > 0 ? child.visitCount / totalVisits : 0;
      if (child.visitCount > bestVisits) {
        bestVisits = child.visitCount;
        bestPit = pit;
      }
    }

    return { pit: bestPit, policy };
  } catch (e) {
    console.error('[NeuralAI] MCTS error, fallback to random:', e);
    const fallbackPit = moves[Math.floor(Math.random() * moves.length)];
    return { pit: fallbackPit, policy: new Array(7).fill(0) };
  }
}
