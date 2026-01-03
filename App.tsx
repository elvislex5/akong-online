
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Flag } from 'lucide-react';
import BoardRevolutionary from './components/BoardRevolutionary';
import { createInitialState, executeMove, isValidMove, getMoveSteps, resolveGameStalemate } from './services/songoLogic';
import { GameState, GameStatus, Player, GameMode, AnimationStep, AIDifficulty } from './types';
import { aiService } from './services/ai';
import { audioService } from './services/audioService';
import { onlineManager } from './services/onlineManager';
import { useAuth } from './hooks/useAuth';
import { useOnlineGame } from './hooks/useOnlineGame';
import { useChat } from './hooks/useChat';
import { useGameAnimation } from './hooks/useGameAnimation';
import { useBoardSkin } from './hooks/useBoardSkin';
import { useGameContext } from './contexts/GameContext';
import { useNavigationBlocker } from './hooks/useNavigationBlocker';
import AuthScreen from './components/auth/AuthScreen';
import ProfilePage from './components/auth/ProfilePage';
import GameNavbar from './components/layout/GameNavbar';
import { MainMenuRevolutionary } from './components/menus/MainMenuRevolutionary';
import { RulesModal } from './components/modals/RulesModal';
import { GameOverModal } from './components/modals/GameOverModal';
import { SurrenderModal } from './components/modals/SurrenderModal';
import { EditSimulationModal } from './components/modals/EditSimulationModal';
import SimulationControlPanel from './components/SimulationControlPanel';
import BoardCalibrationTool from './components/BoardCalibrationTool';
import InvitationSystem from './components/InvitationSystem';
import ChatOverlay from './components/chat/ChatOverlay';
import LandscapePrompt from './components/LandscapePrompt';
import type { Profile } from './services/supabase';
import toast from 'react-hot-toast';

