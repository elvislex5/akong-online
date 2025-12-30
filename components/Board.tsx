
import React from 'react';
import { GameState, Player, GameStatus, GameMode } from '../types';
import { isValidMove } from '../services/songoLogic';
import Pit from './Pit';
import Hand from './Hand';
import type { Profile } from '../services/supabase';

interface BoardProps {
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

const Board: React.FC<BoardProps> = ({
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
  boardSkinUrl = '/boards/classic.png'
}) => {
  const { board, currentPlayer, scores, status } = gameState;

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

  const topRowIndices = invertView ? [0, 1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12, 13];
  const bottomRowIndices = invertView ? [13, 12, 11, 10, 9, 8, 7] : [6, 5, 4, 3, 2, 1, 0];

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
    if (profile) {
      return profile.display_name || profile.username;
    }

    if (isSpectator) return 'JOUEUR 2';
    if (invertView) {
      if (isOnline) return 'ADVERSAIRE (J1)';
      return 'JOUEUR 1';
    } else {
      if (isAiMode && aiPlayer === Player.Two) return 'ORDINATEUR';
      if (gameMode === GameMode.Simulation) return 'IA (HAUT)';
      if (isOnline) return gameMode === GameMode.OnlineHost ? 'ADVERSAIRE (J2)' : 'JOUEUR 2';
      return 'JOUEUR 2';
    }
  };

  const getBottomLabel = () => {
    const bottomPlayer = invertView ? Player.Two : Player.One;
    const profile = playerProfiles?.[bottomPlayer];
    if (profile) {
      return profile.display_name || profile.username;
    }

    if (isSpectator) return 'JOUEUR 1';
    if (invertView) {
      if (isOnline) return 'VOUS (J2)';
      return 'JOUEUR 2';
    } else {
      if (isAiMode && aiPlayer === Player.One) return 'ORDINATEUR';
      if (gameMode === GameMode.Simulation) return 'IA (BAS)';
      if (isOnline) return gameMode === GameMode.OnlineHost ? 'VOUS (J1)' : 'ADVERSAIRE (J1)';
      return isAiMode ? 'VOUS' : 'JOUEUR 1';
    }
  };

  const handleScoreClick = (player: Player) => {
    if (isSimulationSetup && onEditScore) {
      onEditScore(player);
    }
  };

  const EditIcon = () => (
    <div className="absolute top-1 right-1 z-30 pointer-events-none">
      <div className="neon-button-emerald rounded-full p-1 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </div>
    </div>
  );

  const leftStorePlayer = invertView ? Player.Two : Player.One;
  const rightStorePlayer = invertView ? Player.One : Player.Two;

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-1 sm:p-2 md:p-4 relative gap-1 sm:gap-2 md:gap-3 perspective" role="region" aria-label="Plateau de jeu Akông">

      <Hand
        isActive={isAnimating}
        pitIndex={handState.pitIndex}
        seedCount={handState.seedCount}
      />

      {/* TOP PLAYER NAMEPLATE - Neon Style */}
      <div className={`
          w-full max-w-2xl glass-panel-gold rounded-xl py-1.5 px-4 sm:py-2 sm:px-5 md:py-3 md:px-6
          transform transition-all duration-300 animate-fade-in-down
          ${((invertView && currentPlayer === Player.One) || (!invertView && currentPlayer === Player.Two)) && status === GameStatus.Playing
          ? 'neon-border-gold glow-pulse-gold scale-105 z-20'
          : 'opacity-70'
        }
      `}>
        <span className={`
            text-sm sm:text-lg md:text-xl lg:text-2xl font-black uppercase tracking-wider sm:tracking-widest
            ${((invertView && currentPlayer === Player.One) || (!invertView && currentPlayer === Player.Two)) && status === GameStatus.Playing
            ? 'neon-text-gold text-glow-pulse-gold'
            : 'text-white-60'}
         `}>
          {getTopLabel()}
        </span>
      </div>

