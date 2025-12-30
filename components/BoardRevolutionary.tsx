import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GameState, Player, GameStatus, GameMode } from '../types';
import { isValidMove } from '../services/songoLogic';
import Hand from './Hand';
import type { Profile } from '../services/supabase';
import { getBoardConfig } from '../config/boardSkinConfigs';

interface BoardRevolutionaryProps {
  gameState: GameState;
  onMove: (index: number) => void;
  gameMode: GameMode;
  onEditPit?: (index: number) => void;
  onEditScore?: (player: Player) => void;
  isAnimating: boolean;
  handState: { pitIndex: number | null; seedCount: number };
  aiPlayer?: Player | null;
  playerProfiles?: { [key in Player]: Profile | null };
  isSimulationManual?: boolean;
  invertView?: boolean;
  boardSkinUrl?: string;
}

// DEPRECATED: PIT_POSITIONS is now loaded dynamically from boardSkinConfigs
// Keeping this for backward compatibility during migration
const PIT_POSITIONS_LEGACY = {
  "0": {
    "x": 86.7,
    "y": 60.4,
    "w": 10.4,
    "h": 15.8
  },
  "1": {
    "x": 74.2,
    "y": 60.8,
    "w": 11.7,
    "h": 16.3
  },
  "2": {
    "x": 61.7,
    "y": 60.8,
    "w": 11.7,
    "h": 16.3
  },
  "3": {
    "x": 49.3,
    "y": 60.4,
    "w": 10.9,
    "h": 15.4
  },
  "4": {
    "x": 37,
    "y": 61.3,
    "w": 11.8,
    "h": 15.1
  },
  "5": {
    "x": 24.4,
    "y": 61.9,
    "w": 11.2,
    "h": 16
  },
  "6": {
    "x": 12.1,
    "y": 62,
    "w": 10.7,
    "h": 15
  },
  "7": {
    "x": 15.9,
    "y": 33.9,
    "w": 9.2,
    "h": 11.6
  },
  "8": {
    "x": 27.1,
    "y": 34,
    "w": 9.5,
    "h": 12.7
  },
  "9": {
    "x": 38.1,
    "y": 34.1,
    "w": 9.5,
    "h": 12.3
  },
  "10": {
    "x": 49.3,
    "y": 34,
    "w": 9.5,
    "h": 12.7
  },
  "11": {
    "x": 60.5,
    "y": 33.5,
    "w": 9.6,
    "h": 13.4
  },
  "12": {
    "x": 71.5,
    "y": 33.7,
    "w": 9.9,
    "h": 12.9
  },
  "13": {
    "x": 82.6,
    "y": 33.4,
    "w": 9.5,
    "h": 13.2
  }
};

