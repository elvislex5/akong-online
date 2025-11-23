
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
  invertView?: boolean; // New prop to rotate board for Player 2 perspective
}

const Board: React.FC<BoardProps> = ({ gameState, onMove, gameMode, onEditPit, onEditScore, isAnimating, handState, aiPlayer, playerProfiles, isSimulationManual, invertView = false }) => {
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
                              (gameMode === GameMode.OnlineGuest && currentPlayer === Player.Two); // Guest is P2

  const isPlayerOnePlayable = isSimulationSetup || 
                              (gameMode === GameMode.LocalMultiplayer && currentPlayer === Player.One) ||
                              (isAiMode && aiPlayer !== Player.One && currentPlayer === Player.One) ||
                              (isSimulationPlaying && isSimulationManual && currentPlayer === Player.One) ||
                              (gameMode === GameMode.OnlineHost && currentPlayer === Player.One); // Host is P1

  // Indices Logic:
  // Standard View: Top = P2 (7-13), Bottom = P1 (0-6)
  // Inverted View: Top = P1 (0-6), Bottom = P2 (7-13)
  
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

  // Labels Logic
  const getTopLabel = () => {
      const topPlayer = invertView ? Player.One : Player.Two;
      const profile = playerProfiles?.[topPlayer];
      if (profile) {
        return profile.display_name || profile.username;
      }
      
      // Fallback for non-online modes or if profiles are not loaded
      if (isSpectator) return 'JOUEUR 2';
      if (invertView) {
          // Top is Player 1 (Opponent for Guest)
          if (isOnline) return 'ADVERSAIRE (J1)';
          return 'JOUEUR 1';
      } else {
          // Top is Player 2
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

    // Fallback for non-online modes or if profiles are not loaded
    if (isSpectator) return 'JOUEUR 1';
    if (invertView) {
        // Bottom is Player 2 (Self for Guest)
        if (isOnline) return 'VOUS (J2)';
        return 'JOUEUR 2';
    } else {
        // Bottom is Player 1
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

  const storeBaseClasses = "w-16 sm:w-24 md:w-36 h-full flex items-center justify-center relative overflow-hidden transition-all duration-200";
  const storeEditClasses = isSimulationSetup ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:brightness-110" : "";

  const EditIcon = () => (
      <div className="absolute top-1 right-1 z-30 pointer-events-none">
          <div className="bg-blue-600 rounded-full p-0.5 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
      </div>
  );

  // Score Display Swap
  // If Inverted: Left Store = P2, Right Store = P1
  // Standard: Left Store = P1, Right Store = P2
  const leftStorePlayer = invertView ? Player.Two : Player.One;
  const rightStorePlayer = invertView ? Player.One : Player.Two;

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-1 sm:p-2 md:p-4 relative gap-1 sm:gap-2" role="region" aria-label="Plateau de jeu Akông">

      <Hand
        isActive={isAnimating}
        pitIndex={handState.pitIndex}
        seedCount={handState.seedCount}
      />

      {/* TOP PLAYER NAMEPLATE (HUD Style) */}
      <div className={`
          w-full max-w-xl flex justify-center items-center py-1.5 sm:py-2 px-4 sm:px-6 rounded-t-xl border-b-2 sm:border-b-4
          shadow-[0_0_15px_rgba(0,0,0,0.5)] transform transition-all duration-300
          ${((invertView && currentPlayer === Player.One) || (!invertView && currentPlayer === Player.Two)) && status === GameStatus.Playing
            ? 'bg-gray-800 border-amber-500 scale-105 z-20'
            : 'bg-gray-900/80 border-gray-700 opacity-80'
          }
      `}>
         <span className={`
            text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider sm:tracking-widest drop-shadow-lg
            ${((invertView && currentPlayer === Player.One) || (!invertView && currentPlayer === Player.Two)) && status === GameStatus.Playing
                ? 'text-amber-500 animate-pulse'
                : 'text-gray-500'}
         `}>
            {getTopLabel()}
         </span>
      </div>

      {/* THE BOARD CONTAINER - Dark Industrial Style */}
      <div className="relative bg-gray-800 p-2 sm:p-4 md:p-6 rounded-3xl sm:rounded-[40px] border-2 sm:border-4 border-gray-600 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.5)] w-full select-none overflow-hidden max-w-[98vw] sm:max-w-4xl lg:max-w-5xl">
          
          {/* Carbon Fiber Texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{
                   backgroundImage: `radial-gradient(black 15%, transparent 16%), radial-gradient(black 15%, transparent 16%)`,
                   backgroundSize: '4px 4px',
                   backgroundPosition: '0 0, 2px 2px'
               }}>
          </div>
          
          {/* Metallic Rim Highlight */}
          <div className="absolute inset-0 rounded-[36px] border border-white/10 pointer-events-none"></div>

          {/* --- TOP SECTION --- */}
          <div className="flex flex-col items-center relative z-10">
             {/* Pits Row */}
             <div className="flex justify-center gap-1 sm:gap-2 w-full">
                {topRowIndices.map((idx) => {
                    const validation = isValidMove(gameState, idx);
                    // For online, we restrict clicking based on player role
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

          {/* --- CENTRAL STRUCTURE (Stores & Grille) --- */}
          <div className="flex items-center justify-between relative z-10 w-full my-2 sm:my-3 md:my-4 h-20 sm:h-24 md:h-28 gap-1 sm:gap-2 px-1 sm:px-2">
              
              {/* LEFT STORE */}
              <div
                  onClick={() => handleScoreClick(leftStorePlayer)}
                  role="status"
                  aria-label={`Score ${leftStorePlayer === Player.One ? 'Joueur 1' : 'Joueur 2'}: ${scores[leftStorePlayer]} graines`}
                  className={`${storeBaseClasses} ${storeEditClasses} rounded-l-full rounded-r-xl bg-[#d7e3e8] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] border-r-4 border-gray-400`}
              >
                   {isSimulationSetup && <EditIcon />}
                   <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-0.5 p-2 sm:p-4 pl-1 sm:pl-2 opacity-90 pointer-events-none">
                      {Array.from({length: Math.min(scores[leftStorePlayer], 35)}).map((_, i) => (
                          <div key={i} className="w-1.5 sm:w-2 md:w-2.5 h-1.5 sm:h-2 md:h-2.5 rounded-full bg-stone-800 shadow-sm"/>
                      ))}
                   </div>
                   <span className={`text-2xl sm:text-4xl md:text-5xl font-mono font-bold drop-shadow-md z-10 pointer-events-none ${leftStorePlayer === Player.One ? 'text-blue-600' : 'text-amber-600'}`}>
                       {scores[leftStorePlayer]}
                   </span>
              </div>

              {/* CENTER GRILLE */}
              <div className="flex-1 h-12 sm:h-16 md:h-20 bg-gray-700 rounded-lg border-y-2 border-gray-500 relative shadow-inner flex items-center justify-center mx-1 sm:mx-2">
                  <div className="absolute inset-1 rounded bg-gray-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] opacity-80"
                       style={{
                           backgroundImage: 'radial-gradient(circle, #4b5563 1.5px, transparent 1.5px)',
                           backgroundSize: '6px 6px'
                       }}
                  ></div>
                  <div className="relative z-10 text-gray-500 font-black tracking-[0.5em] opacity-30 text-xs sm:text-sm hidden md:block">
                       AKÔNG ONLINE
                   </div>
              </div>

              {/* RIGHT STORE */}
              <div
                  onClick={() => handleScoreClick(rightStorePlayer)}
                  role="status"
                  aria-label={`Score ${rightStorePlayer === Player.One ? 'Joueur 1' : 'Joueur 2'}: ${scores[rightStorePlayer]} graines`}
                  className={`${storeBaseClasses} ${storeEditClasses} rounded-r-full rounded-l-xl bg-[#d7e3e8] shadow-[inset_-2px_2px_5px_rgba(0,0,0,0.4)] border-l-4 border-gray-400`}
              >
                  {isSimulationSetup && <EditIcon />}
                  <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-0.5 p-2 sm:p-4 pr-1 sm:pr-2 opacity-90 pointer-events-none">
                      {Array.from({length: Math.min(scores[rightStorePlayer], 35)}).map((_, i) => (
                          <div key={i} className="w-1.5 sm:w-2 md:w-2.5 h-1.5 sm:h-2 md:h-2.5 rounded-full bg-stone-800 shadow-sm"/>
                      ))}
                  </div>
                  <span className={`text-2xl sm:text-4xl md:text-5xl font-mono font-bold drop-shadow-md z-10 pointer-events-none ${rightStorePlayer === Player.One ? 'text-blue-600' : 'text-amber-600'}`}>
                      {scores[rightStorePlayer]}
                  </span>
              </div>

          </div>

          {/* --- BOTTOM SECTION --- */}
          <div className="flex flex-col items-center relative z-10">
             {/* Pits Row */}
             <div className="flex justify-center gap-1 sm:gap-2 w-full">
                {bottomRowIndices.map((idx) => {
                    const validation = isValidMove(gameState, idx);
                    // For online, we restrict clicking based on player role
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

      {/* BOTTOM PLAYER NAMEPLATE (HUD Style) */}
      <div className={`
          w-full max-w-xl flex justify-center items-center py-1.5 sm:py-2 px-4 sm:px-6 rounded-b-xl border-t-2 sm:border-t-4
          shadow-[0_0_15px_rgba(0,0,0,0.5)] transform transition-all duration-300
          ${((invertView && currentPlayer === Player.Two) || (!invertView && currentPlayer === Player.One)) && status === GameStatus.Playing
            ? 'bg-gray-800 border-blue-500 scale-105 z-20'
            : 'bg-gray-900/80 border-gray-700 opacity-80'
          }
      `}>
         <span className={`
            text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider sm:tracking-widest drop-shadow-lg
            ${((invertView && currentPlayer === Player.Two) || (!invertView && currentPlayer === Player.One)) && status === GameStatus.Playing
                ? 'text-blue-500 animate-pulse'
                : 'text-gray-500'}
         `}>
            {getBottomLabel()}
         </span>
      </div>

    </div>
  );
};

export default Board;