const App: React.FC = () => {
  const navigate = useNavigate();
  // Authentication
  const { user, authUser, profile, loading, isAuthenticated } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [playerProfiles, setPlayerProfiles] = useState<{ [key in Player]: Profile | null }>({
    [Player.One]: null,
    [Player.Two]: null,
  });

  // Game context for navigation blocking
  const { setGameInProgress } = useGameContext();

  // Get user's selected board skin
  const { boardSkinUrl } = useBoardSkin(user?.id || null);

  // Update profile when auth profile changes
  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  const [gameState, setGameState] = useState<GameState>(createInitialState());

  // REF CORRECTION: Keep a reference to the latest state to access it inside async callbacks/events
  const gameStateRef = useRef(gameState);
  const latestHandlersRef = useRef<{
    playMove: (idx: number) => void;
    playMoveAnimation: (idx: number, state?: GameState, steps?: AnimationStep[]) => void;
    assignRole: (connId: string) => void;
  }>({ playMove: () => { }, playMoveAnimation: () => { }, assignRole: () => { } });

  // Declare gameMode before it's used in effects
  const [gameMode, setGameMode] = useState<GameMode | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Update game in progress status based on gameState
  useEffect(() => {
    const isPlaying = gameState.status === GameStatus.Playing && gameMode !== null;
    setGameInProgress(isPlaying);
  }, [gameState.status, gameMode, setGameInProgress]);

  // Block navigation when game is in progress
  useNavigationBlocker(
    gameState.status === GameStatus.Playing && gameMode !== null,
    () => {
      // Show toast when user tries to navigate away
      toast.error('Veuillez abandonner la partie avant de quitter', {
        icon: '⚠️',
        duration: 3000,
      });
    }
  );
  const [menuStep, setMenuStep] = useState<'main' | 'ai_difficulty' | 'ai_select' | 'online_menu' | 'online_lobby' | 'online_join' | 'room_waiting'>('main');
  const [showRules, setShowRules] = useState(false);

  // Surrender State
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  // AI Configuration
  const [aiPlayer, setAiPlayer] = useState<Player | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [aiStartsFirst, setAiStartsFirst] = useState(false); // Track who starts first
  const [isAiThinking, setIsAiThinking] = useState(false); // Track if AI is computing

  // Simulation Settings
  const [simSpeed, setSimSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [simDifficulty, setSimDifficulty] = useState<AIDifficulty>('medium');
  const [isSimAuto, setIsSimAuto] = useState(true);
  const [simulationInitialState, setSimulationInitialState] = useState<GameState | null>(null);
  const [onlineStarter, setOnlineStarter] = useState<Player>(Player.One);

  // Simulation Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [editPitIndex, setEditPitIndex] = useState<number | null>(null);
  const [editScorePlayer, setEditScorePlayer] = useState<Player | null>(null);
  const [editValue, setEditValue] = useState(0);

  const animationRef = useRef<{
    setAnimHand: (hand: { pitIndex: number | null; seedCount: number }) => void;
    setIsAnimating: (isAnimating: boolean) => void;
  } | null>(null);

  async function handleOnlineRestart() {
    // Increment game count in DB to track alternation
    if (!onlineGame.roomDbId) {
      console.error('[App] Cannot restart: no room ID');
      return;
    }

    // Import the incrementGameCount function
    const { incrementGameCount } = await import('./services/roomService');
    const newGameCount = await incrementGameCount(onlineGame.roomDbId);

    // Determine starter based on game count (even = Player.One, odd = Player.Two)
    const nextStarter = newGameCount % 2 === 0 ? Player.One : Player.Two;

    console.log('[App] Restarting game #', newGameCount, 'Starter:', nextStarter === Player.One ? 'Player.One' : 'Player.Two');

    // Broadcast restart to all players
    onlineManager.broadcast({ type: 'RESTART' });

    // Start new game with the determined starter
    startGame(GameMode.OnlineHost, null, nextStarter);
    setOnlineStarter(nextStarter);
  }

  function restartGame() {
    if (gameMode === GameMode.OnlineHost) {
      // If the host clicks restart, they are the authority.
      handleOnlineRestart();
    } else if (gameMode === GameMode.OnlineGuest) {
      // If the guest clicks restart, they send a request to the host.
      onlineGame.requestRematch();
    } else if (gameMode === GameMode.Simulation && simulationInitialState) {
      restartSimulation();
    } else if (gameMode !== null) {
      startGame(gameMode, aiPlayer);
    }
  }

  // Chat Hook
  const chat = useChat({
    userId: user?.id || null,
    userName: profile?.username || profile?.display_name || 'Joueur',
    onBroadcastMessage: (message) => {
      onlineManager.broadcast({ type: 'CHAT_MESSAGE', payload: message });
    },
    onBroadcastTyping: (isTyping) => {
      if (!user?.id || !profile) return;
      const payload = {
        userId: user.id,
        userName: profile.username || profile.display_name || 'Joueur',
        isTyping
      };
      onlineManager.broadcast({ type: 'CHAT_TYPING', payload });
    }
  });

  // Play notification sound when receiving message while chat is closed
  useEffect(() => {
    // This effect will run when chat.messages changes
    // If chat is not open and we have messages, play the notification for the latest message
    if (!chat.isOpen && chat.messages.length > 0) {
      const latestMessage = chat.messages[chat.messages.length - 1];
      // Only play sound if the message is from someone else
      if (latestMessage.senderId !== user?.id) {
        audioService.playChatNotification();
      }
    }
  }, [chat.messages, chat.isOpen, user?.id]);

  // Clear chat when leaving online games
  useEffect(() => {
    if (gameMode !== GameMode.OnlineHost && gameMode !== GameMode.OnlineGuest) {
      chat.clearMessages();
    }
  }, [gameMode]);

  // Online Game Hook
  const onlineGame = useOnlineGame({
    user,
    profile,
    gameMode,
    gameStateRef,
    latestHandlersRef,
    onGameStateUpdate: (state) => setGameState(state),
    onGameModeUpdate: (mode) => setGameMode(mode),
    onGameEnded: (state) => {
      setGameState(state);
      audioService.playWin();
    },
    onRestart: () => {
      // This is for the generic 'RESTART' broadcast message
      setGameState(createInitialState(GameStatus.Playing));
      if (animationRef.current) {
        animationRef.current.setAnimHand({ pitIndex: null, seedCount: 0 });
        animationRef.current.setIsAnimating(false);
      }
    },
    onRestartGame: handleOnlineRestart,
    onChatMessage: (msg) => chat.receiveMessage(msg),
    onChatTyping: (uid, uname, typing) => chat.receiveTyping(uid, uname, typing),
  });

  // Animation Hook
  const animation = useGameAnimation({
    gameMode,
    simSpeed,
    gameStateRef,
    user,
    profile,
    onGameStateUpdate: setGameState,
    onFinishGameInDB: onlineGame.finishGameInDB
  });

  // Update player profiles when online room changes
  useEffect(() => {
    if (onlineGame.room) {
      setPlayerProfiles({
        [Player.One]: onlineGame.room.host,
        [Player.Two]: onlineGame.room.guest,
      });
    } else {
      // Clear profiles when not in an online game
      setPlayerProfiles({ [Player.One]: null, [Player.Two]: null });
    }
  }, [onlineGame.room]);

  // Effect to update the ref with the latest animation methods
  useEffect(() => {
    animationRef.current = {
      setAnimHand: animation.setAnimHand,
      setIsAnimating: animation.setIsAnimating,
    };
  }, [animation.setAnimHand, animation.setIsAnimating]);

  // Initialize Audio Context and Background Music
  useEffect(() => {
    const handleUserInteraction = () => {
      audioService.init();
      // Background music disabled - add music file to /public/sounds/background.mp3 to enable
      // audioService.playBackgroundMusic('/sounds/background.mp3');
      window.removeEventListener('click', handleUserInteraction);
    };
    window.addEventListener('click', handleUserInteraction);
    return () => window.removeEventListener('click', handleUserInteraction);
  }, []);

  // Handle Invitation Links
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const mode = params.get('mode');

    if (joinCode && mode === 'online') {
      if (!user) {
        toast.error("Veuillez vous connecter pour rejoindre la partie");
        return;
      }

      console.log('[App] Found invitation code:', joinCode);
      setMenuStep('online_join');
      onlineGame.setJoinInputId(joinCode);

      // Auto-join
      setTimeout(() => {
        handleJoinRoom(joinCode);
      }, 500);

      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, [user, loading]);


  // AI Turn Logic
  useEffect(() => {
    if (gameState.status !== GameStatus.Playing) return;
    if (animation.isAnimating) return;

    let timer: number;

    const runAI = async () => {
      const isAiTurn = (gameMode === GameMode.VsAI && gameState.currentPlayer === aiPlayer) ||
        (gameMode === GameMode.Simulation && isSimAuto);

      if (isAiTurn) {
        let delay = 500;
        let maxDepth = 6;
        let timeLimit = 1000; // Default time limit in ms

        if (gameMode === GameMode.Simulation) {
          switch (simSpeed) {
            case 'slow': delay = 1200; break;
            case 'normal': delay = 600; break;
            case 'fast': delay = 100; break;
          }
          switch (simDifficulty) {
            case 'easy': maxDepth = 4; timeLimit = 500; break;
            case 'medium': maxDepth = 10; timeLimit = 1500; break;
            case 'hard': maxDepth = 18; timeLimit = 3000; break;
            case 'expert': maxDepth = 25; timeLimit = 8000; break;
            case 'legend': maxDepth = 35; timeLimit = 15000; break;
          }
        } else if (gameMode === GameMode.VsAI) {
          delay = 500;
          switch (aiDifficulty) {
            case 'easy': maxDepth = 4; timeLimit = 500; break;
            case 'medium': maxDepth = 10; timeLimit = 1500; break;
            case 'hard': maxDepth = 18; timeLimit = 3000; delay = 800; break;
            case 'expert': maxDepth = 25; timeLimit = 8000; delay = 1200; break;
            case 'legend': maxDepth = 35; timeLimit = 15000; delay = 1500; break;
          }
        }

        // Show thinking indicator for Expert and Legend levels
        if (aiDifficulty === 'expert' || aiDifficulty === 'legend' ||
          (gameMode === GameMode.Simulation && (simDifficulty === 'expert' || simDifficulty === 'legend'))) {
          setIsAiThinking(true);
        }

        timer = window.setTimeout(async () => {
          try {
            // Async AI call - no longer blocks the main thread!
            const moveIndex = await aiService.getBestMove(gameState, maxDepth, timeLimit);

            setIsAiThinking(false); // Hide thinking indicator
            if (moveIndex !== -1) {
              playMove(moveIndex);
            } else {
              console.log("AI has no moves available. Resolving stalemate...");
              const endState = resolveGameStalemate(gameState);
              setGameState(endState);
              if (endState.status === GameStatus.Finished) audioService.playWin();
            }
          } catch (e) {
            console.error("AI Error:", e);
            setIsAiThinking(false);
          }
        }, delay);
      }
    };

    runAI();

    return () => clearTimeout(timer);
  }, [gameState, gameMode, simSpeed, simDifficulty, animation.isAnimating, aiPlayer, isSimAuto, aiDifficulty]);


  const playMove = (pitIndex: number) => {
    const currentState = gameStateRef.current;
    const validation = isValidMove(currentState, pitIndex);
    if (!validation.valid) return;

    if (gameMode === GameMode.OnlineGuest) {
      onlineManager.sendMessage(onlineGame.roomId, { type: 'MOVE_INTENT', payload: { pitIndex } });
      return;
    }

    if (gameMode === GameMode.OnlineHost) {
      const nextState = executeMove(currentState, pitIndex);
      const steps = getMoveSteps(currentState, pitIndex);

      // Save game state to database
      onlineGame.saveGameStateToDB(nextState);

      // Broadcast to everyone (Player 2 + Spectators)
      onlineManager.broadcast({ type: 'REMOTE_MOVE', payload: { pitIndex, newState: nextState, steps } });
      animation.playMoveAnimation(pitIndex, nextState, steps);
      return;
    }

    animation.playMoveAnimation(pitIndex);
  };

  // Host logic to assign roles
  const assignRole = (connId: string) => {
    const role = onlineGame.assignRole(connId);

    // Start game for host if not started and a player joined
    if (role === 'PLAYER' && gameMode !== GameMode.OnlineHost) {
      setTimeout(() => startGame(GameMode.OnlineHost), 500);
    } else if (gameMode === GameMode.OnlineHost) {
      // If game already running (reconnect?), sync state
      onlineManager.sendTo(connId, { type: 'SYNC_STATE', payload: gameStateRef.current });
    }
  };

  // Sync Ref for callbacks
  useEffect(() => {
    latestHandlersRef.current = { playMove, playMoveAnimation: animation.playMoveAnimation, assignRole };
  }, [playMove, animation.playMoveAnimation, assignRole, onlineGame.hasPlayer2, gameMode]);


  const handlePitClick = useCallback((pitIndex: number) => {
    const currentState = gameStateRef.current;
    if (currentState.status !== GameStatus.Playing) return;
    if (animation.isAnimating) return;

    if (gameMode === GameMode.VsAI && currentState.currentPlayer === aiPlayer) return;
    if (gameMode === GameMode.Simulation && isSimAuto) return;

    if (gameMode === GameMode.OnlineHost && currentState.currentPlayer !== Player.One) return;
    if (gameMode === GameMode.OnlineGuest && currentState.currentPlayer !== Player.Two) return;
    if (gameMode === GameMode.OnlineSpectator) return;

    playMove(pitIndex);
  }, [gameMode, animation.isAnimating, simSpeed, aiPlayer, isSimAuto, onlineGame.roomId]);

  function startGame(mode: GameMode, aiPlayerConfig: Player | null = null, startingPlayer: Player = Player.One) {
    audioService.init();
    setGameMode(mode);
    setAiPlayer(aiPlayerConfig);

    const initialState = createInitialState(mode === GameMode.Simulation ? GameStatus.Setup : GameStatus.Playing);
    initialState.message = mode === GameMode.Simulation ? "Configuration" : "Nouvelle partie";

    // Set the starting player (for AI mode and Online Host mode)
    if (mode === GameMode.VsAI || mode === GameMode.OnlineHost) {
      initialState.currentPlayer = startingPlayer;
      // Update message to reflect who starts - use real player names for online mode
      let playerName = startingPlayer === Player.One ? "Joueur 1" : "Joueur 2";
      if (mode === GameMode.OnlineHost) {
        const profile = startingPlayer === Player.One ? playerProfiles[Player.One] : playerProfiles[Player.Two];
        if (profile) {
          playerName = profile.display_name || profile.username || playerName;
        }
      }
      initialState.message = `Nouvelle partie ! Au tour de ${playerName}.`;
    }

    if (mode === GameMode.OnlineHost) {
      onlineManager.broadcast({ type: 'SYNC_STATE', payload: initialState });
    }

    setGameState(initialState);

    setSimSpeed('normal');
    setSimDifficulty('medium');
    setIsSimAuto(true);
    setSimulationInitialState(null);

    animation.setAnimHand({ pitIndex: null, seedCount: 0 });
    animation.setIsAnimating(false);
  }

  function restartSimulation() {
    if (simulationInitialState) {
      // Restore board/scores/currentPlayer from snapshot, but force Playing status
      setGameState({
        ...simulationInitialState,
        status: GameStatus.Playing,
        message: "Simulation relancée"
      });
      animation.setIsAnimating(false);
      animation.setAnimHand({ pitIndex: null, seedCount: 0 });
    } else {
      // Fallback if no snapshot
      startGame(GameMode.Simulation);
    }
  }

  function exitToMenu() {
    if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest || gameMode === GameMode.OnlineSpectator) {
      onlineGame.cleanup();
    }
    setGameMode(null);
    setMenuStep('main');
    setGameState(createInitialState());
    setAiPlayer(null);
    setOnlineStarter(Player.One); // Reset starter on exit
  }

  // --- Edit Modal Logic (Simulation) ---
  const handleEditPit = (idx: number) => {
    setEditPitIndex(idx);
    setEditScorePlayer(null);
    setEditValue(gameState.board[idx]);
    setEditModalOpen(true);
  };

  const handleEditScore = (player: Player) => {
    setEditScorePlayer(player);
    setEditPitIndex(null);
    setEditValue(gameState.scores[player]);
    setEditModalOpen(true);
  };

  const confirmEdit = () => {
    if (editPitIndex !== null) {
      const newBoard = [...gameState.board];
      newBoard[editPitIndex] = editValue;
      setGameState(prev => ({ ...prev, board: newBoard }));
    } else if (editScorePlayer !== null) {
      const newScores = { ...gameState.scores };
      newScores[editScorePlayer] = editValue;
      setGameState(prev => ({ ...prev, scores: newScores }));
    }
    setEditModalOpen(false);
  };

  // --- Simulation Logic ---
  const startSimulation = () => {
    // Save snapshot for restart
    setSimulationInitialState(gameState);
    setGameState(prev => ({ ...prev, status: GameStatus.Playing, message: "Simulation en cours..." }));
  };

  const clearBoard = () => {
    setGameState(prev => ({ ...prev, board: Array(14).fill(0), scores: { 0: 0, 1: 0 } }));
  };

  const resetBoard = () => {
    setGameState(createInitialState(GameStatus.Setup));
  };

  // --- Online Logic ---
  const handleCreateRoom = async () => {
    // Navigate to lobby? No, wait.
    // setMenuStep('online_lobby'); // Original had this?
    // Let's remove valid code?
    // The original code (Step 375):
    /*
      const handleCreateRoom = async () => {
        setMenuStep('online_lobby');
   
        // Use the hook to handle room creation
        await onlineGame.handleCreateRoom();
      };
    */
    // I want to replace the whole block.

    // Create connection, room, etc.
    const result = await onlineGame.handleCreateRoom();
    if (result) {
      setMenuStep('room_waiting');
    }
  };

  const handleJoinRoom = async (roomId?: string) => {
    // Use the hook to handle room joining
    const result = await onlineGame.handleJoinRoom(roomId);
    if (result) {
      setMenuStep('room_waiting');
    }
  };

  // --- SURRENDER ---
  const handleSurrender = async (surrenderingPlayer: Player) => {
    setShowSurrenderModal(false);

    const winner = surrenderingPlayer === Player.One ? Player.Two : Player.One;

    // Use real player names for online mode
    let playerName = surrenderingPlayer === Player.One ? "Joueur 1" : "Joueur 2";
    if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) {
      const profile = playerProfiles[surrenderingPlayer];
      if (profile) {
        playerName = profile.display_name || profile.username || playerName;
      }
    }
    const msg = `${playerName} a abandonné.`;

    const newState: GameState = {
      ...gameStateRef.current,
      status: GameStatus.Finished,
      winner: winner,
      message: msg
    };

    setGameState(newState);

    // Persist abandon in database for online games
    if ((gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) && user?.id) {
      await onlineGame.abandonGameInDB(user.id);

      // Broadcast surrender to other players
      onlineManager.broadcast({ type: 'GAME_ENDED', payload: newState });
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pb-20 pt-16 sm:pt-20 md:pt-32">

      {gameMode === null ? (
        /* MAIN MENU */
        <MainMenuRevolutionary
          menuStep={menuStep}
          setMenuStep={setMenuStep}
          startGame={startGame}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
          exitToMenu={exitToMenu}
          setAiPlayer={setAiPlayer}
          setAiStartsFirst={setAiStartsFirst}
          setAiDifficulty={setAiDifficulty}
          aiPlayer={aiPlayer}
          aiStartsFirst={aiStartsFirst}
          onlineGame={{
            roomId: onlineGame.roomId,
            room: onlineGame.room,
            onlineStatus: onlineGame.onlineStatus,
            joinInputId: onlineGame.joinInputId,
            setJoinInputId: onlineGame.setJoinInputId,
            isGuest: onlineGame.isGuest
          }}
        />
      ) : (
        /* GAME BOARD */
        <div className="w-full h-full flex flex-col py-2 sm:py-4 md:py-8">
          <BoardRevolutionary
            gameState={gameState}
            onMove={handlePitClick}
            gameMode={gameMode}
            isAnimating={animation.isAnimating}
            handState={animation.animHand}
            onEditPit={handleEditPit}
            onEditScore={handleEditScore}
            aiPlayer={aiPlayer}
            playerProfiles={playerProfiles}
            isSimulationManual={!isSimAuto && gameMode === GameMode.Simulation}
            invertView={onlineGame.isGuest}
            boardSkinUrl={boardSkinUrl}
          />

          {/* Status Bar */}
          <div className="mt-2 sm:mt-3 md:mt-4 px-4 flex flex-col items-center gap-2">
            <div className={`
                        px-4 py-1.5 sm:px-6 sm:py-2 rounded-full font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2
                        ${gameState.status === GameStatus.Playing
                ? (gameState.currentPlayer === Player.One ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-amber-900 text-amber-200 border border-amber-700')
                : 'bg-gray-800 text-gray-400 border border-gray-600'}
                    `}>
              {gameState.status === GameStatus.Playing && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
              {gameState.message}
            </div>

            {/* AI Thinking Indicator */}
            {isAiThinking && (
              <div className="px-4 py-2 bg-gradient-to-r from-purple-900/80 to-pink-900/80 backdrop-blur-xl border border-purple-500/50 rounded-full text-purple-200 text-xs sm:text-sm font-bold shadow-lg animate-pulse flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>L'IA {aiDifficulty === 'legend' ? 'Légende' : 'Expert'} réfléchit...</span>
              </div>
            )}
          </div>

          {/* Game Controls - Fixed Bottom Right (Mobile First) */}
          <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2 items-end">
            {/* Rules Button */}
            <button
              onClick={() => setShowRules(true)}
              className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600/90 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95"
              title="Règles du jeu"
              aria-label="Voir les règles du jeu"
            >
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>

            {/* Surrender Button - Only in active game */}
            {gameState.status === GameStatus.Playing && gameMode !== GameMode.Simulation && gameMode !== GameMode.OnlineSpectator && (
              <button
                onClick={() => setShowSurrenderModal(true)}
                className="w-11 h-11 sm:w-12 sm:h-12 bg-red-600/90 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95"
                title="Abandonner la partie"
                aria-label="Abandonner la partie"
              >
                <Flag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SIMULATION CONTROL PANEL - Revolutionary Design */}
      {
        gameMode === GameMode.Simulation && (
          <SimulationControlPanel
            gameStatus={gameState.status}
            currentPlayer={gameState.currentPlayer}
            simSpeed={simSpeed}
            simDifficulty={simDifficulty}
            isSimAuto={isSimAuto}
            onSetCurrentPlayer={(player) => setGameState(prev => ({ ...prev, currentPlayer: player }))}
            onSetSimSpeed={setSimSpeed}
            onSetSimDifficulty={setSimDifficulty}
            onToggleSimAuto={() => setIsSimAuto(!isSimAuto)}
            onStartSimulation={startSimulation}
            onRestartSimulation={restartSimulation}
            onClearBoard={clearBoard}
            onResetBoard={resetBoard}
            onExit={exitToMenu}
            onOpenCalibration={() => setCalibrationOpen(true)}
          />
        )
      }

      {/* BOARD CALIBRATION TOOL */}
      {
        calibrationOpen && (
          <BoardCalibrationTool
            onClose={() => setCalibrationOpen(false)}
          />
        )
      }

      {/* MODALS */}

      {/* Edit Modal (Simulation) */}
      <EditSimulationModal
        isOpen={editModalOpen}
        editPitIndex={editPitIndex}
        editScorePlayer={editScorePlayer}
        editValue={editValue}
        onSetEditValue={setEditValue}
        onConfirm={confirmEdit}
        onCancel={() => setEditModalOpen(false)}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Game Over / Victory Modal */}
      {
        gameState.status === GameStatus.Finished && (
          <GameOverModal
            gameState={gameState}
            gameMode={gameMode}
            aiPlayer={aiPlayer}
            playerProfiles={playerProfiles}
            currentUserId={user?.id}
            onRestart={restartGame}
            onExitToMenu={exitToMenu}
          />
        )
      }

      {/* Surrender Confirmation Modal */}
      <SurrenderModal
        isOpen={showSurrenderModal}
        gameMode={gameMode}
        onClose={() => setShowSurrenderModal(false)}
        onSurrender={handleSurrender}
      />

      {/* Chat Overlay (only visible during online games) */}
      {(gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) && (
        <ChatOverlay
          messages={chat.messages}
          currentUserId={user?.id || null}
          currentUserName={profile?.username || profile?.display_name || 'Joueur'}
          typingUsers={chat.typingUsers}
          onSendMessage={chat.sendMessage}
          onTypingChange={chat.handleTyping}
          isOpen={chat.isOpen}
          onToggle={chat.toggleChat}
          unreadCount={chat.unreadCount}
        />
      )}

      {/* Landscape Prompt (suggest landscape mode on mobile) */}
      <LandscapePrompt isGameActive={gameState.status === GameStatus.Playing} />
    </div>
  );
};

export default App;
