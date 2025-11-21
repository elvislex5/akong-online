
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Board from './components/Board';
import { createInitialState, executeMove, isValidMove, getMoveSteps, resolveGameStalemate, WINNING_SCORE } from './services/songoLogic';
import { GameState, GameStatus, Player, GameMode, OnlineMessage, AnimationStep } from './types';
import { getBestMoveIterative } from './services/ai';
import { audioService } from './services/audioService';
import { onlineManager } from './services/onlineManager';
import { useAuth } from './hooks/useAuth';
import AuthScreen from './components/auth/AuthScreen';
import ProfilePage from './components/auth/ProfilePage';
import type { Profile } from './services/supabase';

const App: React.FC = () => {
  // Authentication
  const { user, authUser, profile, loading, isAuthenticated } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

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

  // Simulation Settings
  const [simSpeed, setSimSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [simDifficulty, setSimDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isSimAuto, setIsSimAuto] = useState(true); 
  const [simulationInitialState, setSimulationInitialState] = useState<GameState | null>(null); 

  // Simulation Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPitIndex, setEditPitIndex] = useState<number | null>(null);
  const [editScorePlayer, setEditScorePlayer] = useState<Player | null>(null);
  const [editValue, setEditValue] = useState(0);

  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [animHand, setAnimHand] = useState<{pitIndex: number|null, seedCount: number}>({ pitIndex: null, seedCount: 0 });

  // Online State
  const [roomId, setRoomId] = useState<string>('');
  const [joinInputId, setJoinInputId] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<string>('');
  const [isGuest, setIsGuest] = useState(false);
  // Track if a Player 2 has already joined the host
  const [hasPlayer2, setHasPlayer2] = useState(false);

  // Initialize Audio Context
  useEffect(() => {
    const handleUserInteraction = () => {
        audioService.init();
        window.removeEventListener('click', handleUserInteraction);
    };
    window.addEventListener('click', handleUserInteraction);
    return () => window.removeEventListener('click', handleUserInteraction);
  }, []);

  const toggleMute = () => {
      const muted = audioService.toggleMute();
      setIsMuted(muted);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState.status !== GameStatus.Playing) return;
    if (isAnimating) return; 

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
  }, [gameState, gameMode, simSpeed, simDifficulty, isAnimating, aiPlayer, isSimAuto, aiDifficulty]);

  
  const playMoveAnimation = async (pitIndex: number, targetState?: GameState, explicitSteps?: AnimationStep[]) => {
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

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        let runningScores = { ...startState.scores };
        let victorySoundPlayed = false;

        for (const step of steps) {
            if (step.type === 'PICKUP') {
                setAnimHand({ pitIndex: step.pitIndex!, seedCount: step.seedsInHand || 0 });
                setGameState(prev => ({
                    ...prev,
                    board: step.boardState || prev.board,
                    message: step.description || prev.message
                }));
                audioService.playPickup();
                await wait(stepDelay);
            } 
            else if (step.type === 'MOVE') {
                setAnimHand(prev => ({ ...prev, pitIndex: step.pitIndex! }));
                if (step.description) {
                    setGameState(prev => ({...prev, message: step.description!}));
                }
                await wait(stepDelay * 0.8);
            }
            else if (step.type === 'DROP') {
                setAnimHand({ pitIndex: step.pitIndex!, seedCount: step.seedsInHand || 0 });
                setGameState(prev => ({
                    ...prev,
                    board: step.boardState || prev.board
                }));
                audioService.playDrop();
                await wait(stepDelay);
            }
            else if (step.type === 'CAPTURE_PHASE') {
                setGameState(prev => ({ ...prev, message: step.description! }));
                audioService.playCapture();
                await wait(stepDelay * 2);
            }
            else if (step.type === 'SCORE') {
                const amount = step.capturedAmount || 0;
                runningScores[gameStateRef.current.currentPlayer] += amount; 
                audioService.playCapture(); 
                
                if (!victorySoundPlayed && (runningScores[Player.One] > WINNING_SCORE || runningScores[Player.Two] > WINNING_SCORE)) {
                    audioService.playWin();
                    victorySoundPlayed = true;
                    setGameState(prev => ({ ...prev, message: "Victoire imminente !" }));
                }
                await wait(stepDelay);
            }
        }

        await wait(200);
        setAnimHand({ pitIndex: null, seedCount: 0 });
        setGameState(finalState);

        // If game finished in online mode, broadcast the final state to ensure sync
        if (finalState.status === GameStatus.Finished) {
            if (!victorySoundPlayed) {
                audioService.playWin();
            }
            // Broadcast final state if we're the host
            if (gameMode === GameMode.OnlineHost) {
                onlineManager.broadcast({ type: 'GAME_ENDED', payload: finalState });
            }
        }

      } catch (error) {
          console.error("Animation error", error);
          const finalState = executeMove(gameStateRef.current, pitIndex);
          setGameState(finalState);
      } finally {
          setIsAnimating(false);
          setAnimHand({ pitIndex: null, seedCount: 0 });
      }
  };

  const playMove = (pitIndex: number) => {
      const currentState = gameStateRef.current;
      const validation = isValidMove(currentState, pitIndex);
      if (!validation.valid) return;

      if (gameMode === GameMode.OnlineGuest) {
          onlineManager.sendMessage(roomId, { type: 'MOVE_INTENT', payload: { pitIndex } });
          return; 
      } 
      
      if (gameMode === GameMode.OnlineHost) {
          const nextState = executeMove(currentState, pitIndex);
          const steps = getMoveSteps(currentState, pitIndex);
          // Broadcast to everyone (Player 2 + Spectators)
          onlineManager.broadcast({ type: 'REMOTE_MOVE', payload: { pitIndex, newState: nextState, steps } });
          playMoveAnimation(pitIndex, nextState, steps);
          return;
      }

      playMoveAnimation(pitIndex);
  };
  
  // Host logic to assign roles
  const assignRole = (connId: string) => {
      if (!hasPlayer2) {
          // First person becomes Player 2
          setHasPlayer2(true);
          onlineManager.sendTo(connId, { type: 'ASSIGN_ROLE', payload: 'PLAYER' });
          setOnlineStatus("Adversaire connecté !");
          
          // Start game for host if not started.
          // We check gameMode because gameState.status is 'Playing' by default on init.
          // If we are still in lobby (gameMode is null/undefined), start the game.
          if (gameMode !== GameMode.OnlineHost) {
              setTimeout(() => startGame(GameMode.OnlineHost), 500);
          } else {
              // If game already running (reconnect?), sync state
              onlineManager.sendTo(connId, { type: 'SYNC_STATE', payload: gameStateRef.current });
          }
      } else {
          // Subsequent people become Spectators
          onlineManager.sendTo(connId, { type: 'ASSIGN_ROLE', payload: 'SPECTATOR' });
          onlineManager.sendTo(connId, { type: 'SYNC_STATE', payload: gameStateRef.current });
      }
  };

  // Sync Ref for callbacks
  useEffect(() => {
      latestHandlersRef.current = { playMove, playMoveAnimation, assignRole };
  }, [playMove, playMoveAnimation, assignRole, hasPlayer2, gameMode]);


  const handlePitClick = useCallback((pitIndex: number) => {
    const currentState = gameStateRef.current;
    if (currentState.status !== GameStatus.Playing) return;
    if (isAnimating) return;

    if (gameMode === GameMode.VsAI && currentState.currentPlayer === aiPlayer) return;
    if (gameMode === GameMode.Simulation && isSimAuto) return; 
    
    if (gameMode === GameMode.OnlineHost && currentState.currentPlayer !== Player.One) return;
    if (gameMode === GameMode.OnlineGuest && currentState.currentPlayer !== Player.Two) return;
    if (gameMode === GameMode.OnlineSpectator) return;

    playMove(pitIndex);
  }, [gameMode, isAnimating, simSpeed, aiPlayer, isSimAuto, roomId]); 

  const startGame = (mode: GameMode, aiPlayerConfig: Player | null = null) => {
    audioService.init(); 
    setGameMode(mode);
    setAiPlayer(aiPlayerConfig);
    
    const initialState = createInitialState(mode === GameMode.Simulation ? GameStatus.Setup : GameStatus.Playing);
    initialState.message = mode === GameMode.Simulation ? "Configuration" : "Nouvelle partie";
    
    if (mode === GameMode.OnlineHost) {
        onlineManager.broadcast({ type: 'SYNC_STATE', payload: initialState });
    }

    setGameState(initialState);
    
    setSimSpeed('normal');
    setSimDifficulty('medium');
    setIsSimAuto(true); 
    setSimulationInitialState(null);

    setAnimHand({ pitIndex: null, seedCount: 0 });
    setIsAnimating(false);
  };

  const restartSimulation = () => {
      if (simulationInitialState) {
          // Restore board/scores/currentPlayer from snapshot, but force Playing status
          setGameState({
              ...simulationInitialState,
              status: GameStatus.Playing,
              message: "Simulation relancée"
          });
          setIsAnimating(false);
          setAnimHand({ pitIndex: null, seedCount: 0 });
      } else {
          // Fallback if no snapshot
          startGame(GameMode.Simulation);
      }
  };

  const restartGame = () => {
      if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) {
          if (gameMode === GameMode.OnlineHost) {
              onlineManager.broadcast({ type: 'RESTART' });
              startGame(GameMode.OnlineHost);
          }
      } else if (gameMode === GameMode.Simulation && simulationInitialState) {
          restartSimulation();
      } else if (gameMode !== null) {
          startGame(gameMode, aiPlayer);
      }
  };

  const exitToMenu = () => {
    if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest || gameMode === GameMode.OnlineSpectator) {
        onlineManager.destroy();
    }
    setGameMode(null);
    setMenuStep('main');
    setGameState(createInitialState());
    setAiPlayer(null);
    setRoomId('');
    setOnlineStatus('');
    setIsGuest(false);
    setHasPlayer2(false);
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
      try {
          // Connect to Socket.io server first
          await onlineManager.init();

          // Set up message handlers before creating room
          onlineManager.onMessage((msg) => {
             if (msg.type === 'PLAYER_JOINED') {
                 // Assign role to the newcomer using the connectionId from the payload
                 const id = msg.payload?.connectionId;
                 if (id) {
                    latestHandlersRef.current.assignRole(id);
                 }
             }
             else if (msg.type === 'MOVE_INTENT') {
                 // Host receives intent, executes authoritative move
                 latestHandlersRef.current.playMove(msg.payload.pitIndex);
             }
             else if (msg.type === 'GAME_ENDED') {
                 // Receive surrender or game end from guest
                 setGameState(msg.payload);
                 audioService.playWin();
             }
          });

          // Create room and get room ID
          const roomId = onlineManager.createRoom();
          setRoomId(roomId);
          setOnlineStatus("En attente d'un adversaire...");
          setIsGuest(false);

      } catch (e) {
          setOnlineStatus("Erreur création: " + e);
      }
  };

  const handleJoinRoom = async () => {
      if (!joinInputId) return;
      try {
          // Connect to Socket.io server first
          await onlineManager.init();

          // Set up message handlers before joining room
          onlineManager.onMessage((msg) => {
              if (msg.type === 'ASSIGN_ROLE') {
                  if (msg.payload === 'PLAYER') {
                      setIsGuest(true); // Inverts view
                      setGameMode(GameMode.OnlineGuest);
                      setOnlineStatus("Connecté en tant que JOUEUR 2");
                  } else {
                      setIsGuest(false); // Spectators see Host view (standard)
                      setGameMode(GameMode.OnlineSpectator);
                      setOnlineStatus("Connecté en tant que SPECTATEUR");
                  }
              }
              else if (msg.type === 'SYNC_STATE') {
                  setGameState(msg.payload);
              }
              else if (msg.type === 'REMOTE_MOVE') {
                  // Received authoritative result + steps
                  const { pitIndex, newState, steps } = msg.payload;
                  latestHandlersRef.current.playMoveAnimation(pitIndex, newState, steps);
              }
              else if (msg.type === 'RESTART') {
                  setGameState(createInitialState(GameStatus.Playing));
                  setAnimHand({ pitIndex: null, seedCount: 0 });
                  setIsAnimating(false);
              }
              else if (msg.type === 'GAME_ENDED') {
                  // Receive final game state with winner
                  setGameState(msg.payload);
                  audioService.playWin();
              }
          });

          // Join the room
          onlineManager.joinRoom(joinInputId.toUpperCase());
          setRoomId(joinInputId.toUpperCase());
          setOnlineStatus("Connexion à l'hôte...");
          setIsGuest(true);

      } catch (e) {
          setOnlineStatus("Erreur connexion: " + e);
      }
  };
  

  // --- SURRENDER ---
  const handleSurrender = (surrenderingPlayer: Player) => {
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

      // Broadcast surrender to other players in online mode
      if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) {
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

            {gameState.status !== GameStatus.Playing && gameMode !== GameMode.Simulation && (
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
           <div className="w-full max-w-md p-6 flex flex-col gap-4 animate-fade-in">
               {menuStep === 'main' && (
                   <>
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-700 rounded-3xl mx-auto mb-4 shadow-lg rotate-3 flex items-center justify-center">
                            <div className="text-4xl">🌰</div>
                        </div>
                        <h2 className="text-gray-400 text-sm uppercase tracking-widest">Jeu de stratégie africain</h2>
                    </div>
                    
                    <button onClick={() => startGame(GameMode.LocalMultiplayer)} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-500">2</div>
                        <div className="text-left">
                            <div className="font-bold">2 Joueurs (Local)</div>
                            <div className="text-xs text-gray-400">Sur le même écran</div>
                        </div>
                    </button>

                    <button onClick={() => setMenuStep('ai_select')} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group">
                        <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold group-hover:bg-amber-500">IA</div>
                        <div className="text-left">
                            <div className="font-bold">1 Joueur (vs IA)</div>
                            <div className="text-xs text-gray-400">Défiez l'ordinateur</div>
                        </div>
                    </button>
                    
                    <button onClick={() => setMenuStep('online_menu')} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group">
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold group-hover:bg-green-500">🌐</div>
                        <div className="text-left">
                            <div className="font-bold">Jeu en ligne</div>
                            <div className="text-xs text-gray-400">Affrontez un ami à distance</div>
                        </div>
                    </button>

                    <button onClick={() => startGame(GameMode.Simulation)} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold group-hover:bg-purple-500">⚡</div>
                        <div className="text-left">
                            <div className="font-bold">Simulation / Labo</div>
                            <div className="text-xs text-gray-400">Configurez le plateau</div>
                        </div>
                    </button>
                   </>
               )}

               {menuStep === 'online_menu' && (
                   <div className="flex flex-col gap-4">
                       <h3 className="text-xl font-bold text-center mb-4">Jeu en ligne</h3>
                       <button onClick={handleCreateRoom} className="bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-500">Créer une salle</button>
                       <button onClick={() => setMenuStep('online_join')} className="bg-gray-700 p-4 rounded-xl font-bold hover:bg-gray-600">Rejoindre une salle</button>
                       <button onClick={() => setMenuStep('main')} className="text-gray-500 mt-4">Retour</button>
                   </div>
               )}

               {menuStep === 'online_lobby' && (
                   <div className="text-center bg-gray-800 p-6 rounded-xl border border-gray-600">
                       <h3 className="text-xl font-bold text-amber-400 mb-2">Salle créée !</h3>
                       <p className="text-sm text-gray-400 mb-4">Partagez cet ID avec votre ami :</p>
                       <div className="bg-black p-4 rounded font-mono text-2xl tracking-wider select-all cursor-pointer border border-gray-700 text-white mb-4">
                           {roomId || 'Génération...'}
                       </div>
                       <div className="flex items-center justify-center gap-2 text-sm text-gray-400 animate-pulse">
                           <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                           {onlineStatus}
                       </div>
                       <button onClick={exitToMenu} className="mt-6 text-red-400 hover:text-red-300 text-sm">Annuler</button>
                   </div>
               )}

               {menuStep === 'online_join' && (
                   <div className="flex flex-col gap-4">
                       <h3 className="text-xl font-bold text-center mb-2">Rejoindre</h3>
                       <input 
                         type="text" 
                         placeholder="Entrez l'ID de la salle" 
                         value={joinInputId}
                         onChange={(e) => setJoinInputId(e.target.value)}
                         className="bg-gray-800 border border-gray-600 p-4 rounded-xl text-white text-center font-mono uppercase"
                       />
                       <button onClick={handleJoinRoom} className="bg-green-600 p-4 rounded-xl font-bold hover:bg-green-500">Rejoindre</button>
                       <p className="text-center text-sm text-gray-400 mt-2">{onlineStatus}</p>
                       <button onClick={() => setMenuStep('online_menu')} className="text-gray-500 mt-4">Retour</button>
                   </div>
               )}
               
               {menuStep === 'ai_select' && (
                   <div className="flex flex-col gap-4">
                       <h3 className="text-xl font-bold text-center mb-4">Choisissez votre camp</h3>
                       <button onClick={() => { setAiPlayer(Player.Two); setMenuStep('ai_difficulty'); }} className="bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-500 flex justify-between items-center">
                           <span>Je suis Joueur 1 (Bas)</span>
                           <span className="text-xs bg-black/20 px-2 py-1 rounded">Vous commencez</span>
                       </button>
                       <button onClick={() => { setAiPlayer(Player.One); setMenuStep('ai_difficulty'); }} className="bg-amber-600 p-4 rounded-xl font-bold hover:bg-amber-500 flex justify-between items-center">
                           <span>Je suis Joueur 2 (Haut)</span>
                           <span className="text-xs bg-black/20 px-2 py-1 rounded">L'IA commence</span>
                       </button>
                       <button onClick={() => setMenuStep('main')} className="text-gray-500 mt-4">Retour</button>
                   </div>
               )}

               {menuStep === 'ai_difficulty' && (
                   <div className="flex flex-col gap-4">
                       <h3 className="text-xl font-bold text-center mb-4">Niveau de l'IA</h3>
                       <button onClick={() => { setAiDifficulty('easy'); startGame(GameMode.VsAI, aiPlayer); }} className="bg-green-600/20 text-green-400 border border-green-600 p-4 rounded-xl font-bold hover:bg-green-600 hover:text-white">Facile</button>
                       <button onClick={() => { setAiDifficulty('medium'); startGame(GameMode.VsAI, aiPlayer); }} className="bg-amber-600/20 text-amber-400 border border-amber-600 p-4 rounded-xl font-bold hover:bg-amber-600 hover:text-white">Moyen</button>
                       <button onClick={() => { setAiDifficulty('hard'); startGame(GameMode.VsAI, aiPlayer); }} className="bg-red-600/20 text-red-400 border border-red-600 p-4 rounded-xl font-bold hover:bg-red-600 hover:text-white">Difficile</button>
                       <button onClick={() => setMenuStep('ai_select')} className="text-gray-500 mt-4">Retour</button>
                   </div>
               )}
           </div>
        ) : (
           /* GAME BOARD */
           <div className="w-full h-full flex flex-col">
               <Board 
                   gameState={gameState} 
                   onMove={handlePitClick} 
                   gameMode={gameMode}
                   isAnimating={isAnimating}
                   handState={animHand}
                   onEditPit={handleEditPit}
                   onEditScore={handleEditScore}
                   aiPlayer={aiPlayer}
                   isSimulationManual={!isSimAuto && gameMode === GameMode.Simulation}
                   invertView={isGuest}
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
      {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-600">
                  <h3 className="text-xl font-bold mb-4 text-center">
                      {editPitIndex !== null ? `Modifier Case ${editPitIndex}` : `Modifier Score ${editScorePlayer === Player.One ? 'J1 (Bas)' : 'J2 (Haut)'}`}
                  </h3>
                  <div className="flex items-center justify-center gap-4 mb-6">
                      <button onClick={() => setEditValue(Math.max(0, editValue - 1))} className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold hover:bg-gray-600">-</button>
                      <span className="text-4xl font-mono font-bold text-blue-400 w-20 text-center">{editValue}</span>
                      <button onClick={() => setEditValue(editValue + 1)} className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold hover:bg-gray-600">+</button>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setEditModalOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-700 font-bold text-gray-300">Annuler</button>
                      <button onClick={confirmEdit} className="flex-1 py-3 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500">Valider</button>
                  </div>
              </div>
          </div>
      )}

      {/* Rules Modal */}
      {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-600 relative">
                  <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-amber-500">Règles du Songo (MPEM)</h2>
                      <button onClick={() => setShowRules(false)} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">✕</button>
                  </div>
                  <div className="p-6 text-gray-300 space-y-4 leading-relaxed">
                      <section>
                          <h3 className="text-lg font-bold text-white mb-2">But du jeu</h3>
                          <p>Capturer plus de 35 graines (ou avoir plus de 35 points en fin de partie).</p>
                      </section>
                      <section>
                          <h3 className="text-lg font-bold text-white mb-2">Distribution</h3>
                          <p>On sème les graines une par une vers la droite (sens anti-horaire). Si on a plus de 14 graines, on fait un tour complet en sautant la case de départ.</p>
                      </section>
                      <section>
                          <h3 className="text-lg font-bold text-white mb-2">La Prise</h3>
                          <p>Si la dernière graine tombe chez l'adversaire et que la case contient alors 2, 3 ou 4 graines, on capture ces graines (ainsi que celles des cases précédentes si elles remplissent la même condition).</p>
                      </section>
                      <section>
                          <h3 className="text-lg font-bold text-white mb-2">Règles Spéciales</h3>
                          <ul className="list-disc pl-5 space-y-2">
                              <li><strong>Auto-capture :</strong> Si un tour complet se termine avec 1 graine restante (ex: 14, 28...), elle est capturée automatiquement.</li>
                              <li><strong>Solidarité (Le Un) :</strong> Si vous n'avez plus qu'une seule graine <em>et qu'elle est dans votre dernière case</em>, vous l'auto-capturez. L'adversaire DOIT alors jouer un coup qui vous redonne des graines (si possible).</li>
                              <li><strong>Interdiction d'assécher :</strong> On ne peut pas capturer toutes les graines de l'adversaire d'un seul coup si cela le prive de tout mouvement au tour suivant (sauf s'il n'y a pas d'autre choix).</li>
                          </ul>
                      </section>
                  </div>
              </div>
          </div>
      )}
      
      {/* Game Over / Victory Modal */}
      {gameState.status === GameStatus.Finished && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border-2 border-amber-500 p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center max-w-md transform scale-110">
                  <div className="mb-4 text-6xl">
                      {gameState.winner === 'Draw' ? '🤝' : (
                          (gameMode === GameMode.VsAI && gameState.winner === aiPlayer) ? '🤖' : '🏆'
                      )}
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">
                      {gameState.winner === 'Draw' ? 'Match Nul' : (
                          gameState.winner === Player.One ? 'JOUEUR 1 GAGNE' : 'JOUEUR 2 GAGNE'
                      )}
                  </h2>
                  <p className="text-amber-500 font-bold mb-6 text-lg">{gameState.message}</p>
                  
                  <div className="flex justify-center gap-8 mb-8 font-mono text-xl">
                      <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase">Joueur 1</span>
                          <span className="text-blue-400 font-bold">{gameState.scores[Player.One]}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase">Joueur 2</span>
                          <span className="text-amber-500 font-bold">{gameState.scores[Player.Two]}</span>
                      </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                      <button onClick={restartGame} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg transform hover:-translate-y-1 transition-all">
                          REJOUER
                      </button>
                      <button onClick={exitToMenu} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold">
                          MENU
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Surrender Confirmation Modal */}
      {showSurrenderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-600 text-center">
                  <h3 className="text-xl font-bold mb-2 text-white">Abandonner la partie ?</h3>
                  <p className="text-gray-400 mb-6 text-sm">L'adversaire sera déclaré vainqueur.</p>

                  {gameMode === GameMode.LocalMultiplayer ? (
                      <div className="flex flex-col gap-2">
                          <button onClick={() => handleSurrender(Player.One)} className="w-full py-3 rounded-xl bg-blue-900/50 text-blue-200 hover:bg-blue-900 font-bold border border-blue-800">
                              Joueur 1 abandonne
                          </button>
                          <button onClick={() => handleSurrender(Player.Two)} className="w-full py-3 rounded-xl bg-amber-900/50 text-amber-200 hover:bg-amber-900 font-bold border border-amber-800">
                              Joueur 2 abandonne
                          </button>
                      </div>
                  ) : (
                      <div className="flex gap-3">
                          <button onClick={() => setShowSurrenderModal(false)} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-bold hover:bg-gray-600">
                              Non, continuer
                          </button>
                          <button onClick={() => handleSurrender(gameMode === GameMode.OnlineGuest ? Player.Two : Player.One)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500">
                              Oui, abandonner
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

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
