import { useEffect, useRef, useState } from 'react';
import { onlineManager } from '../services/onlineManager';
import { useGameAnimation } from './useGameAnimation';
import {
  GameMode,
  GameStatus,
  Player,
  type GameState,
  type GameSystem,
} from '../types';

interface Args {
  roomCode: string | null;
  userId: string | null;
  /**
   * Initial state to seed the board with before SYNC_STATE arrives.
   * Usually the room.game_state from Realtime, so the board is never empty.
   */
  fallbackState: GameState | null;
}

interface SpectatorGameView {
  gameState: GameState | null;
  isAnimating: boolean;
  animHand: { pitIndex: number | null; seedCount: number };
  /** True when the socket connection is up and we're spectating the room. */
  connected: boolean;
}

const EMPTY_STATE: GameState = {
  board: Array(14).fill(0),
  scores: { [Player.One]: 0, [Player.Two]: 0 },
  currentPlayer: Player.One,
  status: GameStatus.Playing,
  winner: null,
  message: '',
  isSolidarityMode: false,
  solidarityBeneficiary: null,
};

/**
 * Connects to Socket.io as a spectator, listens for the room's broadcast
 * events, and pipes incoming moves through useGameAnimation so the board
 * is animated exactly the way it is for the players.
 *
 * - SYNC_STATE → snap to the snapshot received on join (no animation)
 * - REMOTE_MOVE → play the move with the pre-computed steps (full animation)
 * - GAME_ENDED → snap to the final state
 * - RESTART → snap to a fresh initial state
 *
 * If userId is null (anonymous), the hook stays idle and the parent should
 * fall back to Realtime-only state.
 */
export function useSpectatorGame({ roomCode, userId, fallbackState }: Args): SpectatorGameView {
  const [gameState, setGameState] = useState<GameState | null>(fallbackState);
  const [connected, setConnected] = useState(false);

  const gameStateRef = useRef<GameState>(fallbackState || EMPTY_STATE);
  const gameSystemRef = useRef<GameSystem>('mgpwem');

  // Keep ref in sync when state updates
  useEffect(() => {
    if (gameState) gameStateRef.current = gameState;
  }, [gameState]);

  // useGameAnimation drives the visual animation of moves.
  // For spectators we don't broadcast or persist; we just play the steps
  // we receive and update local state at the end.
  const animation = useGameAnimation({
    gameMode: GameMode.OnlineSpectator,
    simSpeed: 'normal',
    gameStateRef: gameStateRef as React.MutableRefObject<GameState>,
    gameSystemRef,
    user: userId ? { id: userId } : null,
    profile: null,
    onGameStateUpdate: (newState) => {
      gameStateRef.current = newState;
      setGameState(newState);
    },
  });

  // Wire up the socket. We use a ref so the latest playMoveAnimation closes
  // over the latest state on every render.
  const playMoveRef = useRef(animation.playMoveAnimation);
  playMoveRef.current = animation.playMoveAnimation;

  useEffect(() => {
    if (!roomCode || !userId) {
      setConnected(false);
      return;
    }

    let active = true;

    const setup = async () => {
      try {
        if (!onlineManager.isConnected()) {
          await onlineManager.init(userId);
        }
        if (!active) return;

        // Replace the message handler with the spectator's handler.
        // (Singleton design: the page that owns the route owns the handler.)
        onlineManager.onMessage((msg) => {
          switch (msg.type) {
            case 'SYNC_STATE': {
              const snapshot = msg.payload as GameState;
              gameStateRef.current = snapshot;
              setGameState(snapshot);
              break;
            }
            case 'REMOTE_MOVE': {
              const { pitIndex, newState, steps } = msg.payload || {};
              if (typeof pitIndex === 'number') {
                playMoveRef.current(pitIndex, newState, steps);
              }
              break;
            }
            case 'GAME_ENDED': {
              const finalState = msg.payload as GameState;
              gameStateRef.current = finalState;
              setGameState(finalState);
              break;
            }
            case 'RESTART': {
              // Server will follow up with a fresh SYNC_STATE; we just
              // clear the animation state in the meantime.
              animation.setIsAnimating(false);
              animation.setAnimHand({ pitIndex: null, seedCount: 0 });
              break;
            }
          }
        });

        onlineManager.spectateRoom(roomCode, userId);
        setConnected(true);
      } catch (err) {
        console.error('[useSpectatorGame] socket setup failed:', err);
        setConnected(false);
      }
    };

    setup();

    return () => {
      active = false;
      try {
        onlineManager.leaveSpectating(roomCode, userId);
      } catch (err) {
        console.warn('[useSpectatorGame] leaveSpectating:', err);
      }
      // Clear the message handler so a stale closure doesn't fire after unmount
      onlineManager.onMessage(() => {});
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userId]);

  return {
    gameState,
    isAnimating: animation.isAnimating,
    animHand: animation.animHand,
    connected,
  };
}
