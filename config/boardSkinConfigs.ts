/**
 * Board Skin Configuration System
 *
 * This file contains calibration data for each board skin.
 * Positions are in percentage (%) relative to the board image dimensions.
 * Format: { x: %, y: %, w: %, h: % } where (0,0) is top-left
 */

export interface PitPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GranaryPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardSkinConfig {
  skinId: string;
  skinName: string;
  imageUrl: string;
  pitPositions: { [pitIndex: string]: PitPosition };
  granaryPositions: {
    playerOne: GranaryPosition;
    playerTwo: GranaryPosition;
  };
}

/**
 * Default configuration for Classic board
 * These positions were calibrated using the in-game calibration tool
 */
export const CLASSIC_CONFIG: BoardSkinConfig = {
  skinId: 'classic',
  skinName: 'Classic Wood',
  imageUrl: '/boards/classic.png',
  pitPositions: {
    "0": { x: 80.5, y: 71.0, w: 8.0, h: 16.0 },
    "1": { x: 70.4, y: 71.0, w: 8.0, h: 16.0 },
    "2": { x: 59.9, y: 71.0, w: 8.0, h: 16.0 },
    "3": { x: 49.6, y: 71.0, w: 8.0, h: 16.0 },
    "4": { x: 39.2, y: 71.0, w: 8.0, h: 16.0 },
    "5": { x: 28.8, y: 71.0, w: 8.0, h: 16.0 },
    "6": { x: 18.7, y: 71.0, w: 8.0, h: 16.0 },
    "7": { x: 18.5, y: 26.6, w: 8.0, h: 16.0 },
    "8": { x: 28.7, y: 26.6, w: 8.0, h: 16.0 },
    "9": { x: 39.3, y: 26.6, w: 8.0, h: 16.0 },
    "10": { x: 49.6, y: 26.6, w: 8.0, h: 16.0 },
    "11": { x: 59.9, y: 26.6, w: 8.0, h: 16.0 },
    "12": { x: 70.5, y: 26.6, w: 8.0, h: 16.0 },
    "13": { x: 80.7, y: 26.6, w: 8.0, h: 16.0 }
  },
  granaryPositions: {
    playerOne: { x: 26.1, y: 48.5, w: 17.0, h: 15.5 },
    playerTwo: { x: 73.4, y: 48.5, w: 17.0, h: 15.5 }
  }
};

/**
 * Configuration for Futuriste board
 * Calibrated positions using the in-game calibration tool
 */
export const FUTURISTE_CONFIG: BoardSkinConfig = {
  skinId: 'futuriste',
  skinName: 'Futuriste',
  imageUrl: '/boards/futuriste.png',
  pitPositions: {
    "0": { x: 80.5, y: 70.4, w: 8.5, h: 15.5 },
    "1": { x: 70.5, y: 70.5, w: 8.5, h: 15.5 },
    "2": { x: 60.0, y: 70.5, w: 8.5, h: 15.5 },
    "3": { x: 49.7, y: 70.5, w: 8.5, h: 15.5 },
    "4": { x: 39.2, y: 70.5, w: 8.5, h: 15.5 },
    "5": { x: 28.9, y: 70.5, w: 8.5, h: 15.5 },
    "6": { x: 18.7, y: 70.5, w: 8.5, h: 15.5 },
    "7": { x: 18.7, y: 27.5, w: 8.5, h: 15.5 },
    "8": { x: 28.9, y: 27.5, w: 8.5, h: 15.5 },
    "9": { x: 39.3, y: 27.5, w: 8.5, h: 15.5 },
    "10": { x: 49.7, y: 27.5, w: 8.5, h: 15.5 },
    "11": { x: 60.1, y: 27.5, w: 8.5, h: 15.5 },
    "12": { x: 70.5, y: 27.5, w: 8.5, h: 15.5 },
    "13": { x: 80.5, y: 27.5, w: 8.5, h: 15.5 }
  },
  granaryPositions: {
    playerOne: { x: 25.8, y: 48.5, w: 14.0, h: 18.5 },
    playerTwo: { x: 73.4, y: 48.5, w: 14.0, h: 18.5 }
  }
};

/**
 * Configuration for Original Dark board (akong.png)
 * Uses the same positions as Classic
 */
export const ORIGINAL_DARK_CONFIG: BoardSkinConfig = {
  skinId: 'original-dark',
  skinName: 'Original Dark',
  imageUrl: '/akong.png',
  pitPositions: CLASSIC_CONFIG.pitPositions,
  granaryPositions: CLASSIC_CONFIG.granaryPositions
};

/**
 * Default positions for the rectangular skin family (Ébène / Iroko / Terre cuite).
 * All three skins share the same canonical 1472×704 geometry per the board-skin
 * canon. Values estimated visually for an aspect-[21/9] container with
 * object-cover; users can refine via the BoardCalibrationTool if needed.
 */
