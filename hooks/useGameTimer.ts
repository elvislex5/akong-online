import { useState, useRef, useCallback, useEffect } from 'react';
import { Player, GameStatus } from '../types';

export type TimeControl = 'none' | 'blitz' | 'rapid' | 'classical';

export interface TimeControlConfig {
  type: TimeControl;
  initialTimeMs: number;
  incrementMs: number;
  label: string;
}

export const TIME_CONTROLS: Record<TimeControl, TimeControlConfig> = {
  none: { type: 'none', initialTimeMs: 0, incrementMs: 0, label: 'Sans chrono' },
  blitz: { type: 'blitz', initialTimeMs: 3 * 60 * 1000, incrementMs: 2000, label: 'Blitz 3+2' },
  rapid: { type: 'rapid', initialTimeMs: 10 * 60 * 1000, incrementMs: 5000, label: 'Rapide 10+5' },
  classical: { type: 'classical', initialTimeMs: 30 * 60 * 1000, incrementMs: 10000, label: 'Classique 30+10' },
};

interface UseGameTimerProps {
  timeControl: TimeControl;
  currentPlayer: Player;
  gameStatus: GameStatus;
  isAnimating: boolean;
  onTimeout: (player: Player) => void;
}

interface UseGameTimerReturn {
  timeMs: Record<Player, number>;
  isRunning: boolean;
  resetTimers: () => void;
  pauseTimers: () => void;
  switchTurn: (player: Player) => void;
}

export function useGameTimer({
  timeControl,
  currentPlayer,
  gameStatus,
  isAnimating,
  onTimeout,
}: UseGameTimerProps): UseGameTimerReturn {
  const config = TIME_CONTROLS[timeControl];

  const [timeMs, setTimeMs] = useState<Record<Player, number>>({
    [Player.One]: config.initialTimeMs,
    [Player.Two]: config.initialTimeMs,
  });

  const isRunning = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const activePlayerRef = useRef<Player>(currentPlayer);
  const timeoutFiredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    if (timeControl === 'none') return;
    clearTimer();
    lastTickRef.current = performance.now();
    isRunning.current = true;

    intervalRef.current = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setTimeMs(prev => {
        const player = activePlayerRef.current;
        const newTime = Math.max(0, prev[player] - elapsed);

        if (newTime <= 0 && !timeoutFiredRef.current) {
          timeoutFiredRef.current = true;
          setTimeout(() => onTimeout(player), 0);
        }

        return { ...prev, [player]: newTime };
      });
    }, 100);
  }, [timeControl, clearTimer, onTimeout]);

  const pauseTimers = useCallback(() => {
    clearTimer();
    isRunning.current = false;
  }, [clearTimer]);

  const resetTimers = useCallback(() => {
    clearTimer();
    isRunning.current = false;
    timeoutFiredRef.current = false;
    setTimeMs({
      [Player.One]: config.initialTimeMs,
      [Player.Two]: config.initialTimeMs,
    });
  }, [clearTimer, config.initialTimeMs]);

  const switchTurn = useCallback((newPlayer: Player) => {
    if (timeControl === 'none') return;

    // Add increment to the player who just finished their turn
    const prevPlayer = newPlayer === Player.One ? Player.Two : Player.One;
    setTimeMs(prev => ({
      ...prev,
      [prevPlayer]: prev[prevPlayer] + config.incrementMs,
    }));

    activePlayerRef.current = newPlayer;

    if (gameStatus === GameStatus.Playing && !isAnimating) {
      startTicking();
    }
  }, [timeControl, config.incrementMs, gameStatus, isAnimating, startTicking]);

  // Start/stop based on game status and animation
  useEffect(() => {
    if (timeControl === 'none') return;

    if (gameStatus === GameStatus.Playing && !isAnimating) {
      activePlayerRef.current = currentPlayer;
      startTicking();
    } else {
      pauseTimers();
    }

    return clearTimer;
  }, [gameStatus, isAnimating, timeControl, currentPlayer, startTicking, pauseTimers, clearTimer]);

  // Reset when time control changes
  useEffect(() => {
    resetTimers();
  }, [timeControl]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    timeMs,
    isRunning: isRunning.current,
    resetTimers,
    pauseTimers,
    switchTurn,
  };
}

export function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
