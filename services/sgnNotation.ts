import { GameState, Player, GameStatus } from '../types';
import { executeMove, WINNING_SCORE } from './songoLogic';

const PIT_LABELS_P1 = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
const PIT_LABELS_P2 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'];

export function pitToSGN(pitIndex: number): string {
  if (pitIndex >= 0 && pitIndex <= 6) return PIT_LABELS_P1[pitIndex];
  if (pitIndex >= 7 && pitIndex <= 13) return PIT_LABELS_P2[pitIndex - 7];
  return '??';
}

export function sgnToPit(sgn: string): number {
  const upper = sgn.toUpperCase().trim();
  const p1 = PIT_LABELS_P1.indexOf(upper);
  if (p1 !== -1) return p1;
  const p2 = PIT_LABELS_P2.indexOf(upper);
  if (p2 !== -1) return p2 + 7;
  return -1;
}

export interface SGNMove {
  moveNumber: number;
  playerOne?: string;
  playerTwo?: string;
}

export interface SGNEntry {
  pitIndex: number;
  label: string;
  player: Player;
  captured: number;
  scoreAfter: [number, number];
  isGameEnd: boolean;
  resultText?: string;
}

export function buildSGNEntries(initialBoard: number[], moves: number[]): SGNEntry[] {
  const entries: SGNEntry[] = [];
  let state: GameState = {
    board: [...initialBoard],
    scores: { [Player.One]: 0, [Player.Two]: 0 },
    currentPlayer: Player.One,
    status: GameStatus.Playing,
    winner: null,
    message: '',
    isSolidarityMode: false,
    solidarityBeneficiary: null,
  };

  for (const pitIndex of moves) {
    const player = state.currentPlayer;
    const scoreBefore = state.scores[player];
    const nextState = executeMove(state, pitIndex);
    const captured = nextState.scores[player] - scoreBefore;
    const isGameEnd = nextState.status === GameStatus.Finished;

    let resultText: string | undefined;
    if (isGameEnd) {
      if (nextState.winner === Player.One) resultText = '1-0';
      else if (nextState.winner === Player.Two) resultText = '0-1';
      else resultText = '½-½';
    }

    let label = pitToSGN(pitIndex);
    if (captured > 0) label += `x${captured}`;

    entries.push({
      pitIndex,
      label,
      player,
      captured,
      scoreAfter: [nextState.scores[Player.One], nextState.scores[Player.Two]],
      isGameEnd,
      resultText,
    });

    state = nextState;
    if (isGameEnd) break;
  }

  return entries;
}

export function formatSGNText(
  entries: SGNEntry[],
  metadata?: { player1?: string; player2?: string; date?: string; result?: string }
): string {
  const lines: string[] = [];

  if (metadata) {
    if (metadata.player1) lines.push(`[Joueur1 "${metadata.player1}"]`);
    if (metadata.player2) lines.push(`[Joueur2 "${metadata.player2}"]`);
    if (metadata.date) lines.push(`[Date "${metadata.date}"]`);
    if (metadata.result) lines.push(`[Résultat "${metadata.result}"]`);
    lines.push('');
  }

  const parts: string[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const p1Move = entries[i].label;
    const p2Move = entries[i + 1]?.label || '';
    parts.push(`${moveNum}. ${p1Move} ${p2Move}`.trim());
  }

  const lastEntry = entries[entries.length - 1];
  if (lastEntry?.resultText) {
    parts.push(lastEntry.resultText);
  }

  lines.push(parts.join(' '));
  return lines.join('\n');
}