      {/* THE BOARD CONTAINER - Board Skin Image */}
      <div className="board-3d relative p-2 sm:p-4 md:p-6 lg:p-8 rounded-2xl sm:rounded-3xl md:rounded-[40px] shadow-3d-xl w-full select-none overflow-hidden max-w-[98vw] sm:max-w-4xl lg:max-w-5xl transform-3d animate-scale-in"
        style={{
          backgroundImage: `url(${boardSkinUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(139, 90, 43, 0.3), inset 0 -2px 10px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(139, 90, 43, 0.4)'
        }}>

        {/* Dark overlay to make pits more visible */}
        <div className="absolute inset-0 bg-black/30 rounded-[36px] pointer-events-none"></div>

        {/* Warm Ambient Glow */}
        <div className="absolute inset-0 rounded-[36px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 140, 0, 0.08) 0%, transparent 70%)'
          }}>
        </div>

        {/* --- TOP SECTION --- */}
        <div className="flex flex-col items-center relative z-10 mb-2 sm:mb-3 md:mb-4">
          <div className="flex justify-center gap-2 sm:gap-3 w-full">
            {topRowIndices.map((idx) => {
              const validation = isValidMove(gameState, idx);
              const isMyPit = isOnline
                ? (gameMode === GameMode.OnlineHost && idx < 7) || (gameMode === GameMode.OnlineGuest && idx >= 7)
                : true;

              const isPlayable = (isSimulationSetup ||
                (isPlayerTwoPlayable && idx >= 7) ||
                (isPlayerOnePlayable && idx < 7)) && isMyPit && !isSpectator;

              return (
                <Pit
                  key={idx}
                  pitIndex={idx}
                  seeds={board[idx]}
                  isOwner={idx < 7}
                  isPlayable={!isAnimating && !isSimulationSetup && isPlayable && validation.valid}
                  isEditable={isSimulationSetup}
                  onClick={() => handlePitClick(idx)}
                />
              );
            })}
          </div>
        </div>

        {/* --- CENTRAL STRUCTURE (Stores & Divider) --- */}
        <div className="flex items-center justify-between relative z-10 w-full my-2 sm:my-3 md:my-4 lg:my-6 h-20 sm:h-24 md:h-28 lg:h-32 gap-1.5 sm:gap-2 md:gap-4">

          {/* LEFT STORE - Neon Score Display */}
          <div
            onClick={() => handleScoreClick(leftStorePlayer)}
            role="status"
            aria-label={`Score ${leftStorePlayer === Player.One ? 'Joueur 1' : 'Joueur 2'}: ${scores[leftStorePlayer]} graines`}
            className={`
                    w-20 sm:w-28 md:w-36 h-full flex items-center justify-center relative overflow-hidden
                    glass-glow-gold rounded-2xl cursor-pointer
                    transition-all duration-300 hover:scale-105 hover-glow-gold
                    ${isSimulationSetup ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-black' : ''}
                  `}
          >
            {isSimulationSetup && <EditIcon />}

            {/* Seed Visual Representation */}
            <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-1 p-3 opacity-40 pointer-events-none">
              {Array.from({ length: Math.min(scores[leftStorePlayer], 30) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gold glow-gold-sm animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }} />
              ))}
            </div>

            {/* Score Number */}
            <span className={`
                     text-4xl sm:text-5xl md:text-6xl font-black z-10 pointer-events-none
                     ${leftStorePlayer === Player.One ? 'neon-text-gold' : 'text-amber-500 text-glow-amber'}
                   `}>
              {scores[leftStorePlayer]}
            </span>
          </div>

          {/* CENTER DIVIDER - Neon Line */}
          <div className="flex-1 h-16 sm:h-20 md:h-24 glass-medium rounded-xl relative overflow-hidden mx-2">
            {/* Animated Neon Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 neon-line-gold"></div>

            {/* Logo/Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="neon-text-gold text-xs sm:text-sm md:text-base font-black tracking-[0.3em] opacity-50">
                AKÔNG
              </span>
            </div>
          </div>

          {/* RIGHT STORE - Neon Score Display */}
          <div
            onClick={() => handleScoreClick(rightStorePlayer)}
            role="status"
            aria-label={`Score ${rightStorePlayer === Player.One ? 'Joueur 1' : 'Joueur 2'}: ${scores[rightStorePlayer]} graines`}
            className={`
                    w-20 sm:w-28 md:w-36 h-full flex items-center justify-center relative overflow-hidden
                    glass-glow-gold rounded-2xl cursor-pointer
                    transition-all duration-300 hover:scale-105 hover-glow-gold
                    ${isSimulationSetup ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-black' : ''}
                  `}
          >
            {isSimulationSetup && <EditIcon />}

            {/* Seed Visual Representation */}
            <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-1 p-3 opacity-40 pointer-events-none">
              {Array.from({ length: Math.min(scores[rightStorePlayer], 30) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gold glow-gold-sm animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }} />
              ))}
            </div>

            {/* Score Number */}
            <span className={`
                    text-4xl sm:text-5xl md:text-6xl font-black z-10 pointer-events-none
                    ${rightStorePlayer === Player.One ? 'neon-text-gold' : 'text-amber-500 text-glow-amber'}
                  `}>
              {scores[rightStorePlayer]}
            </span>
          </div>

        </div>

        {/* --- BOTTOM SECTION --- */}
        <div className="flex flex-col items-center relative z-10 mt-2 sm:mt-3 md:mt-4">
          <div className="flex justify-center gap-2 sm:gap-3 w-full">
            {bottomRowIndices.map((idx) => {
              const validation = isValidMove(gameState, idx);
              const isMyPit = isOnline
                ? (gameMode === GameMode.OnlineHost && idx < 7) || (gameMode === GameMode.OnlineGuest && idx >= 7)
                : true;

              const isPlayable = (isSimulationSetup ||
                (isPlayerTwoPlayable && idx >= 7) ||
                (isPlayerOnePlayable && idx < 7)) && isMyPit && !isSpectator;

              return (
                <Pit
                  key={idx}
                  pitIndex={idx}
                  seeds={board[idx]}
                  isOwner={idx < 7}
                  isPlayable={!isAnimating && !isSimulationSetup && isPlayable && validation.valid}
                  isEditable={isSimulationSetup}
                  onClick={() => handlePitClick(idx)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM PLAYER NAMEPLATE - Neon Style */}
      <div className={`
          w-full max-w-2xl glass-panel-gold rounded-xl py-1.5 px-4 sm:py-2 sm:px-5 md:py-3 md:px-6
          transform transition-all duration-300 animate-fade-in-up
          ${((invertView && currentPlayer === Player.Two) || (!invertView && currentPlayer === Player.One)) && status === GameStatus.Playing
          ? 'neon-border-gold glow-pulse-gold scale-105 z-20'
          : 'opacity-70'}
      `}>
        <span className={`
            text-sm sm:text-lg md:text-xl lg:text-2xl font-black uppercase tracking-wider sm:tracking-widest
            ${((invertView && currentPlayer === Player.Two) || (!invertView && currentPlayer === Player.One)) && status === GameStatus.Playing
            ? 'neon-text-gold text-glow-pulse-gold'
            : 'text-white-60'}
         `}>
          {getBottomLabel()}
        </span>
      </div>

    </div>
  );
};

export default Board;
