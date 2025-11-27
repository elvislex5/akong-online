import { useState, useEffect, useRef } from 'react';
import { onlineManager } from '../services/onlineManager';
import { createGameRoom, joinGameRoom, getRoomByCode, updateGameState as saveGameState, finishGame, abandonGame } from '../services/roomService';
import { GameState, GameMode, Player, OnlineMessage, GameRoom, Profile } from '../types';
import toast from 'react-hot-toast';

interface UseOnlineGameProps {
  user: { id: string } | null;
  profile: Profile | null;
  gameMode: GameMode | null;
  gameStateRef: React.MutableRefObject<GameState>;
  latestHandlersRef: React.MutableRefObject<{
    playMove: (idx: number) => void;
    playMoveAnimation: (idx: number, state?: GameState, steps?: any[]) => void;
    assignRole: (connId: string) => void;
  }>;
  // Callbacks for state updates that need to happen in App.tsx
  onGameStateUpdate?: (state: GameState) => void;
  onGameModeUpdate?: (mode: GameMode) => void;
  onGameEnded?: (state: GameState) => void;
  onRestart?: () => void;
  onRestartGame?: () => void;
}

export function useOnlineGame({
  user,
  profile,
  gameMode,
  gameStateRef,
  latestHandlersRef,
  onGameStateUpdate,
  onGameModeUpdate,
  onGameEnded,
  onRestart,
  onRestartGame
}: UseOnlineGameProps) {
  // Online State
  const [roomId, setRoomId] = useState<string>(''); // Room code (6 chars)
  const [roomDbId, setRoomDbId] = useState<string>(''); // DB room UUID
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [joinInputId, setJoinInputId] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<string>('');
  const [isGuest, setIsGuest] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Track Socket.io connection
  const [hasPlayer2, setHasPlayer2] = useState(false); // Track if Player 2 has joined

  // Handle reconnection and state restoration
  useEffect(() => {
    if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) {
      // Handle reconnection
      onlineManager.onReconnect((restoredState) => {
        setIsConnected(true);
        if (restoredState) {
          console.log('[useOnlineGame] Game state restored after reconnection');
          setOnlineStatus('Connecté - Partie en cours');
          toast.success('Connexion rétablie ! État du jeu restauré.');
        } else {
          setOnlineStatus('Reconnecté au serveur');
          toast.info('Reconnecté au serveur');
        }
      });

      // Handle disconnection
      onlineManager.onDisconnect(() => {
        setIsConnected(false);
        setOnlineStatus('⚠️ Connexion perdue - Tentative de reconnexion...');
        toast.error('Connexion perdue', { duration: 2000 });
      });
    }

    return () => {
      // Cleanup is handled by onlineManager.destroy()
    };
  }, [gameMode]);

  // Create Room Handler
  const handleCreateRoom = async () => {
    if (!user?.id) {
      setOnlineStatus("Erreur: Utilisateur non connecté");
      toast.error("Vous devez être connecté pour créer une partie");
      return null;
    }

    try {
      // Connect to Socket.io server first (with authentication) - only if not already connected
      if (!onlineManager.isConnected()) {
        await onlineManager.init(user.id);
      }

      // Set up message handlers before creating room
      onlineManager.onMessage((msg: OnlineMessage) => {
        if (msg.type === 'PLAYER_JOINED') {
          const id = msg.payload?.connectionId;
          if (id) {
            latestHandlersRef.current.assignRole(id);
          }
        }
        else if (msg.type === 'GUEST_PROFILE_SHARE') {
            console.log('[useOnlineGame] Host received guest profile:', msg.payload);
            setRoom(prevRoom => {
                if (prevRoom) {
                    return { ...prevRoom, guest: msg.payload };
                }
                return null;
            });
        }
        else if (msg.type === 'REMATCH_REQUEST') {
            console.log('[useOnlineGame] Host received rematch request');
            onRestartGame?.();
        }
        else if (msg.type === 'MOVE_INTENT') {
          latestHandlersRef.current.playMove(msg.payload.pitIndex);
        }
        else if (msg.type === 'GAME_ENDED') {
          onGameEnded?.(msg.payload);
        }
      });

      // Create room in Socket.io and get room code
      const roomCode = onlineManager.createRoom(user.id);
      setRoomId(roomCode);

      // Persist room in database
      const dbRoom = await createGameRoom(user.id, roomCode);
      setRoomDbId(dbRoom.id);
      setRoom(dbRoom);

      setOnlineStatus("En attente d'un adversaire...");
      setIsGuest(false);
      toast.success(`Partie créée ! Code: ${roomCode}`);

      return { roomCode, dbRoomId: dbRoom.id };

    } catch (e) {
      console.error('[useOnlineGame] Error creating room:', e);
      setOnlineStatus("Erreur création: " + (e as Error).message);
      toast.error("Impossible de créer la partie");
      return null;
    }
  };

  // Join Room Handler
  const handleJoinRoom = async () => {
    if (!joinInputId) {
      toast.error("Veuillez entrer un code de partie");
      return null;
    }

    if (!user?.id || !profile) {
      setOnlineStatus("Erreur: Utilisateur non connecté");
      toast.error("Vous devez être connecté pour rejoindre une partie");
      return null;
    }

    const roomCode = joinInputId.toUpperCase();

    try {
      // Connect to Socket.io server first (with authentication) - only if not already connected
      if (!onlineManager.isConnected()) {
        await onlineManager.init(user.id);
      }

      // Set up message handlers before joining room
      onlineManager.onMessage((msg: OnlineMessage) => {
        if (msg.type === 'ASSIGN_ROLE') {
          if (msg.payload === 'PLAYER') {
            setIsGuest(true); // Inverts view
            setOnlineStatus("Connecté en tant que JOUEUR 2");
            onGameModeUpdate?.(GameMode.OnlineGuest);
          } else {
            setIsGuest(false); // Spectators see Host view (standard)
            setOnlineStatus("Connecté en tant que SPECTATEUR");
            onGameModeUpdate?.(GameMode.OnlineSpectator);
          }
        }
        else if (msg.type === 'SYNC_STATE') {
          onGameStateUpdate?.(msg.payload);
        }
        else if (msg.type === 'REMOTE_MOVE') {
          const { pitIndex, newState, steps } = msg.payload;
          latestHandlersRef.current.playMoveAnimation(pitIndex, newState, steps);
        }
        else if (msg.type === 'RESTART') {
          onRestart?.();
        }
        else if (msg.type === 'GAME_ENDED') {
          onGameEnded?.(msg.payload);
        }
      });

      // Join the room in Socket.io
      onlineManager.joinRoom(roomCode, user.id);
      setRoomId(roomCode);
      
      const initialRoom = await getRoomByCode(roomCode);
      if (!initialRoom) {
          toast.error(`La partie ${roomCode} n'a pas été trouvée.`);
          onlineManager.destroy();
          return null;
      }
      
      if (initialRoom.status === 'waiting') {
          try {
              const dbRoom = await joinGameRoom(roomCode, user.id);
              setRoomDbId(dbRoom.id);
              setRoom(dbRoom);
              // After successfully joining as a player, share profile with the room
              onlineManager.broadcast({ type: 'GUEST_PROFILE_SHARE', payload: profile });
          } catch (joinError) {
              console.warn('[useOnlineGame] Could not join as player, falling back to spectator. Error:', joinError);
              const fallbackRoom = await getRoomByCode(roomCode);
              if (fallbackRoom) {
                  setRoomDbId(fallbackRoom.id);
                  setRoom(fallbackRoom);
              } else {
                  throw new Error("La partie a disparu après une tentative de connexion.");
              }
          }
      } else {
          setRoomDbId(initialRoom.id);
          setRoom(initialRoom);
      }

      setOnlineStatus("Connexion à l'hôte...");
      setIsGuest(true); // This is temporary, role is assigned by host
      toast.success(`Partie rejointe ! Code: ${roomCode}`);

      return { roomCode, dbRoomId: initialRoom.id };

    } catch (e) {
      console.error('[useOnlineGame] Error joining room:', e);
      setOnlineStatus("Erreur connexion: " + (e as Error).message);
      toast.error((e as Error).message || "Impossible de rejoindre la partie");
      onlineManager.destroy();
      return null;
    }
  };

  // Assign Role (for host)
  const assignRole = (connId: string) => {
    if (!hasPlayer2) {
      // First person becomes Player 2
      setHasPlayer2(true);
      onlineManager.sendTo(connId, { type: 'ASSIGN_ROLE', payload: 'PLAYER' });
      setOnlineStatus("Adversaire connecté !");
      return 'PLAYER';
    } else {
      // Subsequent people become Spectators
      onlineManager.sendTo(connId, { type: 'ASSIGN_ROLE', payload: 'SPECTATOR' });
      onlineManager.sendTo(connId, { type: 'SYNC_STATE', payload: gameStateRef.current });
      return 'SPECTATOR';
    }
  };

  const requestRematch = () => {
    onlineManager.broadcast({ type: 'REMATCH_REQUEST' });
  };

  // Save game state to database (host only)
  const saveGameStateToDB = async (gameState: GameState) => {
    if (roomDbId) {
      try {
        await saveGameState(roomDbId, gameState);
      } catch (err) {
        console.error('[useOnlineGame] Error saving game state:', err);
      }
    }
  };

  // Finish game in database
  const finishGameInDB = async (winnerId: string | null) => {
    if (roomDbId) {
      try {
        await finishGame(roomDbId, winnerId);
        console.log('[useOnlineGame] Game finished in database');
      } catch (err) {
        console.error('[useOnlineGame] Error finishing game:', err);
      }
    }
  };

  // Abandon game in database
  const abandonGameInDB = async (abandonerId: string) => {
    if (roomDbId && user?.id) {
      try {
        await abandonGame(roomDbId, abandonerId);
        console.log('[useOnlineGame] Game abandoned in database');
      } catch (err) {
        console.error('[useOnlineGame] Error abandoning game:', err);
      }
    }
  };

  // Cleanup function
  const cleanup = () => {
    onlineManager.destroy();
    setRoomId('');
    setRoomDbId('');
    setRoom(null);
    setOnlineStatus('');
    setIsGuest(false);
    setHasPlayer2(false);
    setJoinInputId('');
  };

  return {
    // State
    roomId,
    roomDbId,
    room,
    joinInputId,
    setJoinInputId,
    onlineStatus,
    setOnlineStatus,
    isGuest,
    setIsGuest,
    isConnected,
    hasPlayer2,
    setHasPlayer2,

    // Handlers
    handleCreateRoom,
    handleJoinRoom,
    assignRole,
    requestRematch,

    // Database operations
    saveGameStateToDB,
    finishGameInDB,
    abandonGameInDB,

    // Utilities
    cleanup,
  };
}

