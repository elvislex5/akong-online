import React from 'react';
import { Player, GameStatus } from '../types';
import { formatTime, type TimeControl } from '../hooks/useGameTimer';

interface GameTimerDisplayProps {
  timeMs: Record<Player, number>;
  currentPlayer: Player;
  gameStatus: GameStatus;
  timeControl: TimeControl;
  nameOne: string;
  nameTwo: string;
  invertView?: boolean;
}

export function GameTimerDisplay({
  timeMs,
  currentPlayer,
  gameStatus,
  timeControl,
  nameOne,
  nameTwo,
  invertView = false,
}: GameTimerDisplayProps) {
  if (timeControl === 'none') return null;

  const isPlaying = gameStatus === GameStatus.Playing;
  const topPlayer = invertView ? Player.One : Player.Two;
  const bottomPlayer = invertView ? Player.Two : Player.One;
  const topName = invertView ? nameOne : nameTwo;
  const bottomName = invertView ? nameTwo : nameOne;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mb-2">
      <div className="grid grid-cols-2 gap-px bg-rule border border-rule">
        <TimerCell
          name={topName}
          timeMs={timeMs[topPlayer]}
          isActive={isPlaying && currentPlayer === topPlayer}
        />
        <TimerCell
          name={bottomName}
          timeMs={timeMs[bottomPlayer]}
          isActive={isPlaying && currentPlayer === bottomPlayer}
          align="right"
        />
      </div>
    </div>
  );
}

const TimerCell: React.FC<{ name: string; timeMs: number; isActive: boolean; align?: 'left' | 'right' }> = ({
  name,
  timeMs,
  isActive,
  align = 'left',
}) => {
  const isDead = timeMs <= 0;
  const isLow = timeMs < 30_000 && timeMs > 0;

  const cellCls = [
    'relative flex items-center justify-between px-4 py-3 transition-colors duration-200',
    isDead
      ? 'bg-danger/10'
      : isActive
        ? 'bg-accent/10'
        : 'bg-canvas',
  ].join(' ');

  const timeCls = [
    'font-display tabular-nums',
    isDead
      ? 'text-danger'
      : isLow && isActive
        ? 'text-danger animate-pulse'
        : isActive
          ? 'text-accent font-medium'
          : 'text-ink-muted',
  ].join(' ');

  return (
    <div className={cellCls}>
      {isActive && !isDead && (
        <span
          aria-hidden="true"
          className={
            'absolute top-0 bottom-0 w-[3px] bg-accent ' +
            (align === 'right' ? 'right-0' : 'left-0')
          }
        />
      )}
      <span
        className={
          'text-sm truncate ' + (isActive ? 'text-ink font-medium' : 'text-ink-muted')
        }
      >
        {name}
      </span>
      <span
        className={timeCls}
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.125rem' }}
      >
        {formatTime(timeMs)}
      </span>
    </div>
  );
};
