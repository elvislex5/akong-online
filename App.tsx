
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Board from './components/Board';
import { createInitialState, executeMove, isValidMove, getMoveSteps, resolveGameStalemate } from './services/songoLogic';
import { GameState, GameStatus, Player, GameMode, AnimationStep } from './types';
import { getBestMoveIterative } from './services/ai';
import { audioService } from './services/audioService';
import { onlineManager } from './services/onlineManager';
import { useAuth } from './hooks/useAuth';
import { useOnlineGame } from './hooks/useOnlineGame';
import { useGameAnimation } from './hooks/useGameAnimation';
import AuthScreen from './components/auth/AuthScreen';
import ProfilePage from './components/auth/ProfilePage';
import { MainMenu } from './components/menus/MainMenu';
import { RulesModal } from './components/modals/RulesModal';
import { GameOverModal } from './components/modals/GameOverModal';
import { SurrenderModal } from './components/modals/SurrenderModal';
import { EditSimulationModal } from './components/modals/EditSimulationModal';
import type { Profile } from './services/supabase';
import toast from 'react-hot-toast';

const App: React.FC = () => {
  // Authentication
  const { user, authUser, profile, loading, isAuthenticated } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [playerProfiles, setPlayerProfiles] = useState<{ [key in Player]: Profile | null }>({
    [Player.One]: null,
    [Player.Two]: null,
  });

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
  }>({ playMove: () => {}, playMoveAnimation: () => {}, assignRole: () => {} });

  useEffect(() => {
      gameStateRef.current = gameState;
  }, [gameState]);

  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [menuStep, setMenuStep] = useState<'main' | 'ai_difficulty' | 'ai_select' | 'online_menu' | 'online_lobby' | 'online_join'>('main');
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Surrender State
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  // AI Configuration
  const [aiPlayer, setAiPlayer] = useState<Player | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiStartsFirst, setAiStartsFirst] = useState(false); // Track who starts first

  // Simulation Settings
  const [simSpeed, setSimSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [simDifficulty, setSimDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isSimAuto, setIsSimAuto] = useState(true); 
  const [simulationInitialState, setSimulationInitialState] = useState<GameState | null>(null); 
  const [onlineStarter, setOnlineStarter] = useState<Player>(Player.One);

  // Simulation Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPitIndex, setEditPitIndex] = useState<number | null>(null);
  const [editScorePlayer, setEditScorePlayer] = useState<Player | null>(null);
  const [editValue, setEditValue] = useState(0);

  const animationRef = useRef<{
    setAnimHand: (hand: { pitIndex: number | null; seedCount: number }) => void;
    setIsAnimating: (isAnimating: boolean) => void;
  } | null>(null);

  const handleOnlineRestart = () => {
    const nextStarter = onlineStarter === Player.One ? Player.Two : Player.One;
    // The host is the authority and tells everyone to restart.
    // The `RESTART` message just tells clients to reset their local board state.
    onlineManager.broadcast({ type: 'RESTART' }); 
    // The host then starts a new authoritative game state with the next player starting.
    startGame(GameMode.OnlineHost, null, nextStarter);
    setOnlineStarter(nextStarter);
  };

  const restartGame = () => {
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
  };

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

  // Initialize Audio Context
  useEffect(() => {
    const handleUserInteraction = () => {
        audioService.init();
        window.removeEventListener('click', handleUserInteraction);
    };
    window.addEventListener('click', handleUserInteraction);
    return () => window.removeEventListener('click', handleUserInteraction);
  }, []);

  // Reconnection is now handled by useOnlineGame hook

  const toggleMute = () => {
      const muted = audioService.toggleMute();
      setIsMuted(muted);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState.status !== GameStatus.Playing) return;
    if (animation.isAnimating) return; 

    let timer: number;

    const runAI = () => {
       const isAiTurn = (gameMode === GameMode.VsAI && gameState.currentPlayer === aiPlayer) || 
                        (gameMode === GameMode.Simulation && isSimAuto);

       if (isAiTurn) {
          let delay = 500;
          let maxDepth = 6; 

          if (gameMode === GameMode.Simulation) {
             switch(simSpeed) {
                case 'slow': delay = 1200; break;
                case 'normal': delay = 600; break;
                case 'fast': delay = 100; break;
             }
             switch(simDifficulty) {
                case 'easy': maxDepth = 2; break; 
                case 'medium': maxDepth = 4; break; 
                case 'hard': maxDepth = 10; break; 
             }
          } else if (gameMode === GameMode.VsAI) {
             delay = 500;
             switch(aiDifficulty) {
                case 'easy': maxDepth = 2; break;
                case 'medium': maxDepth = 4; break;
                case 'hard': maxDepth = 12; break; 
             }
          }

          timer = window.setTimeout(() => {
             try {
                 requestAnimationFrame(() => {
                     // AI uses current state from closure, which is fine as effect reruns on state change
                     const moveIndex = getBestMoveIterative(gameState, maxDepth);
                     if (moveIndex !== -1) {
                        playMove(moveIndex);
                     } else {
                        console.log("AI has no moves available. Resolving stalemate...");
                        const endState = resolveGameStalemate(gameState);
                        setGameState(endState);
                        if(endState.status === GameStatus.Finished) audioService.playWin();
                     }
                 });
             } catch (e) {
                 console.error("AI Error:", e);
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

  const startGame = (mode: GameMode, aiPlayerConfig: Player | null = null, startingPlayer: Player = Player.One) => {
    audioService.init();
    setGameMode(mode);
    setAiPlayer(aiPlayerConfig);

    const initialState = createInitialState(mode === GameMode.Simulation ? GameStatus.Setup : GameStatus.Playing);
    initialState.message = mode === GameMode.Simulation ? "Configuration" : "Nouvelle partie";

    // Set the starting player (for AI mode, this determines who plays first)
    if (mode === GameMode.VsAI) {
      initialState.currentPlayer = startingPlayer;
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
  };

  const restartSimulation = () => {
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
  };

  const exitToMenu = () => {
    if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest || gameMode === GameMode.OnlineSpectator) {
        onlineGame.cleanup();
    }
    setGameMode(null);
    setMenuStep('main');
    setGameState(createInitialState());
    setAiPlayer(null);
    setOnlineStarter(Player.One); // Reset starter on exit
  };

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
      setGameState(prev => ({ ...prev, board: Array(14).fill(0), scores: {0:0, 1:0} }));
  };
  
  const resetBoard = () => {
      setGameState(createInitialState(GameStatus.Setup));
  };

  // --- Online Logic ---
  const handleCreateRoom = async () => {
      setMenuStep('online_lobby');

      // Use the hook to handle room creation
      await onlineGame.handleCreateRoom();
  };

  const handleJoinRoom = async () => {
      // Use the hook to handle room joining
      await onlineGame.handleJoinRoom();
  };
  

  // --- SURRENDER ---
  const handleSurrender = async (surrenderingPlayer: Player) => {
      setShowSurrenderModal(false);

      const winner = surrenderingPlayer === Player.One ? Player.Two : Player.One;
      const msg = surrenderingPlayer === Player.One ? "Joueur 1 a abandonné." : "Joueur 2 a abandonné.";

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

      audioService.playWin();
  };


  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={() => {
      console.log('Authentication successful');
    }} />;
  }

  // Show game only if authenticated
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-amber-500 selection:text-white overflow-x-hidden">

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-gray-800 border-b border-gray-700 shadow-md relative z-30">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
                AKONG
            </h1>
            {gameMode === GameMode.OnlineHost && <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded border border-blue-700">HÔTE</span>}
            {gameMode === GameMode.OnlineGuest && <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-700">INVITÉ</span>}
            {gameMode === GameMode.OnlineSpectator && <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded border border-gray-500">SPECTATEUR</span>}
        </div>

        <div className="flex items-center gap-2">
            {/* Profile Button */}
            {user && userProfile && (
              <button
                onClick={() => setShowProfile(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-full text-xs font-bold border border-amber-500 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {userProfile.username}
              </button>
            )}

            <button onClick={() => setShowRules(true)} className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-900 text-amber-200 rounded-full text-xs font-bold border border-amber-700 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                RÈGLES
            </button>
            <button onClick={toggleMute} className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-gray-700 text-gray-400' : 'bg-gray-700 text-amber-400 hover:bg-gray-600'}`}>
                {isMuted ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 5.586a2 2 0 012.828 0l7.778 7.778a2 2 0 01-2.828 2.828L5.586 8.414a2 2 0 010-2.828z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9.414a2 2 0 010 2.828l-7.778 7.778a2 2 0 01-2.828-2.828L12.172 12.242a2 2 0 012.828 0z" /></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                )}
            </button>
            
            {/* Surrender Button (Only visible when playing AND a game mode is active) */}
            {gameState.status === GameStatus.Playing && gameMode !== null && gameMode !== GameMode.Simulation && gameMode !== GameMode.OnlineSpectator && (
                <button 
                    onClick={() => setShowSurrenderModal(true)}
                    className="p-2 bg-red-900/30 text-red-400 hover:bg-red-900/80 hover:text-white rounded-full transition-colors"
                    title="Abandonner"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            {(gameState.status !== GameStatus.Playing || gameMode === GameMode.OnlineSpectator) && gameMode !== GameMode.Simulation && (
                <button onClick={exitToMenu} className="p-2 bg-gray-700 hover:bg-red-600 hover:text-white rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] pb-20">

        {gameMode === null ? (
           /* MAIN MENU */
           <MainMenu
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
               onlineStatus: onlineGame.onlineStatus,
               joinInputId: onlineGame.joinInputId,
               setJoinInputId: onlineGame.setJoinInputId
             }}
           />
        ) : (
           /* GAME BOARD */
           <div className="w-full h-full flex flex-col">
               <Board
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
               />
               
               {/* Status Bar */}
               <div className="mt-4 px-4 flex justify-center">
                  <div className={`
                      px-6 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2
                      ${gameState.status === GameStatus.Playing 
                          ? (gameState.currentPlayer === Player.One ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-amber-900 text-amber-200 border border-amber-700') 
                          : 'bg-gray-800 text-gray-400 border border-gray-600'}
                  `}>
                      {gameState.status === GameStatus.Playing && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                      {gameState.message}
                  </div>
               </div>
           </div>
        )}

        {/* SIMULATION CONTROLS */}
        {gameMode === GameMode.Simulation && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 p-4 z-40 shadow-2xl">
               {gameState.status === GameStatus.Setup ? (
                   <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
                       <div className="flex gap-2">
                           <button onClick={exitToMenu} className="px-3 py-2 bg-red-900/80 hover:bg-red-600 text-white text-xs rounded font-bold">QUITTER</button>
                           <button onClick={clearBoard} className="px-3 py-2 bg-gray-700 hover:bg-red-900 text-xs rounded font-bold">VIDER</button>
                           <button onClick={resetBoard} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-xs rounded font-bold">RÉINIT.</button>
                       </div>
                       
                       {/* STARTING PLAYER TOGGLE (NEW) */}
                       <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase text-center">Qui commence ?</label>
                          <div className="flex bg-gray-900 rounded p-0.5">
                              <button 
                                  onClick={() => setGameState(prev => ({...prev, currentPlayer: Player.One}))}
                                  className={`px-2 py-1 rounded text-xs font-bold ${gameState.currentPlayer === Player.One ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
                              >
                                  BAS
                              </button>
                              <button 
                                  onClick={() => setGameState(prev => ({...prev, currentPlayer: Player.Two}))}
                                  className={`px-2 py-1 rounded text-xs font-bold ${gameState.currentPlayer === Player.Two ? 'bg-amber-600 text-white' : 'text-gray-500'}`}
                              >
                                  HAUT
                              </button>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
                           <span className="text-xs font-bold text-gray-500 px-2">VITESSE</span>
                           {(['slow', 'normal', 'fast'] as const).map(s => (
                               <button key={s} onClick={() => setSimSpeed(s)} className={`px-3 py-1 rounded text-xs font-bold uppercase ${simSpeed === s ? 'bg-gray-600 text-white' : 'text-gray-500'}`}>{s}</button>
                           ))}
                       </div>
                       
                       <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
                           <span className="text-xs font-bold text-gray-500 px-2">IA</span>
                           {(['easy', 'medium', 'hard'] as const).map(d => (
                               <button key={d} onClick={() => setSimDifficulty(d)} className={`px-3 py-1 rounded text-xs font-bold uppercase ${simDifficulty === d ? 'bg-purple-700 text-white' : 'text-gray-500'}`}>{d}</button>
                           ))}
                       </div>
                       
                       <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">MODE:</span>
                            <button onClick={() => setIsSimAuto(!isSimAuto)} className={`px-3 py-2 rounded font-bold text-xs w-24 ${isSimAuto ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                                {isSimAuto ? 'AUTO (IA)' : 'MANUEL'}
                            </button>
                       </div>

                       <button onClick={startSimulation} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold shadow-lg text-sm">
                           LANCER SIMULATION
                       </button>
                   </div>
               ) : (
                   <div className="max-w-4xl mx-auto flex items-center justify-between">
                       <div className="flex items-center gap-4">
                           <span className="text-xs font-bold text-purple-400 animate-pulse">SIMULATION EN COURS</span>
                           <div className="flex gap-2">
                               <button onClick={restartSimulation} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white" title="Recommencer">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                               </button>
                               <button onClick={() => setIsSimAuto(!isSimAuto)} className={`px-3 py-1 rounded font-bold text-xs ${isSimAuto ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                                    {isSimAuto ? 'AUTO' : 'MANUEL'}
                               </button>
                           </div>
                       </div>
                       <button onClick={exitToMenu} className="px-4 py-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded text-xs font-bold">ARRÊTER</button>
                   </div>
               )}
            </div>
        )}

      </div>

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
      {gameState.status === GameStatus.Finished && (
        <GameOverModal
          gameState={gameState}
          gameMode={gameMode}
          aiPlayer={aiPlayer}
          playerProfiles={playerProfiles}
          onRestart={restartGame}
          onExitToMenu={exitToMenu}
        />
      )}

      {/* Surrender Confirmation Modal */}
      <SurrenderModal
        isOpen={showSurrenderModal}
        gameMode={gameMode}
        onClose={() => setShowSurrenderModal(false)}
        onSurrender={handleSurrender}
      />

      {/* Profile Modal */}
      {showProfile && userProfile && (
        <ProfilePage
          profile={userProfile}
          onClose={() => setShowProfile(false)}
          onProfileUpdated={(updatedProfile) => {
            setUserProfile(updatedProfile);
            setShowProfile(false);
          }}
        />
      )}

    </div>
  );
};

export default App;
