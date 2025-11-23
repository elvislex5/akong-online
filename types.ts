
export enum Player {
  One = 0, // Bottom Player (Moves Right to Left visually, indices 0-6)
  Two = 1  // Top Player (Moves Left to Right visually, indices 7-13)
}

export enum GameStatus {
  Playing,
  Finished,
  Setup // Used for Simulation mode setup
}

export enum GameMode {
  LocalMultiplayer,
  VsAI,
  Simulation,
  OnlineHost,
  OnlineGuest,
  OnlineSpectator // New mode for watchers
}

export interface GameState {
  board: number[]; // Array of 14 integers (pits)
  scores: {
    [Player.One]: number;
    [Player.Two]: number;
  };
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | 'Draw' | null;
  message: string;
  isSolidarityMode: boolean; // True if current player is in solidarity need
  solidarityBeneficiary: Player | null;
}

export interface MoveResult {
  newState: GameState;
  isValid: boolean;
  error?: string;
}

// Animation Types
export type AnimationStepType = 'PICKUP' | 'MOVE' | 'DROP' | 'CAPTURE_PHASE' | 'SCORE' | 'WAIT';

export interface AnimationStep {
  type: AnimationStepType;
  pitIndex?: number; // Target pit index for movement/drop
  seedsInHand?: number; // How many seeds the hand has at this step
  boardState?: number[]; // Snapshot of board at this step (optional, for precise syncing)
  description?: string;
  capturedAmount?: number;
}

// Online Messages
export type OnlineMessageType = 'SYNC_STATE' | 'MOVE_INTENT' | 'REMOTE_MOVE' | 'RESTART' | 'PLAYER_JOINED' | 'ASSIGN_ROLE' | 'GUEST_PROFILE_SHARE' | 'REMATCH_REQUEST';

export interface OnlineMessage {
  type: OnlineMessageType;
  payload?: any;
}
