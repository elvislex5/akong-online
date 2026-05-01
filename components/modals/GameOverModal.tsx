import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Search } from 'lucide-react';
import { GameState, GameMode, Player } from '../../types';
import type { Profile } from '../../services/supabase';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';
import { useAnnouncer } from '../../hooks/useAnnouncer';

interface GameOverModalProps {
  gameState: GameState;
  gameMode: GameMode | null;
  aiPlayer: Player | null;
  playerProfiles: { [key in Player]: Profile | null };
  currentUserId?: string;
  matchFormat?: string;
  onRestart: () => void;
  onExitToMenu: () => void;
  onAnalyze?: () => void;
}

export function GameOverModal({
  gameState,
  playerProfiles,
  currentUserId,
  matchFormat,
  onRestart,
  onExitToMenu,
  onAnalyze,
}: GameOverModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(true);
  const { announceGameState } = useAnnouncer();

  useKeyboardShortcuts([
    { key: 'Escape', handler: onExitToMenu, description: 'Fermer et retourner au menu' },
  ]);

  const currentUserPlayer = React.useMemo(() => {
    if (!currentUserId) return null;
    if (playerProfiles[Player.One]?.id === currentUserId) return Player.One;
    if (playerProfiles[Player.Two]?.id === currentUserId) return Player.Two;
    return null;
  }, [currentUserId, playerProfiles]);

  const userWon = currentUserPlayer !== null && gameState.winner === currentUserPlayer;
  const userLost =
    currentUserPlayer !== null &&
    gameState.winner !== 'Draw' &&
    gameState.winner !== null &&
    gameState.winner !== currentUserPlayer;
  const isDraw = gameState.winner === 'Draw';

  // Announce result
  useEffect(() => {
    if (isDraw) announceGameState('Match nul');
    else if (userWon) announceGameState('Vous avez gagné !');
    else if (userLost) announceGameState('Vous avez perdu');
    else if (gameState.winner) {
      const winnerName =
        playerProfiles[gameState.winner]?.display_name ||
        playerProfiles[gameState.winner]?.username ||
        `Joueur ${gameState.winner === Player.One ? '1' : '2'}`;
      announceGameState(`${winnerName} a gagné`);
    }
  }, [gameState.winner, userWon, userLost, isDraw, playerProfiles, announceGameState]);

  // Confetti for victory (or non-user games)
  useEffect(() => {
    if (gameState.winner !== 'Draw' && gameState.winner !== null && (currentUserPlayer === null || userWon)) {
      const duration = 2400;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const colors = ['#3D4A8C', '#7B8FE0', '#C9B999', '#E4D9C5'];

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 },
          colors,
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 },
          colors,
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [gameState.winner, currentUserPlayer, userWon]);

  const playerOneName = playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1';
  const playerTwoName = playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2';

  // Title text
  let title: string;
  let kicker: string;
  if (isDraw) {
    title = 'Match nul';
    kicker = 'Égalité';
  } else if (userWon) {
    title = 'Victoire';
    kicker = 'Bien joué';
  } else if (userLost) {
    title = 'Défaite';
    kicker = 'Sans rancune';
  } else if (gameState.winner !== null) {
    const winnerName = playerProfiles[gameState.winner]?.display_name || playerProfiles[gameState.winner]?.username;
    title = winnerName ? `${winnerName} l'emporte` : `Joueur ${gameState.winner === Player.One ? '1' : '2'} l'emporte`;
    kicker = 'Fin de partie';
  } else {
    title = 'Fin de partie';
    kicker = '—';
  }

  const isMatch = matchFormat && matchFormat !== 'infinite';
  const restartLabel = isMatch ? 'Partie suivante' : 'Rejouer';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          className="bg-surface border border-rule shadow-lg w-full max-w-md"
        >
          <div className="p-8">
            <p className={'kicker mb-4 ' + (userLost ? 'text-danger' : isDraw ? 'text-ink-muted' : 'text-success')}>
              {kicker}
            </p>
            <h2
              id="game-over-title"
              className="font-display text-ink leading-[0.95] tracking-[-0.03em] mb-8"
              style={{
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
                fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
              }}
            >
              {title}.
            </h2>

            {/* Score block */}
            <div className="grid grid-cols-2 gap-px bg-rule border border-rule mb-8">
              <ScoreCell
                name={playerOneName}
                isUser={currentUserPlayer === Player.One}
                score={gameState.scores[Player.One]}
                isWinner={gameState.winner === Player.One}
              />
              <ScoreCell
                name={playerTwoName}
                isUser={currentUserPlayer === Player.Two}
                score={gameState.scores[Player.Two]}
                isWinner={gameState.winner === Player.Two}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="h-11 inline-flex items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
              >
                {restartLabel}
              </button>
              {onAnalyze && (
                <button
                  type="button"
                  onClick={onAnalyze}
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-accent hover:text-accent transition-colors duration-150"
                >
                  <Search size={14} strokeWidth={1.75} />
                  Analyser la partie
                </button>
              )}
              <button
                type="button"
                onClick={onExitToMenu}
                className="h-11 inline-flex items-center justify-center rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
              >
                Retour au menu
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const ScoreCell: React.FC<{ name: string; isUser: boolean; score: number; isWinner: boolean }> = ({
  name,
  isUser,
  score,
  isWinner,
}) => (
  <div className={'bg-canvas p-5 ' + (isWinner ? 'ring-1 ring-inset ring-accent' : '')}>
    <p className="kicker mb-2 truncate">
      {name}
      {isUser && <span className="ml-1.5 text-ink-subtle italic font-normal normal-case">· vous</span>}
    </p>
    <p
      className={
        'font-display tabular-nums leading-none ' + (isWinner ? 'text-accent' : 'text-ink')
      }
      style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30', fontSize: '2.5rem' }}
    >
      {score}
    </p>
  </div>
);
