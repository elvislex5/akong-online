/**
 * Game Recorder — Enregistre les parties pour l'apprentissage par imitation.
 *
 * Capture chaque coup joué (humain ou IA) et sauvegarde
 * la partie complète en JSON dans localStorage.
 *
 * Format d'un enregistrement :
 * {
 *   id: string,
 *   date: string,
 *   mode: string,              // "VsAI", "LocalMultiplayer", "Online"
 *   player1: string,           // nom ou "human"/"AI"
 *   player2: string,
 *   aiDifficulty?: string,
 *   moves: number[],           // séquence de pit indices (0-13)
 *   initialBoard: number[],    // plateau initial (normalement [5,5,...])
 *   winner: number | null,     // 0=P1, 1=P2, -1=Draw, null=abandoned
 *   finalScores: [number, number],
 *   totalMoves: number,
 *   durationMs: number,
 * }
 */

export interface GameRecord {
  id: string;
  date: string;
  mode: string;
  player1: string;
  player2: string;
  aiDifficulty?: string;
  moves: number[];
  policies?: number[][];   // Distribution MCTS par coup neural (7 valeurs, indices relatifs 0-6)
  initialBoard: number[];
  winner: number | null;   // 0, 1, -1 (draw), null (abandoned)
  finalScores: [number, number];
  totalMoves: number;
  durationMs: number;
}

const STORAGE_KEY = 'songo_game_records';
const MAX_RECORDS = 500; // Garder les 500 dernières parties

class GameRecorder {
  private currentMoves: number[] = [];
  private currentPolicies: (number[] | null)[] = []; // null = coup non-neural
  private pendingPolicy: number[] | null = null;      // Policy MCTS du prochain coup neural
  private initialBoard: number[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private metadata: Partial<GameRecord> = {};

  /**
   * Commence l'enregistrement d'une nouvelle partie.
   */
  startRecording(options: {
    mode: string;
    player1: string;
    player2: string;
    aiDifficulty?: string;
    initialBoard: number[];
  }): void {
    this.currentMoves = [];
    this.currentPolicies = [];
    this.initialBoard = [...options.initialBoard];
    this.startTime = Date.now();
    this.isRecording = true;
    this.metadata = {
      mode: options.mode,
      player1: options.player1,
      player2: options.player2,
      aiDifficulty: options.aiDifficulty,
    };
  }

  /**
   * Prépare la policy MCTS qui sera attachée au prochain recordMove.
   * Appelé juste avant playMove() pour les coups neuraux.
   */
  setPendingPolicy(policy: number[]): void {
    this.pendingPolicy = policy;
  }

  /**
   * Enregistre un coup joué.
   * Consomme automatiquement la pendingPolicy si elle a été définie.
   */
  recordMove(pitIndex: number): void {
    if (!this.isRecording) return;
    this.currentMoves.push(pitIndex);
    this.currentPolicies.push(this.pendingPolicy);
    this.pendingPolicy = null;
  }

  /**
   * Termine l'enregistrement et sauvegarde la partie.
   */
  stopRecording(winner: number | null, scores: [number, number]): GameRecord | null {
    if (!this.isRecording) return null;
    this.isRecording = false;

    // Inclure les policies seulement si au moins un coup neural a une distribution
    const hasPolicies = this.currentPolicies.some(p => p !== null);

    const record: GameRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: this.metadata.mode || 'unknown',
      player1: this.metadata.player1 || 'unknown',
      player2: this.metadata.player2 || 'unknown',
      aiDifficulty: this.metadata.aiDifficulty,
      moves: [...this.currentMoves],
      ...(hasPolicies && { policies: this.currentPolicies.map(p => p ?? []) }),
      initialBoard: this.initialBoard,
      winner,
      finalScores: scores,
      totalMoves: this.currentMoves.length,
      durationMs: Date.now() - this.startTime,
    };

    this._saveRecord(record);
    
    // Automatically upload to local AI pipeline if possible
    this._uploadToServer(record);
    
    return record;
  }

  /**
   * Annule l'enregistrement en cours (partie abandonnée).
   */
  cancelRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;
  }

  /**
   * Récupère toutes les parties enregistrées.
   */
  getRecords(): GameRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Exporte toutes les parties en JSON (pour le training Python).
   */
  exportJSON(): string {
    const records = this.getRecords();
    return JSON.stringify(records, null, 2);
  }

  /**
   * Exporte et déclenche un téléchargement.
   */
  downloadExport(filename: string = 'songo_games.json'): void {
    const json = this.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Nombre de parties enregistrées.
   */
  get recordCount(): number {
    return this.getRecords().length;
  }

  /**
   * Efface toutes les parties.
   */
  clearRecords(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // --- Internal ---

  private async _uploadToServer(record: GameRecord): Promise<void> {
    try {
      const response = await fetch('http://localhost:3002/api/upload-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record)
      });
      if (response.ok) {
      } else {
        console.warn('[GameRecorder] AI pipeline server rejected the upload:', response.statusText);
      }
    } catch (e) {
    }
  }

  private _saveRecord(record: GameRecord): void {
    const records = this.getRecords();
    records.push(record);

    // Garder seulement les N dernières
    const trimmed = records.slice(-MAX_RECORDS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('[GameRecorder] Failed to save:', e);
    }
  }
}

export const gameRecorder = new GameRecorder();

if (typeof window !== 'undefined') {
  (window as any).gameRecorder = gameRecorder;
}