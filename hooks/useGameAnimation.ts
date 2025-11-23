import { useState, useRef } from 'react';
import { GameState, GameStatus, GameMode, Player, AnimationStep } from '../types';
import { executeMove, getMoveSteps, WINNING_SCORE } from '../services/songoLogic';
import { audioService } from '../services/audioService';
import { onlineManager } from '../services/onlineManager';
import { victoryConfetti } from '../utils/confetti';
import type { Profile } from '../services/supabase';

interface UseGameAnimationProps {
  gameMode: GameMode | null;
  simSpeed: 'slow' | 'normal' | 'fast';
  gameStateRef: React.MutableRefObject<GameState>;
  user: { id: string } | null;
  profile: Profile | null;
  onGameStateUpdate: (state: GameState) => void;
  onFinishGameInDB?: (winnerId: string | null) => void;
}

interface UseGameAnimationReturn {
  isAnimating: boolean;
  animHand: { pitIndex: number | null; seedCount: number };
  playMoveAnimation: (pitIndex: number, targetState?: GameState, explicitSteps?: AnimationStep[]) => Promise<void>;
  setIsAnimating: (value: boolean) => void;
  setAnimHand: (value: { pitIndex: number | null; seedCount: number }) => void;
}

export function useGameAnimation({
  gameMode,
  simSpeed,
  gameStateRef,
  user,
  profile,
  onGameStateUpdate,
  onFinishGameInDB
}: UseGameAnimationProps): UseGameAnimationReturn {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animHand, setAnimHand] = useState<{ pitIndex: number | null; seedCount: number }>({
    pitIndex: null,
    seedCount: 0
  });

  const playMoveAnimation = async (
    pitIndex: number,
    targetState?: GameState,
    explicitSteps?: AnimationStep[]
  ) => {
    setIsAnimating(true);

    try {
      const startState = gameStateRef.current;

      const steps = explicitSteps || getMoveSteps(startState, pitIndex);
      const finalState = targetState || executeMove(startState, pitIndex);

      let stepDelay = 250;
      const totalSteps = steps.length;

      if (totalSteps > 20) stepDelay = 150;
      if (totalSteps > 40) stepDelay = 80;

      if (gameMode === GameMode.Simulation) {
        if (simSpeed === 'fast') stepDelay = 50;
        if (simSpeed === 'slow') stepDelay = 500;
      }

      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let runningScores = { ...startState.scores };
      let victorySoundPlayed = false;

      for (const step of steps) {
        if (step.type === 'PICKUP') {
          setAnimHand({ pitIndex: step.pitIndex!, seedCount: step.seedsInHand || 0 });
          onGameStateUpdate({
            ...gameStateRef.current,
            board: step.boardState || gameStateRef.current.board,
            message: step.description || gameStateRef.current.message
          });
          audioService.playPickup();
          await wait(stepDelay);
        } else if (step.type === 'MOVE') {
          setAnimHand((prev) => ({ ...prev, pitIndex: step.pitIndex! }));
          if (step.description) {
            onGameStateUpdate({ ...gameStateRef.current, message: step.description! });
          }
          await wait(stepDelay * 0.8);
        } else if (step.type === 'DROP') {
          setAnimHand({ pitIndex: step.pitIndex!, seedCount: step.seedsInHand || 0 });
          onGameStateUpdate({
            ...gameStateRef.current,
            board: step.boardState || gameStateRef.current.board
          });
          audioService.playDrop();
          await wait(stepDelay);
        } else if (step.type === 'CAPTURE_PHASE') {
          onGameStateUpdate({ ...gameStateRef.current, message: step.description! });
          audioService.playCapture();
          await wait(stepDelay * 2);
        } else if (step.type === 'SCORE') {
          const amount = step.capturedAmount || 0;
          runningScores[gameStateRef.current.currentPlayer] += amount;
          audioService.playCapture();

          if (
            !victorySoundPlayed &&
            (runningScores[Player.One] > WINNING_SCORE || runningScores[Player.Two] > WINNING_SCORE)
          ) {
            audioService.playWin();
            victoryConfetti();
            victorySoundPlayed = true;
            onGameStateUpdate({ ...gameStateRef.current, message: 'Victoire imminente !' });
          }
          await wait(stepDelay);
        }
      }

      await wait(200);
      setAnimHand({ pitIndex: null, seedCount: 0 });
      onGameStateUpdate(finalState);

      // If game finished in online mode, broadcast the final state to ensure sync
      if (finalState.status === GameStatus.Finished) {
        if (!victorySoundPlayed) {
          audioService.playWin();
          victoryConfetti();
        }

        // Persist game result in database (host only)
        if (gameMode === GameMode.OnlineHost && user?.id && onFinishGameInDB) {
          const winnerId =
            finalState.winner === Player.One ? user.id : profile?.id || null;
          onFinishGameInDB(winnerId || null);
        }

        // Broadcast final state if we're the host
        if (gameMode === GameMode.OnlineHost) {
          onlineManager.broadcast({ type: 'GAME_ENDED', payload: finalState });
        }
      }
    } catch (error) {
      console.error('Animation error', error);
      const finalState = executeMove(gameStateRef.current, pitIndex);
      onGameStateUpdate(finalState);
    } finally {
      setIsAnimating(false);
      setAnimHand({ pitIndex: null, seedCount: 0 });
    }
  };

  return {
    isAnimating,
    animHand,
    playMoveAnimation,
    setIsAnimating,
    setAnimHand
  };
}
