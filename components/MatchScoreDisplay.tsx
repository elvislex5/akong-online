import React from 'react';
import { GameStatus, Player } from '../types';
import type { MatchFormat } from '../services/supabase';
import { getMatchFormatLabel } from '../services/roomService';

interface MatchScoreDisplayProps {
  matchFormat: MatchFormat;
  matchTarget?: number | null;
  scoreOne: number;
  scoreTwo: number;
  nameOne: string;
  nameTwo: string;
  currentPlayer?: Player;
  gameStatus?: GameStatus;
}

export function MatchScoreDisplay({
  matchFormat,
  matchTarget,
  scoreOne,
  scoreTwo,
  nameOne,
  nameTwo,
  currentPlayer,
  gameStatus,
}: MatchScoreDisplayProps) {
  const formatLabel = matchFormat === 'infinite' ? 'Parties libres' : getMatchFormatLabel(matchFormat, matchTarget);
  const totalGames = scoreOne + scoreTwo;

  let progress = '';
  if (matchFormat === 'traditional_6') progress = `Partie ${totalGames + 1} / 6`;
  else if (matchFormat === 'traditional_2') progress = `Partie ${totalGames + 1} / 2`;
  else if (matchFormat === 'first_to_x' && matchTarget) progress = `Premier à ${matchTarget}`;
  else if (matchFormat === 'infinite') progress = `Partie ${totalGames + 1}`;

  const isPlaying = gameStatus === GameStatus.Playing;

  return (
    <div className="w-full max-w-2xl mx-auto mb-3">
      <div className="border border-rule bg-surface flex items-stretch">
        <PlayerCell name={nameOne} score={scoreOne} active={isPlaying && currentPlayer === Player.One} />
        <div className="flex flex-col items-center justify-center px-4 border-x border-rule min-w-[100px]">
          <p className="kicker">{formatLabel}</p>
          {progress && (
            <p className="text-xs text-ink-muted mt-1 tabular-nums">{progress}</p>
          )}
        </div>
        <PlayerCell name={nameTwo} score={scoreTwo} active={isPlaying && currentPlayer === Player.Two} align="right" />
      </div>
    </div>
  );
}

const PlayerCell: React.FC<{
  name: string;
  score: number;
  active: boolean;
  align?: 'left' | 'right';
}> = ({ name, score, active, align = 'left' }) => (
  <div
    className={
      'flex-1 relative flex items-center justify-between px-4 py-3 min-w-0 transition-colors duration-200 ' +
      (active ? 'bg-accent/10' : '')
    }
  >
    {active && (
      <span
        aria-hidden="true"
        className={
          'absolute top-0 bottom-0 w-[3px] bg-accent ' +
          (align === 'right' ? 'right-0' : 'left-0')
        }
      />
    )}
    <p className={'text-sm truncate flex-1 ' + (active ? 'text-ink font-medium' : 'text-ink-muted')}>{name}</p>
    <p
      className={'font-display tabular-nums leading-none ml-3 ' + (active ? 'text-accent' : 'text-ink')}
      style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.5rem' }}
    >
      {score}
    </p>
  </div>
);
