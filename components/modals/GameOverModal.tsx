import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GameMode, Player } from '../../types';
import type { Profile } from '../../services/supabase';
import confetti from 'canvas-confetti';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';
import { useAnnouncer } from '../../hooks/useAnnouncer';

interface GameOverModalProps {
  gameState: GameState;
  gameMode: GameMode | null;
  aiPlayer: Player | null;
  playerProfiles: { [key in Player]: Profile | null };
  currentUserId?: string; // ID de l'utilisateur connecté
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function GameOverModal({
  gameState,
  gameMode,
  aiPlayer,
  playerProfiles,
  currentUserId,
  onRestart,
  onExitToMenu
}: GameOverModalProps) {
  // Accessibility: Focus trap
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  // Accessibility: Announcer for screen readers
  const { announceGameState } = useAnnouncer();

  // Accessibility: Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'Escape', handler: onExitToMenu, description: 'Fermer et retourner au menu' }
  ]);

  // Déterminer quel joueur est l'utilisateur connecté
  const currentUserPlayer = React.useMemo(() => {
    if (!currentUserId) return null;
    if (playerProfiles[Player.One]?.id === currentUserId) return Player.One;
    if (playerProfiles[Player.Two]?.id === currentUserId) return Player.Two;
    return null;
  }, [currentUserId, playerProfiles]);

  // Déterminer si l'utilisateur a gagné
  const userWon = currentUserPlayer !== null && gameState.winner === currentUserPlayer;
  const userLost = currentUserPlayer !== null && gameState.winner !== 'Draw' && gameState.winner !== null && gameState.winner !== currentUserPlayer;

  // Announce result to screen readers
  useEffect(() => {
    if (gameState.winner === 'Draw') {
      announceGameState('Match nul');
    } else if (userWon) {
      announceGameState('Vous avez gagné !');
    } else if (userLost) {
      announceGameState('Vous avez perdu');
    } else if (gameState.winner) {
      const winnerName = playerProfiles[gameState.winner]?.display_name ||
        playerProfiles[gameState.winner]?.username ||
        `Joueur ${gameState.winner === Player.One ? '1' : '2'}`;
      announceGameState(`${winnerName} a gagné`);
    }
  }, [gameState.winner, userWon, userLost, playerProfiles, announceGameState]);

  // Trigger confetti on mount for victories (only if user won)
  useEffect(() => {
    if (gameState.winner !== 'Draw' && gameState.winner !== null && (currentUserPlayer === null || userWon)) {
      // Golden confetti explosion
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#FFD700', '#FFA500', '#FF8C00']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#FFD700', '#FFA500', '#FF8C00']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [gameState.winner, currentUserPlayer, userWon]);

  // Obtenir les noms des joueurs
  const playerOneName = playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1';
  const playerTwoName = playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2';

  // Obtenir le nom de l'utilisateur et de l'adversaire
  const userName = currentUserPlayer !== null ? (currentUserPlayer === Player.One ? playerOneName : playerTwoName) : null;
  const opponentName = currentUserPlayer !== null ? (currentUserPlayer === Player.One ? playerTwoName : playerOneName) : null;
  const userScore = currentUserPlayer !== null ? gameState.scores[currentUserPlayer] : null;
  const opponentScore = currentUserPlayer !== null ? gameState.scores[currentUserPlayer === Player.One ? Player.Two : Player.One] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          className={`modal-container text-center max-w-md ${userLost ? 'border-red-500/30' : ''
            }`}
        >
          {/* Subtle glow effect */}
          <div className={`absolute inset-0 ${userLost
            ? 'bg-gradient-to-br from-red-500/10 to-gray-900/10'
            : 'bg-gradient-to-br from-amber-500/5 to-orange-500/5'
            } pointer-events-none rounded-3xl`}></div>

          {/* Content - Scrollable */}
          <div className="relative z-10 p-6 overflow-y-auto flex-1">
            {/* Trophy/Icon with animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 10, stiffness: 200 }}
              className="mb-4 text-6xl sm:text-7xl"
            >
              {gameState.winner === 'Draw' ? '=' : (
                userLost ? '✕' : '✓'
              )}
            </motion.div>

            {/* Title with gradient */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              id="game-over-title"
              className={`title-section ${userLost
                ? 'text-gradient-red'
                : 'text-gradient-gold'
                } mb-3 uppercase tracking-wider`}
            >
              {gameState.winner === 'Draw' ? 'Match Nul' : (
                userWon ? 'VICTOIRE !' : (
                  userLost ? 'DÉFAITE' : (
                    gameState.winner !== null && gameState.winner !== 'Draw' && playerProfiles[gameState.winner]
                      ? (playerProfiles[gameState.winner]?.display_name || playerProfiles[gameState.winner]?.username) + ' GAGNE'
                      : (gameState.winner === Player.One ? 'JOUEUR 1 GAGNE' : 'JOUEUR 2 GAGNE')
                  )
                )
              )}
            </motion.h2>

            {/* Personalized message for user */}
            {(userWon || userLost) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className={`text-sm sm:text-base mb-6 ${userLost ? 'text-red-300' : 'text-amber-300'
                  }`}
              >
                {userWon ? (
                  <>Félicitations <span className="font-bold">{userName}</span> !</>
                ) : (
                  <>Dommage <span className="font-bold">{userName}</span>... La prochaine fois sera la bonne !</>
                )}
              </motion.p>
            )}

            {/* Detailed scores with glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center gap-4 mb-6 font-mono text-lg"
            >
              <div className={`bg-white/5 border ${currentUserPlayer === Player.One
                ? (userWon ? 'border-amber-500/50' : 'border-red-500/50')
                : 'border-amber-500/20'
                } p-3 rounded-xl hover:border-amber-500/40 transition-all duration-300 min-w-[100px]`}>
                <span className={`text-xs uppercase block mb-1 ${currentUserPlayer === Player.One ? 'text-amber-300' : 'text-gray-400'
                  }`}>
                  {playerOneName} {currentUserPlayer === Player.One && '(Vous)'}
                </span>
                <span className={`font-bold text-xl ${gameState.winner === Player.One
                  ? (userWon ? 'text-amber-400' : 'text-amber-500')
                  : (userLost && currentUserPlayer === Player.One ? 'text-red-400' : 'text-blue-400')
                  }`}>
                  {gameState.scores[Player.One]}
                </span>
              </div>
              <div className={`bg-white/5 border ${currentUserPlayer === Player.Two
                ? (userWon ? 'border-amber-500/50' : 'border-red-500/50')
                : 'border-amber-500/20'
                } p-3 rounded-xl hover:border-amber-500/40 transition-all duration-300 min-w-[100px]`}>
                <span className={`text-xs uppercase block mb-1 ${currentUserPlayer === Player.Two ? 'text-amber-300' : 'text-gray-400'
                  }`}>
                  {playerTwoName} {currentUserPlayer === Player.Two && '(Vous)'}
                </span>
                <span className={`font-bold text-xl ${gameState.winner === Player.Two
                  ? (userWon ? 'text-amber-400' : 'text-amber-500')
                  : (userLost && currentUserPlayer === Player.Two ? 'text-red-400' : 'text-orange-400')
                  }`}>
                  {gameState.scores[Player.Two]}
                </span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onRestart}
                className="btn-primary text-sm py-2.5 focus-visible-ring"
                aria-label="Rejouer une nouvelle partie"
              >
                REJOUER
              </button>
              <button
                onClick={onExitToMenu}
                className="btn-secondary text-sm py-2.5 focus-visible-ring"
                aria-label="Retourner au menu principal"
              >
                MENU
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div >
    </AnimatePresence >
  );
}
