import { Player, GameState, GameStatus } from '../types';
import { executeMove, isValidMove, getPlayerIndices } from './songoLogic';

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  board: number[];
  scores: [number, number];
  currentPlayer: Player;
  bestMove: number;
  explanation: string;
}

const PUZZLES: Puzzle[] = [
  {
    id: 'p1',
    title: 'Capture simple',
    description: 'Trouvez le coup qui capture le plus de graines.',
    difficulty: 'easy',
    board: [0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 0, 0, 5, 3],
    scores: [28, 30],
    currentPlayer: Player.One,
    bestMove: 2,
    explanation: 'A3 avec 3 graines atterrit sur B6 (case 12) qui a 5+1=6 : pas de capture. Mais la graine sur B2 (case 8) reçoit 1 → 2 graines = capture !',
  },
  {
    id: 'p2',
    title: 'Nourrir ou mourir',
    description: "L'adversaire n'a plus de graines. Quel coup le nourrit ?",
    difficulty: 'easy',
    board: [2, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0],
    scores: [25, 39],
    currentPlayer: Player.One,
    bestMove: 5,
    explanation: 'A6 avec 1 graine atteint A7 (case 6). Pas assez. A1 avec 2 atteint A2-A3. Seul A7 (case 6 → 3 graines) atteint B1, B2, B3 et nourrit l\'adversaire.',
  },
  {
    id: 'p3',
    title: 'Capture en chaîne',
    description: 'Un coup permet de capturer plusieurs cases consécutives.',
    difficulty: 'medium',
    board: [0, 0, 0, 5, 0, 0, 0, 0, 1, 3, 1, 5, 0, 0],
    scores: [22, 33],
    currentPlayer: Player.One,
    bestMove: 3,
    explanation: 'A4 avec 5 graines : atterrit sur B2 (case 8, 1+1=2), B3 (case 9, 3+1=4), B4 (case 10, 1+1=2). Capture en chaîne de 3 cases = 8 graines !',
  },
  {
    id: 'p4',
    title: 'Tour complet',
    description: 'Avec 14+ graines, le tour complet change tout. Quel pit jouer ?',
    difficulty: 'hard',
    board: [0, 0, 0, 0, 0, 14, 0, 2, 3, 1, 4, 2, 3, 1],
    scores: [20, 20],
    currentPlayer: Player.One,
    bestMove: 5,
    explanation: 'A6 avec 14 graines fait un tour complet. Les 13 premières se distribuent, puis la 14e est auto-capturée.',
  },
  {
    id: 'p5',
    title: 'Victoire décisive',
    description: 'Vous avez 34 points. Trouvez le coup qui vous fait gagner (>35).',
    difficulty: 'medium',
    board: [0, 0, 4, 0, 0, 0, 0, 3, 1, 0, 5, 0, 2, 3],
    scores: [34, 18],
    currentPlayer: Player.One,
    bestMove: 2,
    explanation: 'A3 avec 4 graines atterrit sur A7 (case 6). En passant, B1 reçoit 1 → 3+1=4 (non), B2 reçoit → 1+1=2 → capture de 2 graines. 34+2 = 36 > 35 !',
  },
  {
    id: 'p6',
    title: 'Protection contre l\'assèchement',
    description: 'Attention ! Un coup semble fort mais serait annulé. Trouvez le bon.',
    difficulty: 'hard',
    board: [0, 0, 0, 0, 0, 0, 6, 1, 1, 1, 1, 1, 1, 1],
    scores: [28, 28],
    currentPlayer: Player.One,
    bestMove: 6,
    explanation: 'A7 avec 6 graines distribue sur B1-B6. Chaque case passe à 2 = capturable. Mais capturer les 7 cases viderait l\'adversaire → protection. La capture est annulée, mais c\'est le seul coup légal.',
  },
  {
    id: 'p7',
    title: 'Menace double',
    description: 'Créez une situation de menace double imparable.',
    difficulty: 'medium',
    board: [0, 1, 0, 2, 0, 0, 0, 0, 3, 0, 1, 0, 3, 0],
    scores: [30, 30],
    currentPlayer: Player.One,
    bestMove: 3,
    explanation: 'A4 avec 2 graines atterrit sur A6 (case 5). Les cases B2 (3) et B4 (1) sont menacées — l\'adversaire ne peut pas défendre les deux !',
  },
  {
    id: 'p8',
    title: 'Solidarité obligatoire',
    description: 'L\'adversaire est à sec. Trouvez le seul coup qui le nourrit sans perdre.',
    difficulty: 'easy',
    board: [0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    scores: [32, 35],
    currentPlayer: Player.One,
    bestMove: 6,
    explanation: 'A7 (case 6) avec 2 graines atteint B1 et B2, nourrissant l\'adversaire. A5 avec 1 graine n\'atteint que A6 — pas assez loin.',
  },
  {
    id: 'p9',
    title: 'Le Yini décisif',
    description: 'Exploitez la case mère (5 graines) pour capturer.',
    difficulty: 'medium',
    board: [0, 0, 5, 0, 0, 0, 0, 1, 0, 3, 0, 1, 0, 0],
    scores: [30, 30],
    currentPlayer: Player.One,
    bestMove: 2,
    explanation: 'A3 avec 5 graines distribue jusqu\'à B1 (case 7, 1+1=2). Capture ! La case B3 (3+1=4) est aussi capturée en chaîne = 6 graines.',
  },
  {
    id: 'p10',
    title: 'Akuru libéré',
    description: 'Votre grande case de 19 graines peut tout changer.',
    difficulty: 'hard',
    board: [0, 0, 0, 0, 19, 0, 0, 1, 3, 0, 1, 0, 1, 3],
    scores: [18, 24],
    currentPlayer: Player.One,
    bestMove: 4,
    explanation: 'A5 avec 19 graines fait un tour complet + 5 cases. La distribution massive crée des captures sur le camp adverse. Le tour complet saute la case de départ.',
  },
  {
    id: 'p11',
    title: 'Capture en B7',
    description: 'Joueur 2 cherche le coup optimal.',
    difficulty: 'easy',
    board: [3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
    scores: [30, 34],
    currentPlayer: Player.Two,
    bestMove: 11,
    explanation: 'B5 (case 11) avec 2 graines : première sur B4 (0→1), deuxième sur B3 (0→1). Pas de capture. Mais en descendant vers A1 (case 0) qui a 3 graines, B5 atteint A1 → 3+1=4 = capture !',
  },
  {
    id: 'p12',
    title: 'Course au 36',
    description: 'Vous avez 33 points. Trouvez le coup qui capture exactement 3+ graines.',
    difficulty: 'medium',
    board: [0, 0, 0, 0, 3, 0, 0, 0, 1, 3, 0, 0, 1, 2],
    scores: [33, 27],
    currentPlayer: Player.One,
    bestMove: 4,
    explanation: 'A5 avec 3 graines atterrit sur B1 (case 7, 0+1=1, pas de capture). Mais B2 (case 8, 1+1=2) = capture, B3 (case 9, 3+1=4) = capture en chaîne. Total = 6 graines. 33+6 = 39 > 35 !',
  },
];

export function getPuzzles(): Puzzle[] {
  return PUZZLES;
}

export function getDailyPuzzle(): Puzzle {
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  const index = daysSinceEpoch % PUZZLES.length;
  return PUZZLES[index];
}

export function getPuzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find(p => p.id === id);
}

export function getPuzzlesByDifficulty(difficulty: Puzzle['difficulty']): Puzzle[] {
  return PUZZLES.filter(p => p.difficulty === difficulty);
}

export function checkPuzzleAnswer(puzzle: Puzzle, pitIndex: number): { correct: boolean; captured: number } {
  const state: GameState = {
    board: [...puzzle.board],
    scores: { [Player.One]: puzzle.scores[0], [Player.Two]: puzzle.scores[1] },
    currentPlayer: puzzle.currentPlayer,
    status: GameStatus.Playing,
    winner: null,
    message: '',
    isSolidarityMode: false,
    solidarityBeneficiary: null,
  };

  const validation = isValidMove(state, pitIndex);
  if (!validation.valid) return { correct: false, captured: 0 };

  const result = executeMove(state, pitIndex);
  const captured = result.scores[puzzle.currentPlayer] - puzzle.scores[puzzle.currentPlayer === Player.One ? 0 : 1];

  return {
    correct: pitIndex === puzzle.bestMove,
    captured,
  };
}
