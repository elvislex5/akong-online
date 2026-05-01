import React from 'react';
import { GameStatus, Player, AIDifficulty } from '../../types';

type Props = {
  gameStatus: GameStatus;
  currentPlayer: Player;
  currentPlayerName?: string;
  message: string;
  isAiThinking: boolean;
  aiDifficulty: AIDifficulty;
};

/**
 * Status bar shown below the board.
 * When playing: prominent "Au tour de <name>" pill — strong active signal.
 * When finished: shows the gameState message verbatim.
 * Also displays an AI thinking indicator during expert/neural/legend computation.
 */
export function GameStatusBar({
  gameStatus,
  currentPlayer,
  currentPlayerName,
  message,
  isAiThinking,
  aiDifficulty,
}: Props) {
  const aiLabel =
    aiDifficulty === 'legend' ? 'Légende' :
    aiDifficulty === 'neural' ? 'Neuronale' :
    'Expert';

  const isPlaying = gameStatus === GameStatus.Playing;
  const playerLabel =
    currentPlayerName || (currentPlayer === Player.One ? 'Joueur 1' : 'Joueur 2');

  return (
    <div className="mt-3 px-4 flex flex-col items-center gap-2">
      {isPlaying ? (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2.5 h-9 pl-2 pr-4 border border-accent bg-accent/10"
        >
          <span className="relative flex w-2 h-2" aria-hidden="true">
            <span className="absolute inset-0 bg-accent rounded-full animate-ping opacity-60" />
            <span className="absolute inset-0 bg-accent rounded-full" />
          </span>
          <span className="text-[10px] font-medium tracking-[0.18em] uppercase text-accent">
            Au tour de
          </span>
          <span
            className="font-display text-base text-ink leading-none"
            style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
          >
            {playerLabel}
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 h-8 px-4 border border-rule bg-surface text-xs text-ink-muted font-medium tracking-wide uppercase">
          {message}
        </div>
      )}

      {isAiThinking && (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 h-7 px-3 border border-rule bg-surface text-xs text-ink-muted"
        >
          <span className="flex gap-1" aria-hidden="true">
            <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span>L'IA {aiLabel} réfléchit</span>
        </div>
      )}
    </div>
  );
}
