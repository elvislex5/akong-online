import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GameState, Player, GameStatus, GameMode, GameSystem } from '../types';
import { isValidMove } from '../services/gameEngine';
import Hand from './Hand';
import type { Profile } from '../services/supabase';
import { getBoardConfig } from '../config/boardSkinConfigs';
import { DEFAULT_SEED_COLOR, type SeedColorConfig } from '../config/seedColors';

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
  gameSystem?: GameSystem;
  seedColor?: SeedColorConfig;
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
  boardSkinUrl = '/boards/classic.png',
  gameSystem = 'mgpwem',
  seedColor = DEFAULT_SEED_COLOR,
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

  // Render captured seeds in granaries/stores
  const renderGranary = (player: Player) => {
    const score = scores[player];
    // En mode setup, toujours afficher le score (même 0) pour permettre l'édition
    if (score === 0 && !isSimulationSetup) return null;

    // Each player's granary is rendered into the cavity that appears on
    // the right side of THEIR screen. For the guest (invertView=true), we
    // swap which calibration cavity holds which player's granary, so the
    // guest sees their own granary visually mirrored to where the host
    // would see it. The image itself stays in its natural orientation.
    const granaryPosition = invertView
      ? (player === Player.One ? GRANARY_POSITIONS.playerTwo : GRANARY_POSITIONS.playerOne)
      : (player === Player.One ? GRANARY_POSITIONS.playerOne : GRANARY_POSITIONS.playerTwo);

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
              background: seedColor.gradient,
              boxShadow: seedColor.shadow,
              left: `${finalX}%`,
              top: `${finalY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 5 + i,
            }}
          />
        );
      }
    }

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

          {/* Score — centered ON the granary, badge style matching pit counters.
              Works on any plateau shape (oblong with curved ends OR rectangular
              with raised border) since it stays inside the granary's bounding box. */}
          <div
            className={
              'absolute inset-0 flex items-center justify-center z-50 ' +
              (isSimulationSetup
                ? 'cursor-pointer hover:scale-110 transition-transform'
                : 'pointer-events-none')
            }
            onClick={isSimulationSetup ? () => onEditScore?.(player) : undefined}
            onKeyDown={isSimulationSetup ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEditScore?.(player);
              }
            } : undefined}
            role={isSimulationSetup ? 'button' : undefined}
            tabIndex={isSimulationSetup ? 0 : -1}
            aria-label={`Score Joueur ${player === Player.One ? '1' : '2'}: ${score} graines${isSimulationSetup ? ', modifier' : ''}`}
            title={isSimulationSetup ? 'Modifier le score' : undefined}
          >
            <div className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-clay-900/65 backdrop-blur-[2px]">
              <span
                className="font-display tabular-nums leading-none text-clay-50 select-none"
                style={{
                  fontVariationSettings: '"opsz" 60, "SOFT" 30',
                  fontSize: 'clamp(1.125rem, 2.6vw, 1.75rem)',
                }}
              >
                {score}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPit = (pitIndex: number) => {
    const validation = isValidMove(gameSystem, gameState, pitIndex);
    const isMyPit = isOnline
      ? (gameMode === GameMode.OnlineHost && pitIndex < 7) || (gameMode === GameMode.OnlineGuest && pitIndex >= 7)
      : true;

    const isPlayable = (isSimulationSetup ||
      (isPlayerTwoPlayable && pitIndex >= 7) ||
      (isPlayerOnePlayable && pitIndex < 7)) && isMyPit && !isSpectator;

    const canPlay = !isAnimating && !isSimulationSetup && isPlayable && validation.valid;
    // Visual cavity remap for guest view: each player wants their own row
    // at the bottom of THEIR screen. We don't rotate the plateau image
    // (so the SONGO engraving stays right-side-up). Instead we render
    // pit i in the calibrated cavity (i + 7) % 14, which shifts pits 7-13
    // into the bottom row visually and pits 0-6 into the top.
    const positionIndex = invertView ? (pitIndex + 7) % 14 : pitIndex;
    const position = PIT_POSITIONS[String(positionIndex) as keyof typeof PIT_POSITIONS];
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
              background: seedColor.gradient,
              boxShadow: seedColor.shadow,
              left: `${finalX}%`,
              top: `${finalY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10 + i,
            }}
          />
        );
      }
      return visuals;
    }, [seeds, pitIndex, seedColor]);

    const isTopPit = pitIndex >= 7 && pitIndex <= 13;
    const isBottomPit = pitIndex >= 0 && pitIndex <= 6;

    // Ékang special pit indicators (Mgpwém only)
    const isMgpwem = gameSystem !== 'angbwe';
    const specialLabel = isMgpwem && seeds === 5 ? 'Yini' : isMgpwem && seeds === 14 ? 'Olôa' : isMgpwem && seeds >= 19 ? 'Akuru' : null;

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
          {/* Seed counter — small badge above/below the pit */}
          {seeds > 0 && (
            <div
              className={
                'absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none ' +
                'inline-flex items-center justify-center px-1.5 rounded-full ' +
                'bg-clay-900/65 backdrop-blur-[2px] ' +
                'min-w-[1.25rem] h-5 sm:h-[22px] md:h-6 ' +
                'transition-opacity duration-200 ' +
                ((isTopPit && !invertView) || (isBottomPit && invertView) ? '-top-5 sm:-top-6 md:-top-7 ' : '') +
                ((isBottomPit && !invertView) || (isTopPit && invertView) ? '-bottom-5 sm:-bottom-6 md:-bottom-7 ' : '')
              }
            >
              <span
                className="font-display tabular-nums leading-none text-clay-50 select-none"
                style={{
                  fontVariationSettings: '"opsz" 14, "SOFT" 30',
                  fontSize: 'clamp(10px, 1.4vw, 13px)',
                }}
              >
                {seeds}
              </span>
            </div>
          )}

          {/* Overflow indicator (≥ 19 seeds) — sits inside the pit */}
          {seeds > 18 && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <div className="bg-clay-900/65 backdrop-blur-[2px] rounded-md px-2 py-0.5">
                <span
                  className="font-display tabular-nums leading-none text-clay-50 select-none"
                  style={{
                    fontVariationSettings: '"opsz" 14, "SOFT" 30',
                    fontSize: 'clamp(11px, 1.5vw, 14px)',
                  }}
                >
                  +{seeds - 18}
                </span>
              </div>
            </div>
          )}

          {/* Special label (Yini / Olôa / Akuru) — Ekang term shown above/below the pit */}
          {specialLabel && (
            <div
              className={
                'absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none ' +
                ((isTopPit && !invertView) || (isBottomPit && invertView) ? '-top-6 sm:-top-10 md:-top-14 ' : '') +
                ((isBottomPit && !invertView) || (isTopPit && invertView) ? '-bottom-6 sm:-bottom-10 md:-bottom-14 ' : '')
              }
            >
              <span
                className="font-medium uppercase text-clay-50 select-none whitespace-nowrap"
                style={{
                  fontSize: 'clamp(8px, 1vw, 11px)',
                  letterSpacing: '0.18em',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
                }}
              >
                {specialLabel}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[60rem] mx-auto px-2 sm:px-3 md:px-4 relative">
      <Hand
        isActive={isAnimating}
        pitIndex={handState.pitIndex}
        seedCount={handState.seedCount}
        currentPlayer={gameState.currentPlayer}
        invertView={invertView}
      />

      {/* BOARD IMAGE WITH POSITIONED PITS */}
      {/* Aspect-ratio kept constant across breakpoints so calibrated pit positions (% based) remain accurate. */}
      <div
        className="relative w-full max-w-[min(96vw,56rem)] aspect-[21/9]"
        role="application"
        aria-label="Plateau de jeu Songo"
      >
        <img
          src={boardSkinUrl}
          alt="Illustration du plateau"
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />

        {/* Render all pits */}
        {Object.keys(PIT_POSITIONS).map((idx) => renderPit(parseInt(idx)))}
        {/* Render granaries with captured seeds */}
        {renderGranary(Player.One)}
        {renderGranary(Player.Two)}
      </div>
    </div>
  );
};

export default BoardRevolutionary;
