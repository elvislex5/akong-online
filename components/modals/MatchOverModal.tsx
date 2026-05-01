import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Player } from '../../types';
import type { Profile, MatchFormat } from '../../services/supabase';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { getMatchFormatLabel } from '../../services/roomService';

export interface MatchGameSummary {
  gameNumber: number;
  winnerPlayer: Player | 'Draw' | null;
  scoreOne: number;
  scoreTwo: number;
}

interface MatchOverModalProps {
  matchFormat: MatchFormat;
  matchTarget?: number | null;
  scoreOne: number;
  scoreTwo: number;
  gameCount: number;
  matchWinnerPlayer: Player | 'Draw' | null;
  playerProfiles: { [key in Player]: Profile | null };
  matchHistory?: MatchGameSummary[];
  currentUserPlayer?: Player | null;
  onNewMatch: () => void;
  onExitToMenu: () => void;
}

export function MatchOverModal({
  matchFormat,
  matchTarget,
  scoreOne,
  scoreTwo,
  gameCount,
  matchWinnerPlayer,
  playerProfiles,
  matchHistory,
  currentUserPlayer,
  onNewMatch,
  onExitToMenu,
}: MatchOverModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(true);
  const { announceGameState } = useAnnouncer();

  useKeyboardShortcuts([
    { key: 'Escape', handler: onExitToMenu, description: 'Fermer' },
  ]);

  const isDraw = matchWinnerPlayer === 'Draw';
  const userWon =
    currentUserPlayer !== null &&
    currentUserPlayer !== undefined &&
    matchWinnerPlayer === currentUserPlayer;
  const userLost =
    !isDraw &&
    matchWinnerPlayer !== null &&
    currentUserPlayer !== null &&
    currentUserPlayer !== undefined &&
    matchWinnerPlayer !== currentUserPlayer;

  const nameOne = playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1';
  const nameTwo = playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2';
  const winnerName = matchWinnerPlayer === Player.One ? nameOne : matchWinnerPlayer === Player.Two ? nameTwo : null;
  const formatLabel = getMatchFormatLabel(matchFormat, matchTarget);

  useEffect(() => {
    if (isDraw) announceGameState('Match nul');
    else if (userWon) announceGameState('Vous avez gagné le match !');
    else if (userLost) announceGameState('Vous avez perdu le match');
    else if (winnerName) announceGameState(`${winnerName} a gagné le match`);
  }, [isDraw, userWon, userLost, winnerName, announceGameState]);

  // Confetti for victory or non-user games
  useEffect(() => {
    if (
      !isDraw &&
      (currentUserPlayer === null || currentUserPlayer === undefined || userWon)
    ) {
      const duration = 3500;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 35, spread: 360, ticks: 80, zIndex: 100 };
      const colors = ['#3D4A8C', '#7B8FE0', '#C9B999', '#E4D9C5', '#A78F6A'];
      const interval: any = setInterval(() => {
        const left = animationEnd - Date.now();
        if (left <= 0) return clearInterval(interval);
        const particleCount = 60 * (left / duration);
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
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isDraw, currentUserPlayer, userWon]);

  // Title
  let title: string;
  let kicker: string;
  if (isDraw) {
    title = 'Match nul';
    kicker = 'Égalité au score';
  } else if (userWon) {
    title = 'Match gagné';
    kicker = 'Bravo';
  } else if (userLost) {
    title = 'Match perdu';
    kicker = 'Sans rancune';
  } else if (winnerName) {
    title = `${winnerName} l'emporte`;
    kicker = 'Fin de match';
  } else {
    title = 'Fin de match';
    kicker = '—';
  }

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
          aria-labelledby="match-over-title"
          className="bg-surface border border-rule shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <div className="p-8">
            <p className={'kicker mb-4 ' + (userLost ? 'text-danger' : isDraw ? 'text-ink-muted' : 'text-success')}>
              {kicker} · {formatLabel}
            </p>
            <h2
              id="match-over-title"
              className="font-display text-ink leading-[0.95] tracking-[-0.03em] mb-8"
              style={{
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
                fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
              }}
            >
              {title}.
            </h2>

            {/* Match score */}
            <div className="grid grid-cols-2 gap-px bg-rule border border-rule mb-8">
              <ScoreCell
                name={nameOne}
                isUser={currentUserPlayer === Player.One}
                score={scoreOne}
                isWinner={matchWinnerPlayer === Player.One}
              />
              <ScoreCell
                name={nameTwo}
                isUser={currentUserPlayer === Player.Two}
                score={scoreTwo}
                isWinner={matchWinnerPlayer === Player.Two}
              />
            </div>

            <p className="text-xs text-ink-subtle text-center mb-8">
              {gameCount} partie{gameCount > 1 ? 's' : ''} jouée{gameCount > 1 ? 's' : ''}
            </p>

            {/* Game-by-game history */}
            {matchHistory && matchHistory.length > 0 && (
              <div className="mb-8">
                <p className="kicker mb-3">Détail des parties</p>
                <ul role="list" className="border border-rule divide-y divide-rule max-h-52 overflow-y-auto">
                  {matchHistory.map((g) => {
                    const wn =
                      g.winnerPlayer === Player.One
                        ? nameOne
                        : g.winnerPlayer === Player.Two
                          ? nameTwo
                          : 'Nul';
                    const isUserWin =
                      currentUserPlayer !== null &&
                      currentUserPlayer !== undefined &&
                      g.winnerPlayer === currentUserPlayer;
                    return (
                      <li
                        key={g.gameNumber}
                        className="px-4 py-3 flex items-center justify-between gap-4 bg-canvas text-sm"
                      >
                        <span className="text-ink-subtle tabular-nums w-16">Partie {g.gameNumber}</span>
                        <span className={'flex-1 truncate ' + (isUserWin ? 'text-accent' : 'text-ink-muted')}>
                          {wn}
                        </span>
                        <span className="text-ink-subtle tabular-nums">
                          {g.scoreOne} – {g.scoreTwo}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onNewMatch}
                className="h-11 inline-flex items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
              >
                Nouveau match
              </button>
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