const RECTANGULAR_PIT_POSITIONS: { [pitIndex: string]: PitPosition } = {
  // Bottom row (Player One): 0 → 6 from right to left
  "0":  { x: 81.0, y: 78.0, w: 8.0, h: 18.0 },
  "1":  { x: 70.5, y: 78.0, w: 8.0, h: 18.0 },
  "2":  { x: 60.0, y: 78.0, w: 8.0, h: 18.0 },
  "3":  { x: 50.0, y: 78.0, w: 8.0, h: 18.0 },
  "4":  { x: 40.0, y: 78.0, w: 8.0, h: 18.0 },
  "5":  { x: 29.5, y: 78.0, w: 8.0, h: 18.0 },
  "6":  { x: 19.0, y: 78.0, w: 8.0, h: 18.0 },
  // Top row (Player Two): 7 → 13 from left to right
  "7":  { x: 19.0, y: 21.0, w: 8.0, h: 18.0 },
  "8":  { x: 29.5, y: 21.0, w: 8.0, h: 18.0 },
  "9":  { x: 40.0, y: 21.0, w: 8.0, h: 18.0 },
  "10": { x: 50.0, y: 21.0, w: 8.0, h: 18.0 },
  "11": { x: 60.0, y: 21.0, w: 8.0, h: 18.0 },
  "12": { x: 70.5, y: 21.0, w: 8.0, h: 18.0 },
  "13": { x: 81.0, y: 21.0, w: 8.0, h: 18.0 },
};

const RECTANGULAR_GRANARY_POSITIONS = {
  playerOne: { x: 9.0,  y: 50.0, w: 7.0, h: 55.0 },
  playerTwo: { x: 91.0, y: 50.0, w: 7.0, h: 55.0 },
};

export const EBENE_CONFIG: BoardSkinConfig = {
  skinId: 'ebene',
  skinName: 'Ébène',
  imageUrl: '/boards/ebene.png',
  pitPositions: RECTANGULAR_PIT_POSITIONS,
  granaryPositions: RECTANGULAR_GRANARY_POSITIONS,
};

export const IROKO_CONFIG: BoardSkinConfig = {
  skinId: 'iroko',
  skinName: 'Iroko',
  imageUrl: '/boards/iroko.png',
  pitPositions: RECTANGULAR_PIT_POSITIONS,
  granaryPositions: RECTANGULAR_GRANARY_POSITIONS,
};

export const TERRE_CONFIG: BoardSkinConfig = {
  skinId: 'terre',
  skinName: 'Terre cuite',
  imageUrl: '/boards/terre.png',
  pitPositions: RECTANGULAR_PIT_POSITIONS,
  granaryPositions: RECTANGULAR_GRANARY_POSITIONS,
};

/**
 * Map of image URLs to their configurations
 * This is used to quickly look up the config for a given board skin
 */
export const BOARD_SKIN_CONFIGS: { [imageUrl: string]: BoardSkinConfig } = {
  '/boards/classic.png': CLASSIC_CONFIG,
  '/boards/futuriste.png': FUTURISTE_CONFIG,
  '/akong.png': ORIGINAL_DARK_CONFIG,
  '/boards/ebene.png': EBENE_CONFIG,
  '/boards/iroko.png': IROKO_CONFIG,
  '/boards/terre.png': TERRE_CONFIG,
};

// DB calibration cache — populated by loadAllCalibrations() at app startup
let dbCalibrationCache: { [imageUrl: string]: { pitPositions: { [key: string]: PitPosition }; granaryPositions: { playerOne: GranaryPosition; playerTwo: GranaryPosition } } } = {};

/**
 * Set the DB calibration cache (called from app init after loading from Supabase)
 */
export function setCalibrationCache(cache: typeof dbCalibrationCache): void {
  dbCalibrationCache = cache;
}

/**
 * Get configuration for a board skin
 * Priority: DB cache → hardcoded fallback → Classic default
 */
export function getBoardConfig(imageUrl: string): BoardSkinConfig {
  // Try DB cache first
  const dbCalibration = dbCalibrationCache[imageUrl];
  if (dbCalibration) {
    const hardcoded = BOARD_SKIN_CONFIGS[imageUrl];
    return {
      skinId: hardcoded?.skinId || imageUrl,
      skinName: hardcoded?.skinName || imageUrl,
      imageUrl,
      pitPositions: dbCalibration.pitPositions,
      granaryPositions: dbCalibration.granaryPositions,
    };
  }

  return BOARD_SKIN_CONFIGS[imageUrl] || CLASSIC_CONFIG;
}

/**
 * Get all available board configurations
 */
export function getAllBoardConfigs(): BoardSkinConfig[] {
  return Object.values(BOARD_SKIN_CONFIGS);
}
