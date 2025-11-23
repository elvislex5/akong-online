import React from 'react';
import { GameState, GameMode, Player } from '../../types';
import type { Profile } from '../../services/supabase';

interface GameOverModalProps {
  gameState: GameState;
  gameMode: GameMode | null;
  aiPlayer: Player | null;
  playerProfiles: { [key in Player]: Profile | null };
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function GameOverModal({
  gameState,
  gameMode,
  aiPlayer,
  playerProfiles,
  onRestart,
  onExitToMenu
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-gray-900 border-2 border-amber-500 p-4 sm:p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center max-w-md max-h-[90vh] overflow-y-auto transform scale-100 sm:scale-110">
        <div className="mb-4 text-4xl sm:text-6xl">
          {gameState.winner === 'Draw' ? '🤝' : (
            (gameMode === GameMode.VsAI && gameState.winner === aiPlayer) ? '🤖' : '🏆'
          )}
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-wider sm:tracking-widest">
          {gameState.winner === 'Draw' ? 'Match Nul' : (
            gameState.winner !== null && gameState.winner !== 'Draw' && playerProfiles[gameState.winner]
              ? (playerProfiles[gameState.winner]?.display_name || playerProfiles[gameState.winner]?.username) + ' GAGNE'
              : (gameState.winner === Player.One ? 'JOUEUR 1 GAGNE' : 'JOUEUR 2 GAGNE')
          )}
        </h2>
        {(() => {
            const playerOneName = playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1';
            const playerTwoName = playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2';
            return (
                <p className="text-amber-500 font-bold mb-4 sm:mb-6 text-base sm:text-lg">
                    Score Final: {playerOneName} {gameState.scores[Player.One]} - {playerTwoName} {gameState.scores[Player.Two]}
                </p>
            );
        })()}

        <div className="flex justify-center gap-4 sm:gap-8 mb-6 sm:mb-8 font-mono text-lg sm:text-xl">
          {(() => {
            const playerOneName = playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1';
            const playerTwoName = playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2';
            return (
              <>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase">{playerOneName}</span>
                  <span className="text-blue-400 font-bold">{gameState.scores[Player.One]}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase">{playerTwoName}</span>
                  <span className="text-amber-500 font-bold">{gameState.scores[Player.Two]}</span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          <button onClick={onRestart} className="px-4 sm:px-6 py-2 sm:py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg transform hover:-translate-y-1 transition-all text-sm sm:text-base">
            REJOUER
          </button>
          <button onClick={onExitToMenu} className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm sm:text-base">
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}