const BoardRevolutionary: React.FC<BoardRevolutionaryProps> = ({
  gameState,
  onMove,
  gameMode,
  onEditPit,
  onEditScore,
  isAnimating,
  handState,
  aiPlayer,
  playerProfiles,
  isSimulationManual,
  invertView = false,
  boardSkinUrl = '/akong.png'
}) => {
  const { board, currentPlayer, scores, status } = gameState;

  // Get board configuration based on current skin
  const boardConfig = useMemo(() => getBoardConfig(boardSkinUrl), [boardSkinUrl]);
  const PIT_POSITIONS = boardConfig.pitPositions;
  const GRANARY_POSITIONS = boardConfig.granaryPositions;

  const isSimulationSetup = gameMode === GameMode.Simulation && status === GameStatus.Setup;
  const isAiMode = gameMode === GameMode.VsAI;
  const isOnline = gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest;
  const isSpectator = gameMode === GameMode.OnlineSpectator;
  const isSimulationPlaying = gameMode === GameMode.Simulation && status === GameStatus.Playing;

  const isPlayerTwoPlayable = isSimulationSetup ||
    (gameMode === GameMode.LocalMultiplayer && currentPlayer === Player.Two) ||
    (isAiMode && aiPlayer !== Player.Two && currentPlayer === Player.Two) ||
    (isSimulationPlaying && isSimulationManual && currentPlayer === Player.Two) ||
    (gameMode === GameMode.OnlineGuest && currentPlayer === Player.Two);

  const isPlayerOnePlayable = isSimulationSetup ||
    (gameMode === GameMode.LocalMultiplayer && currentPlayer === Player.One) ||
    (isAiMode && aiPlayer !== Player.One && currentPlayer === Player.One) ||
    (isSimulationPlaying && isSimulationManual && currentPlayer === Player.One) ||
    (gameMode === GameMode.OnlineHost && currentPlayer === Player.One);

  const handlePitClick = (idx: number) => {
    if (isAnimating || isSpectator) return;
    if (isSimulationSetup && onEditPit) {
      onEditPit(idx);
    } else {
      onMove(idx);
    }
  };

  const getTopLabel = () => {
    const topPlayer = invertView ? Player.One : Player.Two;
    const profile = playerProfiles?.[topPlayer];
    if (profile) return profile.display_name || profile.username;
    if (isSpectator) return 'JOUEUR 2';
    if (invertView) return 'JOUEUR 1';
    if (isAiMode && aiPlayer === Player.Two) return 'ORDINATEUR';
    if (gameMode === GameMode.Simulation) return 'IA (HAUT)';
    return 'JOUEUR 2';
  };

  const getBottomLabel = () => {
    const bottomPlayer = invertView ? Player.Two : Player.One;
    const profile = playerProfiles?.[bottomPlayer];
    if (profile) return profile.display_name || profile.username;
    if (isSpectator) return 'JOUEUR 1';
    if (invertView) return 'JOUEUR 2';
    if (isAiMode && aiPlayer === Player.One) return 'ORDINATEUR';
    if (gameMode === GameMode.Simulation) return 'IA (BAS)';
    return 'JOUEUR 1';
  };

  // Render captured seeds in granaries/stores
  const renderGranary = (player: Player) => {
    const score = scores[player];
    // En mode setup, toujours afficher le score (même 0) pour permettre l'édition
    if (score === 0 && !isSimulationSetup) return null;

    // Position des greniers sur l'image (calibrées dynamiquement selon le tablier)
    const granaryPosRaw = player === Player.One
      ? GRANARY_POSITIONS.playerOne   // Grenier GAUCHE (Joueur 1 - bas)
      : GRANARY_POSITIONS.playerTwo;  // Grenier DROIT (Joueur 2 - haut)

    const granaryPosition = invertView
      ? { ...granaryPosRaw, x: 100 - granaryPosRaw.x, y: 100 - granaryPosRaw.y }
      : granaryPosRaw;

    const maxVisuals = Math.min(score, 15); // Reduced from 20 for better visibility
    const sizeClass = score > 10 ? 'w-1 h-1 sm:w-1.5 sm:h-1.5' : 'w-1.5 h-1.5 sm:w-2 sm:h-2'; // Smaller seeds
    const cols = 3; // Colonnes fixes pour grenier
    const rows = Math.ceil(maxVisuals / cols) || 1; // Avoid division by zero if maxVisuals is 0
    const cellWidth = 80 / cols;
    const cellHeight = 90 / rows;

    const visualSeeds: JSX.Element[] = [];
    if (score > 0) {
      for (let i = 0; i < maxVisuals; i++) {
        const seedRandom = (i * 9301 + player * 49297) % 233280;
        const rndX = (seedRandom % 100) / 100;
        const rndY = ((seedRandom * 17) % 100) / 100;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const baseX = 10 + col * cellWidth + cellWidth / 2;
        const baseY = 5 + row * cellHeight + cellHeight / 2;
        const jitterX = (rndX - 0.5) * (cellWidth * 0.6);
        const jitterY = (rndY - 0.5) * (cellHeight * 0.6);
        const finalX = Math.max(5, Math.min(95, baseX + jitterX));
        const finalY = Math.max(5, Math.min(95, baseY + jitterY));

        visualSeeds.push(
          <div
            key={i}
            className={`absolute ${sizeClass} rounded-full`}
            style={{
              background: 'radial-gradient(circle at 30% 30%, #2d2d2d, #1a1a1a 50%, #0a0a0a)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.2)',
              left: `${finalX}%`,
              top: `${finalY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 5 + i,
            }}
          />
        );
      }
    }

    // Determiner la position pour le score à l'extrémité
    const isLeftGranary = granaryPosition.x < 50; // Gauche si x < 50%
    const scorePosition = isLeftGranary ? '-left-12 sm:-left-16' : '-right-12 sm:-right-16';

    return (
      <div
        className="absolute"
        style={{
          left: `${granaryPosition.x}%`,
          top: `${granaryPosition.y}%`,
          width: `${granaryPosition.w}%`,
          height: `${granaryPosition.h}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="relative w-full h-full">
          {visualSeeds}

          {/* Score Display - Simple text only */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${scorePosition} z-50 ${isSimulationSetup ? 'cursor-pointer hover:scale-110 transition-transform' : 'pointer-events-none'}`}
            style={{
              transform: `translateY(-50%)`
            }}
            onClick={isSimulationSetup ? () => onEditScore?.(player) : undefined}
            onKeyDown={isSimulationSetup ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEditScore?.(player);
              }
            } : undefined}
            role={isSimulationSetup ? "button" : undefined}
            tabIndex={isSimulationSetup ? 0 : -1}
            aria-label={`Score Joueur ${player === Player.One ? '1' : '2'}: ${score} graines${isSimulationSetup ? ', modifier' : ''}`}
            title={isSimulationSetup ? "Modifier le score" : undefined}
          >
            <span className="font-black text-2xl sm:text-3xl text-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.7)]" style={{
              textShadow: '0 0 12px rgba(251, 191, 36, 0.5), 0 0 24px rgba(251, 191, 36, 0.2)'
            }}>
              {score}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderPit = (pitIndex: number) => {
    const validation = isValidMove(gameState, pitIndex);
    const isMyPit = isOnline
      ? (gameMode === GameMode.OnlineHost && pitIndex < 7) || (gameMode === GameMode.OnlineGuest && pitIndex >= 7)
      : true;

    const isPlayable = (isSimulationSetup ||
      (isPlayerTwoPlayable && pitIndex >= 7) ||
      (isPlayerOnePlayable && pitIndex < 7)) && isMyPit && !isSpectator;

    const canPlay = !isAnimating && !isSimulationSetup && isPlayable && validation.valid;
    let position = PIT_POSITIONS[pitIndex as keyof typeof PIT_POSITIONS];
    if (invertView) {
      position = { ...position, x: 100 - position.x, y: 100 - position.y };
    }
    const seeds = board[pitIndex];

    const visualSeeds = React.useMemo(() => {
      const visuals: JSX.Element[] = [];
      if (!seeds) return visuals;
      const maxVisuals = Math.min(seeds, 18); // Reduced from 25 for better overview
      const sizeClass = seeds > 8 ? 'w-1.5 h-1.5 sm:w-2 sm:h-2' : 'w-2 h-2 sm:w-2.5 sm:h-2.5'; // Smaller seeds, responsive
      const cols = Math.ceil(Math.sqrt(maxVisuals * 1.2));
      const rows = Math.ceil(maxVisuals / cols);
      const cellWidth = 80 / cols;
      const cellHeight = 70 / rows;
      for (let i = 0; i < maxVisuals; i++) {
        const seedRandom = (i * 9301 + pitIndex * 49297) % 233280;
        const rndX = (seedRandom % 100) / 100;
        const rndY = ((seedRandom * 17) % 100) / 100;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const baseX = 10 + col * cellWidth + cellWidth / 2;
        const baseY = 15 + row * cellHeight + cellHeight / 2;
        const jitterX = (rndX - 0.5) * (cellWidth * 0.8);
        const jitterY = (rndY - 0.5) * (cellHeight * 0.8);
        const finalX = Math.max(5, Math.min(95, baseX + jitterX));
        const finalY = Math.max(5, Math.min(95, baseY + jitterY));
        visuals.push(
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            className={`absolute ${sizeClass} rounded-full seed-3d`}
            style={{
              background: 'radial-gradient(circle at 30% 30%, #2d2d2d, #1a1a1a 50%, #0a0a0a)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)',
              left: `${finalX}%`,
              top: `${finalY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10 + i,
            }}
          />
        );
      }
      return visuals;
    }, [seeds, pitIndex]);

    const isTopPit = pitIndex >= 7 && pitIndex <= 13; // North player's pits
    const isBottomPit = pitIndex >= 0 && pitIndex <= 6; // South player's pits (user's side)

    return (
      <motion.div
        key={pitIndex}
        id={`pit-${pitIndex}`}
        className={`absolute group rounded-full focus-visible-ring`}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          width: `${position.w}%`,
          height: `${position.h}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onClick={() => handlePitClick(pitIndex)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePitClick(pitIndex);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Case ${pitIndex + 1}, ${seeds} graines${isPlayable ? ', jouable' : ''}`}
        aria-disabled={!isPlayable && !isSimulationSetup}
      >
        <div className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-200`}>
          {visualSeeds}
          {seeds > 0 && (
            <div
              className={`absolute ${(isTopPit && !invertView) || (isBottomPit && invertView) ? '-top-8' : ''} ${(isBottomPit && !invertView) || (isTopPit && invertView) ? '-bottom-8' : ''}
                                        left-1/2 -translate-x-1/2
                                        min-w-[1.75rem] h-[1.75rem]
                                        flex items-center justify-center
                                        px-2 rounded-full
                                        font-black text-sm font-mono
                                        z-20 pointer-events-none
                                        transition-all duration-300
                                        ${seeds > 0 ? 'text-white bg-black/50' : 'text-transparent'}
                                      `}
            >
              {seeds}
            </div>
          )}
          {seeds > 18 && (
            <div
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(139,90,43,0.5)', border: '1px solid rgba(255,140,0,0.5)' }}>
                <span className="text-amber-400 text-xs font-bold">+{seeds - 18}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 relative gap-4">
      <Hand isActive={isAnimating} pitIndex={handState.pitIndex} seedCount={handState.seedCount} />

      {/* TOP PLAYER NAMEPLATE - Compact Mobile First */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-xl border transition-all duration-300 ${((invertView && currentPlayer === Player.One) || (!invertView && currentPlayer === Player.Two)) && status === GameStatus.Playing
          ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-amber-500 shadow-lg shadow-amber-500/30'
          : 'bg-white/5 border-white/10'
          }`}
      >
        <div className="flex items-center justify-center">
          <span className={`text-sm sm:text-base md:text-lg font-bold uppercase tracking-wide truncate ${((invertView && currentPlayer === Player.One) || (!invertView && currentPlayer === Player.Two)) && status === GameStatus.Playing
            ? 'text-amber-400'
            : 'text-white/60'
            }`}>
            {getTopLabel()}
          </span>
        </div>
      </motion.div>

      {/* BOARD IMAGE WITH POSITIONED PITS */}
      <div
        className="relative w-full max-w-5xl aspect-[21/9] shadow-2xl"
        role="application"
        aria-label="Plateau de jeu Songo"
      >
        <img
          src={boardSkinUrl}
          alt="Illustration du plateau"
          className="absolute inset-0 w-full h-full object-cover rounded-3xl"
        />

        {/* Render all pits */}
        {Object.keys(PIT_POSITIONS).map((idx) => renderPit(parseInt(idx)))}
        {/* Render granaries with captured seeds */}
        {renderGranary(Player.One)}
        {renderGranary(Player.Two)}
      </div>

      {/* BOTTOM PLAYER NAMEPLATE - Compact Mobile First */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-xl border transition-all duration-300 ${((invertView && currentPlayer === Player.Two) || (!invertView && currentPlayer === Player.One)) && status === GameStatus.Playing
          ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-blue-500 shadow-lg shadow-blue-500/30'
          : 'bg-white/5 border-white/10'
          }`}
      >
        <div className="flex items-center justify-center">
          <span className={`text-sm sm:text-base md:text-lg font-bold uppercase tracking-wide truncate ${((invertView && currentPlayer === Player.Two) || (!invertView && currentPlayer === Player.One)) && status === GameStatus.Playing
            ? 'text-blue-400'
            : 'text-white/60'
            }`}>
            {getBottomLabel()}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default BoardRevolutionary;
