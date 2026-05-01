
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveGameStalemate } from './services/songoLogic';
import { createInitialState, executeMove, isValidMove, getMoveSteps } from './services/gameEngine';
import { GameState, GameStatus, Player, GameMode, GameSystem, AnimationStep, AIDifficulty } from './types';
import { reloadNeuralAI } from './services/neuralAI';
import { getMove as engineGetMove, type EnginePolicy } from './services/engine';
import { audioService } from './services/audioService';
import { io } from 'socket.io-client';
import { onlineManager } from './services/onlineManager';
import { sendInvitation } from './services/invitationService';
import { recordGameForProfile } from './services/authService';
import { gameRecorder } from './services/gameRecorder';
import { useAuth } from './hooks/useAuth';
import { useOnlineGame } from './hooks/useOnlineGame';
import { useChat } from './hooks/useChat';
import { useGameAnimation } from './hooks/useGameAnimation';
import { useBoardSkin } from './hooks/useBoardSkin';
import { useSeedColor } from './hooks/useSeedColor';
import { loadAllCalibrations } from './services/boardSkinService';
import { setCalibrationCache } from './config/boardSkinConfigs';
import { initCapacitor } from './services/capacitorInit';
import { useGameContext } from './contexts/GameContext';
import { useNavigationBlocker } from './hooks/useNavigationBlocker';
import AuthScreen from './components/auth/AuthScreen';
import ProfilePage from './components/auth/ProfilePage';
import GameNavbar from './components/layout/GameNavbar';
import { MainMenuRevolutionary } from './components/menus/MainMenuRevolutionary';
import { RulesModal } from './components/modals/RulesModal';
import { GameOverModal } from './components/modals/GameOverModal';
import { SurrenderModal } from './components/modals/SurrenderModal';
import { DrawOfferModal } from './components/modals/DrawOfferModal';
import { EditSimulationModal } from './components/modals/EditSimulationModal';
import { MatchConfigModal } from './components/modals/MatchConfigModal';
import { MatchOverModal } from './components/modals/MatchOverModal';
import { GameAnalysis } from './components/GameAnalysis';
import { GameView } from './components/game/GameView';
import SimulationControlPanel from './components/SimulationControlPanel';
import BoardCalibrationTool from './components/BoardCalibrationTool';
import InvitationSystem from './components/InvitationSystem';
import ChatOverlay from './components/chat/ChatOverlay';
import LandscapePrompt from './components/LandscapePrompt';
import type { Profile, MatchFormat, MatchGame } from './services/supabase';
import { recordMatchGame, abandonMatch, getMatchHistory } from './services/roomService';
import { updateRatingAfterGame } from './services/ratingService';
import { getCadenceFromTimeControl } from './services/glicko2';
import { useGameTimer, type TimeControl } from './hooks/useGameTimer';
import { buildSGNEntries, type SGNEntry } from './services/sgnNotation';
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

  // Get user's selected board skin and seed color
  const { boardSkinUrl } = useBoardSkin(user?.id || null);
  const { seedColor } = useSeedColor(user?.id || null);

  // Update profile when auth profile changes
  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  const [gameState, setGameState] = useState<GameState>(createInitialState('mgpwem'));
  const [moveList, setMoveList] = useState<number[]>([]);
  const [sgnEntries, setSgnEntries] = useState<SGNEntry[]>([]);

  // REF CORRECTION: Keep a reference to the latest state to access it inside async callbacks/events
  const gameStateRef = useRef(gameState);
  const latestHandlersRef = useRef<{
    playMove: (idx: number) => void;
    playMoveAnimation: (idx: number, state?: GameState, steps?: AnimationStep[]) => void;
    assignRole: (connId: string) => void;
  }>({ playMove: () => { }, playMoveAnimation: () => { }, assignRole: () => { } });

  const [isSimContinuous, setIsSimContinuous] = useState<boolean>(false);
  const [triggerAutoRestart, setTriggerAutoRestart] = useState<number>(0);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameSystem, setGameSystem] = useState<GameSystem>('mgpwem');
  const gameSystemRef = useRef<GameSystem>(gameSystem);

  const gameModeRef = useRef(gameMode);
  const isSimContinuousRef = useRef(isSimContinuous);
  useEffect(() => {
    gameStateRef.current = gameState;
    gameModeRef.current = gameMode;
    gameSystemRef.current = gameSystem;
    isSimContinuousRef.current = isSimContinuous;
  }, [gameState, gameMode, gameSystem, isSimContinuous]);

  // AI Pipeline Listener
  useEffect(() => {
    const serverUrl = (import.meta as any).env?.VITE_SOCKET_SERVER_URL || 'http://localhost:3002';
    const socket = io(serverUrl, { reconnection: true });
    socket.on('AI_UPDATED', () => {
      console.log('[App] AI_UPDATED received from pipeline!');
      toast("L'IA vient d'assimiler vos nouvelles stratégies !", { icon: '🧠', duration: 5000 });
      reloadNeuralAI();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Initialize Capacitor plugins (native only)
  useEffect(() => {
    initCapacitor();
  }, []);

  // Load board skin calibrations from DB into cache
  useEffect(() => {
    loadAllCalibrations().then((cache) => {
      const obj: { [url: string]: any } = {};
      cache.forEach((val, key) => { obj[key] = val; });
      setCalibrationCache(obj);
      console.log('[App] Board calibrations loaded from DB');
    }).catch((err) => {
      console.warn('[App] Failed to load calibrations from DB, using hardcoded fallbacks:', err);
    });
  }, []);

  // Update game in progress status based on gameState
  useEffect(() => {
    const isPlaying = gameState.status === GameStatus.Playing && gameMode !== null;
    setGameInProgress(isPlaying);
  }, [gameState.status, gameMode, setGameInProgress]);

  // Simulation auto-restart listener
  useEffect(() => {
    if (triggerAutoRestart > 0) {
      restartSimulation(true); // alternate player
    }
  }, [triggerAutoRestart]);

  // Reset match-processed flag when a new game starts (Playing), not in restartSimulation
  // This prevents a race condition where the restart fires before the score effect runs
  useEffect(() => {
    if (gameState.status === GameStatus.Playing) {
      localMatchProcessedRef.current = false;
      profileStatsRecordedRef.current = false;
    }
  }, [gameState.status]);

  // Record game completions
  useEffect(() => {
    if (gameState.status === GameStatus.Finished) {
      let recWinner = null;
      if (gameState.winner === Player.One) recWinner = 0;
      else if (gameState.winner === Player.Two) recWinner = 1;
      else if (gameState.winner === 'Draw') recWinner = -1;
      gameRecorder.stopRecording(recWinner, [gameState.scores[Player.One], gameState.scores[Player.Two]]);

      // Continuous simulation: restart immediately, independent of watchdog/AI_UPDATED
      if (gameMode === GameMode.Simulation && isSimContinuous) {
        setTriggerAutoRestart(Date.now());
      }
    }
  }, [gameState.status, gameState.winner, gameState.scores]);
  // (Navigation blocker is set up below, AFTER useOnlineGame, since it depends on onlineGame.room)
  const [menuStep, setMenuStep] = useState<'main' | 'ai_difficulty' | 'ai_select' | 'online_menu' | 'online_lobby' | 'online_join' | 'room_waiting'>('main');
  const [showRules, setShowRules] = useState(false);

  // Surrender State
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  // Analysis State
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Draw Offer State
  const [showDrawOfferModal, setShowDrawOfferModal] = useState(false);
  const [drawOfferFromName, setDrawOfferFromName] = useState('');
  const [drawOfferPending, setDrawOfferPending] = useState(false);

  // Match System State (online + local)
  const [showMatchConfigModal, setShowMatchConfigModal] = useState(false);
  const [selectedMatchFormat, setSelectedMatchFormat] = useState<MatchFormat>('infinite');
  const [selectedMatchTarget, setSelectedMatchTarget] = useState<number | undefined>();
  const [showMatchOverModal, setShowMatchOverModal] = useState(false);
  const [matchHistory, setMatchHistory] = useState<MatchGame[]>([]);
  const [matchScoreVersion, setMatchScoreVersion] = useState(0);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>('none');

  // Local match state (VsAI / LocalMultiplayer)
  const [pendingLocalGameMode, setPendingLocalGameMode] = useState<{ mode: GameMode; aiPlayerConfig: Player | null; startingPlayer: Player } | null>(null);
  const [pendingTournamentId, setPendingTournamentId] = useState<string | null>(null);
  const [pendingInviteUserId, setPendingInviteUserId] = useState<string | null>(null);
  const [localMatchScores, setLocalMatchScores] = useState<{ [key in Player]: number }>({ [Player.One]: 0, [Player.Two]: 0 });
  const [localMatchWinner, setLocalMatchWinner] = useState<Player | 'Draw' | null>(null);
  const [localMatchGameCount, setLocalMatchGameCount] = useState(0);
  const [localMatchHistory, setLocalMatchHistory] = useState<Array<{ gameNumber: number; winnerPlayer: Player | 'Draw' | null; scoreOne: number; scoreTwo: number }>>([]);
  // Refs to avoid stale closures in the match-end effect
  const localMatchStartedRef = useRef(false);
  const localMatchProcessedRef = useRef(false);
  // Guards profile stats from being incremented twice for the same finished game
  const profileStatsRecordedRef = useRef(false);

  // AI Configuration
  const [aiPlayer, setAiPlayer] = useState<Player | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [aiStartsFirst, setAiStartsFirst] = useState(false); // Track who starts first
  const [isAiThinking, setIsAiThinking] = useState(false); // Track if AI is computing

  // Simulation Settings
  const [simSpeed, setSimSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [simDifficultyP1, setSimDifficultyP1] = useState<AIDifficulty>('legend');
  const [simDifficultyP2, setSimDifficultyP2] = useState<AIDifficulty>('neural');
  const [isSimAuto, setIsSimAuto] = useState<boolean>(true);
  const [simulationInitialState, setSimulationInitialState] = useState<GameState | null>(null);
  const [onlineStarter, setOnlineStarter] = useState<Player>(Player.One);

  // Profile game-stat increment (CDC §9.1) — runs once per finished game,
  // only for an authenticated human player. This effect is below all state
  // declarations because it depends on `aiPlayer`/`gameMode`. Skipped for
  // Simulation (AI vs AI) and LocalMultiplayer (no clear ownership).
  useEffect(() => {
    if (gameState.status !== GameStatus.Finished) return;
    if (profileStatsRecordedRef.current) return;
    if (!user?.id) return;

    const humanPlayer: Player | null =
      gameMode === GameMode.VsAI
        ? (aiPlayer === Player.One ? Player.Two : Player.One)
        : gameMode === GameMode.OnlineHost
          ? Player.One
          : gameMode === GameMode.OnlineGuest
            ? Player.Two
            : null;

    if (humanPlayer === null) return;

    let outcome: 'win' | 'loss' | 'draw';
    if (gameState.winner === 'Draw') outcome = 'draw';
    else if (gameState.winner === humanPlayer) outcome = 'win';
    else outcome = 'loss';

    profileStatsRecordedRef.current = true;
    recordGameForProfile(user.id, outcome);
  }, [gameState.status, gameState.winner, user?.id, gameMode, aiPlayer]);


  // Detect local match game end and update match scores
  useEffect(() => {
    if (gameState.status !== GameStatus.Finished) return;
    if (localMatchProcessedRef.current) return;
    
    // We treat simulation matches as infinite local matches to track progress
    const isLocalMatch = ((gameMode === GameMode.VsAI || gameMode === GameMode.LocalMultiplayer) && selectedMatchFormat !== 'infinite' && localMatchStartedRef.current)
      || (gameMode === GameMode.Simulation && localMatchStartedRef.current);
      
    if (!isLocalMatch) return;

    localMatchProcessedRef.current = true;

    const winner = gameState.winner;
    const isPlayerOne = winner === Player.One ? 1 : 0;
    const isPlayerTwo = winner === Player.Two ? 1 : 0;

    const newScores = {
      [Player.One]: localMatchScores[Player.One] + isPlayerOne,
      [Player.Two]: localMatchScores[Player.Two] + isPlayerTwo,
    };
    const newCount = localMatchGameCount + 1;
    const newHistory = [
      ...localMatchHistory,
      { gameNumber: newCount, winnerPlayer: winner, scoreOne: gameState.scores[Player.One], scoreTwo: gameState.scores[Player.Two] }
    ];

    setLocalMatchScores(newScores);
    setLocalMatchGameCount(newCount);
    setLocalMatchHistory(newHistory);

    const result = checkLocalMatchComplete(selectedMatchFormat, selectedMatchTarget, newScores[Player.One], newScores[Player.Two], newCount);
    if (result.complete) {
      setLocalMatchWinner(result.winner);
      setShowMatchOverModal(true);
      if (result.winner === Player.One || result.winner === Player.Two) {
        const winnerName = result.winner === Player.One
          ? (playerProfiles[Player.One]?.display_name || "Joueur 1")
          : (playerProfiles[Player.Two]?.display_name || "Joueur 2");
        toast.success(`🏆 Match terminé ! Gagnant: ${winnerName}`, { duration: 5000 });
      } else {
        toast('🤝 Match nul !', { duration: 5000 });
      }
    } else {
      toast(`Score du match: ${newScores[Player.One]} - ${newScores[Player.Two]}`, { icon: '📊', duration: 3000 });
    }
  }, [gameState.status, gameState.winner, localMatchScores, localMatchGameCount, localMatchHistory, gameMode, selectedMatchFormat]);


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
      // For local matches, alternate starting player each game
      if (localMatchStartedRef.current && selectedMatchFormat !== 'infinite') {
        const nextStarter = localMatchGameCount % 2 === 0 ? Player.One : Player.Two;
        startGame(gameMode, aiPlayer, nextStarter);
      } else {
        startGame(gameMode, aiPlayer);
      }
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
    onGameEnded: async (state) => {
      setGameState(state);
      audioService.playWin();
      // Host records the game when it receives a surrender GAME_ENDED from the guest
      if (gameMode === GameMode.OnlineHost && onlineGame.room?.match_format !== 'infinite' && onlineGame.roomDbId) {
        const winnerId = state.winner === Player.One
          ? (onlineGame.room?.host_id || null)
          : (state.winner === Player.Two ? (onlineGame.room?.guest_id || null) : null);
        await handleRecordMatchGame(winnerId, state.scores[Player.One], state.scores[Player.Two]);
      }
    },
    onRestart: () => {
      // This is for the generic 'RESTART' broadcast message
      setGameState(createInitialState(gameSystemRef.current, GameStatus.Playing));
      if (animationRef.current) {
        animationRef.current.setAnimHand({ pitIndex: null, seedCount: 0 });
        animationRef.current.setIsAnimating(false);
      }
    },
    onRestartGame: handleOnlineRestart,
    onChatMessage: (msg) => chat.receiveMessage(msg),
    onChatTyping: (uid, uname, typing) => chat.receiveTyping(uid, uname, typing),
    onMatchScoreUpdate: () => {
      // Force re-render of MatchScoreDisplay when scores update
      setMatchScoreVersion(v => v + 1);
    },
    onMatchComplete: async (payload) => {
      console.log('[App] Match complete event received:', payload);

      // Force re-render of MatchScoreDisplay (room was updated in useOnlineGame)
      setMatchScoreVersion(v => v + 1);

      // Load match history and show MatchOverModal
      if (onlineGame.roomDbId) {
        try {
          const history = await getMatchHistory(onlineGame.roomDbId);
          setMatchHistory(history);
          setShowMatchOverModal(true);
        } catch (err) {
          console.error('[App] Error loading match history:', err);
          setShowMatchOverModal(true); // Show anyway
        }
      }
    },
    onDrawOffer: (fromName: string) => {
      setDrawOfferFromName(fromName);
      setShowDrawOfferModal(true);
    },
    onDrawAccepted: () => {
      setDrawOfferPending(false);
      const drawState: GameState = {
        ...gameStateRef.current,
        board: [...gameStateRef.current.board],
        scores: { ...gameStateRef.current.scores },
        status: GameStatus.Finished,
        winner: 'Draw',
        message: 'Nulle acceptée par les deux joueurs.',
      };
      setGameState(drawState);

      if (gameMode === GameMode.OnlineHost && onlineGame.roomDbId) {
        handleRecordMatchGame(null, drawState.scores[Player.One], drawState.scores[Player.Two]);
        onlineManager.broadcast({ type: 'GAME_ENDED', payload: drawState });
      }
    },
  });

  // Record match game callback
  const handleRecordMatchGame = async (winnerId: string | null, scoreHost: number, scoreGuest: number) => {
    if (!onlineGame.roomDbId || !onlineGame.room) return;

    try {
      const result = await recordMatchGame(
        onlineGame.roomDbId,
        winnerId,
        scoreHost,
        scoreGuest,
        undefined, // duration (could be implemented later)
        gameStateRef.current
      );

      console.log('[App] Match game recorded:', result);

      // Update Glicko-2 ratings
      if (onlineGame.room.guest_id) {
        const cadence = getCadenceFromTimeControl(gameTimer.timeControl?.initialTime || 600);
        const ratingResult = await updateRatingAfterGame(
          winnerId,
          onlineGame.room.host_id,
          onlineGame.room.guest_id,
          gameSystemRef.current,
          cadence,
        );
        if (ratingResult) {
          const sign = ratingResult.deltaHost >= 0 ? '+' : '';
          toast(`Rating: ${sign}${ratingResult.deltaHost}`, {
            icon: ratingResult.deltaHost >= 0 ? '📈' : '📉',
            duration: 3000,
          });
        }
      }

      // Broadcast match score update to all players (guest and spectators)
      onlineManager.broadcast({
        type: 'MATCH_SCORE_UPDATE',
        payload: {
          matchScoreHost: result.matchScoreHost,
          matchScoreGuest: result.matchScoreGuest,
          gameNumber: result.gameNumber,
          matchComplete: result.matchComplete,
          matchWinnerId: result.matchWinnerId
        }
      });

      // Also update local room state for host (since broadcast doesn't send to self)
      // This ensures MatchScoreDisplay updates immediately for the host
      onlineGame.room.match_score_host = result.matchScoreHost;
      onlineGame.room.match_score_guest = result.matchScoreGuest;
      onlineGame.room.game_count = result.gameNumber;
      onlineGame.room.match_status = result.matchComplete ? 'completed' : 'in_progress';
      onlineGame.room.match_winner_id = result.matchWinnerId;

      // Force re-render of MatchScoreDisplay
      setMatchScoreVersion(v => v + 1);

      // Check if the match is complete
      if (result.matchComplete) {
        // Match is finished!
        const matchWinnerName = result.matchWinnerId === onlineGame.room?.host_id
          ? (playerProfiles[Player.One]?.display_name || "Joueur 1")
          : (playerProfiles[Player.Two]?.display_name || "Joueur 2");

        toast.success(`🏆 Match terminé ! Gagnant: ${matchWinnerName}`, { duration: 5000 });
        console.log(`[App] Match complete! Winner: ${matchWinnerName}, Score: ${result.matchScoreHost}-${result.matchScoreGuest}`);

        // Load match history and show MatchOverModal
        try {
          const history = await getMatchHistory(onlineGame.roomDbId);
          setMatchHistory(history);
          setShowMatchOverModal(true);
        } catch (historyErr) {
          console.error('[App] Error loading match history:', historyErr);
          // Show modal anyway without history
          setShowMatchOverModal(true);
        }
      } else {
        // Match continues, show current score
        toast(`Score du match: ${result.matchScoreHost} - ${result.matchScoreGuest}`, {
          icon: '📊',
          duration: 3000
        });
      }
    } catch (err) {
      console.error('[App] Error recording match game:', err);
      toast.error('Erreur lors de l\'enregistrement de la partie');
    }
  };

  // Timer Hook
  const handleTimeout = useCallback((player: Player) => {
    const loser = player;
    const winner = loser === Player.One ? Player.Two : Player.One;
    const timeoutState: GameState = {
      ...gameStateRef.current,
      board: [...gameStateRef.current.board],
      scores: { ...gameStateRef.current.scores },
      status: GameStatus.Finished,
      winner,
      message: `${loser === Player.One ? 'Joueur 1' : 'Joueur 2'} a perdu au temps !`,
    };
    setGameState(timeoutState);
    audioService.playWin();

    if (gameMode === GameMode.OnlineHost && onlineGame.roomDbId) {
      const winnerId = winner === Player.One
        ? (onlineGame.room?.host_id || null)
        : (onlineGame.room?.guest_id || null);
      handleRecordMatchGame(winnerId, timeoutState.scores[Player.One], timeoutState.scores[Player.Two]);
      onlineManager.broadcast({ type: 'GAME_ENDED', payload: timeoutState });
    }
  }, [gameMode, onlineGame.roomDbId, onlineGame.room]);

  const gameTimer = useGameTimer({
    timeControl: selectedTimeControl,
    currentPlayer: gameState.currentPlayer,
    gameStatus: gameState.status,
    isAnimating: false, // will be updated after animation hook
    onTimeout: handleTimeout,
  });

  // Animation Hook
  const animation = useGameAnimation({
    gameMode,
    simSpeed,
    gameStateRef,
    gameSystemRef,
    user,
    profile,
    guestId: onlineGame.room?.guest_id ?? null,
    onGameStateUpdate: setGameState,
    onFinishGameInDB: onlineGame.finishGameInDB,
    onRecordMatchGame: handleRecordMatchGame
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

  // Block navigation away when:
  //  - a game is being actively played (status = Playing), OR
  //  - the host has an open online room waiting for a guest (no one joined yet,
  //    status = 'waiting' in DB). Otherwise the host could leave a stale room
  //    behind and the invitee would join an empty/abandoned game.
  // Placed here (after useOnlineGame) so onlineGame.room is in scope.
  const isHostWaitingForGuest =
    gameMode === GameMode.OnlineHost &&
    onlineGame.room !== null &&
    onlineGame.room.status === 'waiting';

  useNavigationBlocker(
    (gameState.status === GameStatus.Playing && gameMode !== null) || isHostWaitingForGuest,
    () => {
      const message = isHostWaitingForGuest
        ? 'Vous attendez un adversaire. Cliquez sur Quitter pour annuler la partie.'
        : 'Veuillez abandonner la partie avant de quitter.';
      toast.error(message, {
        icon: '⚠️',
        duration: 3000,
      });
    }
  );

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
    const action = params.get('action');

    // 1) ?join=CODE (with or without mode=online) — auto-join an online room.
    //    Used by /lobby's "Rejoindre" buttons AND by legacy invitation links.
    if (joinCode) {
      if (!user) {
        toast.error('Veuillez vous connecter pour rejoindre la partie');
        return;
      }
      setMenuStep('online_join');
      onlineGame.setJoinInputId(joinCode);
      setTimeout(() => {
        handleJoinRoom(joinCode);
      }, 500);
      window.history.replaceState({}, '', '/game');
      return;
    }

    // 2) ?action=create-online — open match-config and create an online room
    //    immediately. Used by /lobby's "Créer une partie" and by tournament
    //    detail pages, which append &tournament=<id> to tag the room.
    if (action === 'create-online') {
      if (!user) {
        toast.error('Veuillez vous connecter pour créer une partie');
        return;
      }
      const tournamentId = params.get('tournament');
      const inviteUserId = params.get('invite');
      setPendingTournamentId(tournamentId || null);
      setPendingInviteUserId(inviteUserId || null);
      setMenuStep('online_menu');
      handleCreateRoom();
      window.history.replaceState({}, '', '/game');
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
        // UI delay (time before the AI actually starts thinking) and the
        // per-difficulty compute budget. Compute is now delegated to
        // services/engine — see the policy mapping below.
        let delay = 500;
        let timeLimit: number | undefined = 1000;

        const currentDifficulty = gameMode === GameMode.Simulation
          ? (gameState.currentPlayer === Player.One ? simDifficultyP1 : simDifficultyP2)
          : aiDifficulty;

        if (gameMode === GameMode.Simulation) {
          switch (simSpeed) {
            case 'slow': delay = 1200; break;
            case 'normal': delay = 600; break;
            case 'fast': delay = 100; break;
          }
        }

        // UX-only delay override + compute budget per difficulty.
        // (Depth is chosen internally by the legacy engine policy; see
        //  services/engine/policies/legacy.ts for the canonical mapping.)
        switch (currentDifficulty) {
          case 'easy':   timeLimit = 500;   break;
          case 'medium': timeLimit = 1500;  break;
          case 'hard':   timeLimit = 3000;  delay = Math.max(delay, 800); break;
          case 'expert': timeLimit = 8000;  delay = Math.max(delay, 1200); break;
          case 'legend': timeLimit = 15000; delay = Math.max(delay, 1500); break;
          case 'neural': timeLimit = 5000;  delay = Math.max(delay, 800); break;
        }

        // Show thinking indicator for Expert, Legend and Neural levels
        if (currentDifficulty === 'expert' || currentDifficulty === 'legend' || currentDifficulty === 'neural') {
          setIsAiThinking(true);
        }

        timer = window.setTimeout(async () => {
          try {
            const policy: EnginePolicy = currentDifficulty === 'neural'
              ? { kind: 'master', timeLimitMs: timeLimit }
              : { kind: 'legacy', difficulty: currentDifficulty };

            const response = await engineGetMove(gameState, policy, {
              gameSystem: gameSystemRef.current,
              timeLimitMs: timeLimit,
            });
            const moveIndex = response.move;
            const neuralPolicy = response.policy ?? null;

            setIsAiThinking(false);
            if (moveIndex !== -1) {
              if (neuralPolicy) gameRecorder.setPendingPolicy(neuralPolicy);
              playMove(moveIndex);
            } else {
              console.log('AI has no moves available. Resolving stalemate...');
              const endState = resolveGameStalemate(gameState); // Mgpwém-only, angbwe handles this in executeMove
              setGameState(endState);
              if (endState.status === GameStatus.Finished) audioService.playWin();
            }
          } catch (e) {
            console.error('AI Error:', e);
            setIsAiThinking(false);
          }
        }, delay);
      }
    };

    runAI();

    return () => clearTimeout(timer);
  }, [gameState, gameMode, simSpeed, simDifficultyP1, simDifficultyP2, animation.isAnimating, aiPlayer, isSimAuto, aiDifficulty]);


  const playMove = (pitIndex: number) => {
    const currentState = gameStateRef.current;
    const gs = gameSystemRef.current;
    const validation = isValidMove(gs, currentState, pitIndex);
    if (!validation.valid) return;

    gameRecorder.recordMove(pitIndex);
    setMoveList(prev => {
      const updated = [...prev, pitIndex];
      setSgnEntries(buildSGNEntries(Array(14).fill(gs === 'angbwe' ? 4 : 5), updated));
      return updated;
    });

    if (gameMode === GameMode.OnlineGuest) {
      onlineManager.sendMessage(onlineGame.roomId, { type: 'MOVE_INTENT', payload: { pitIndex } });
      return;
    }

    if (gameMode === GameMode.OnlineHost) {
      const nextState = executeMove(gs, currentState, pitIndex);
      const steps = getMoveSteps(gs, currentState, pitIndex);

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

  // --- LOCAL MATCH HELPERS ---

  function checkLocalMatchComplete(format: MatchFormat, target: number | undefined, s1: number, s2: number, count: number): { complete: boolean; winner: Player | 'Draw' | null } {
    switch (format) {
      case 'infinite': return { complete: false, winner: null };
      case 'traditional_6':
        if (count >= 6) {
          if (s1 > s2) return { complete: true, winner: Player.One };
          if (s2 > s1) return { complete: true, winner: Player.Two };
          return { complete: true, winner: 'Draw' };
        }
        return { complete: false, winner: null };
      case 'traditional_2':
        if (count >= 2) {
          if (s1 > s2) return { complete: true, winner: Player.One };
          if (s2 > s1) return { complete: true, winner: Player.Two };
          return { complete: true, winner: 'Draw' };
        }
        return { complete: false, winner: null };
      case 'first_to_x':
        if (!target) return { complete: false, winner: null };
        if (s1 >= target) return { complete: true, winner: Player.One };
        if (s2 >= target) return { complete: true, winner: Player.Two };
        return { complete: false, winner: null };
      default: return { complete: false, winner: null };
    }
  }

  function resetLocalMatchState() {
    setLocalMatchScores({ [Player.One]: 0, [Player.Two]: 0 });
    setLocalMatchWinner(null);
    setLocalMatchGameCount(0);
    setLocalMatchHistory([]);
    localMatchProcessedRef.current = false;
  }

  function startGame(mode: GameMode, aiPlayerConfig: Player | null = null, startingPlayer: Player = Player.One) {
    const isLocalMode = mode === GameMode.LocalMultiplayer || mode === GameMode.VsAI;

    // First time starting a local game: show match format modal
    if (isLocalMode && !localMatchStartedRef.current) {
      setPendingLocalGameMode({ mode, aiPlayerConfig, startingPlayer });
      setShowMatchConfigModal(true);
      return;
    }

    // Reset processed flag for each new game
    localMatchProcessedRef.current = false;

    audioService.init();
    setGameMode(mode);
    setAiPlayer(aiPlayerConfig);

    const initialState = createInitialState(gameSystem, mode === GameMode.Simulation ? GameStatus.Setup : GameStatus.Playing);
    initialState.message = mode === GameMode.Simulation
      ? "Configuration"
      : gameSystem === 'angbwe' ? "Angbwé — Nouvelle partie !" : "Nouvelle partie";

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
    gameTimer.resetTimers();
    setDrawOfferPending(false);
    setShowDrawOfferModal(false);
    setMoveList([]);
    setSgnEntries([]);

    setSimSpeed('normal');
    setSimDifficultyP1('legend');
    setSimDifficultyP2('neural');
    setIsSimAuto(true);
    setSimulationInitialState(null);

    animation.setAnimHand({ pitIndex: null, seedCount: 0 });
    animation.setIsAnimating(false);

    // Start recording if not in Simulation mode
    if (mode !== GameMode.Simulation) {
      gameRecorder.startRecording({
        mode: GameMode[mode],
        player1: mode === GameMode.VsAI && aiPlayerConfig === Player.One
          ? `AI (${aiDifficulty})`
          : (playerProfiles[Player.One]?.display_name || 'Joueur 1'),
        player2: mode === GameMode.VsAI && aiPlayerConfig === Player.Two
          ? `AI (${aiDifficulty})`
          : (playerProfiles[Player.Two]?.display_name || 'Joueur 2'),
        aiDifficulty: mode === GameMode.VsAI ? aiDifficulty : undefined,
        initialBoard: initialState.board
      });
    }
  }

  function restartSimulation(alternate = false) {
    if (simulationInitialState) {
      let nextPlayer = simulationInitialState.currentPlayer;
      if (alternate) {
        nextPlayer = nextPlayer === Player.One ? Player.Two : Player.One;
      }

      const newState = {
        ...simulationInitialState,
        currentPlayer: nextPlayer,
        status: GameStatus.Playing,
        message: "Simulation relancée"
      };
      
      setSimulationInitialState(newState); // Commit alternating player
      setGameState(newState);
      
      animation.setIsAnimating(false);
      animation.setAnimHand({ pitIndex: null, seedCount: 0 });

      gameRecorder.startRecording({
        mode: "Simulation",
        player1: `AI (${simDifficultyP1})`,
        player2: `AI (${simDifficultyP2})`,
        initialBoard: newState.board
      });
    } else {
      // Fallback if no snapshot
      startGame(GameMode.Simulation);
    }
  }

  function exitToMenu() {
    // If the user is leaving an online room that is still active (waiting OR
    // playing), abandon it in DB so the invitee doesn't end up in a phantom
    // room and the cron doesn't have to wait 5 minutes to clean it up.
    // Fire-and-forget: we don't block UI on the DB write.
    if (
      (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) &&
      user?.id &&
      onlineGame.room &&
      (onlineGame.room.status === 'waiting' || onlineGame.room.status === 'playing')
    ) {
      // Notify the other player (if any) so their game ends cleanly.
      // For a waiting room this is a no-op (no opponent yet).
      try {
        onlineManager.broadcast({
          type: 'GAME_ENDED',
          payload: {
            ...gameStateRef.current,
            status: GameStatus.Finished,
            winner: gameMode === GameMode.OnlineHost ? Player.Two : Player.One,
            message: 'Adversaire parti.',
          },
        });
      } catch (err) {
        console.error('[exitToMenu] broadcast failed:', err);
      }

      onlineGame.abandonGameInDB(user.id).catch((err) =>
        console.error('[exitToMenu] abandonGameInDB:', err)
      );
    }

    if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest || gameMode === GameMode.OnlineSpectator) {
      onlineGame.cleanup();
    }
    setGameMode(null);
    setMenuStep('main');
    setGameState(createInitialState(gameSystem));
    setAiPlayer(null);
    setOnlineStarter(Player.One);
    // Reset local match state
    localMatchStartedRef.current = false;
    resetLocalMatchState();
    setSelectedMatchFormat('infinite');
    setSelectedMatchTarget(undefined);
    setSelectedTimeControl('none');
    setShowMatchOverModal(false);
    gameTimer.resetTimers();
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

  const startSimulation = () => {
    // Save snapshot for restart
    setSimulationInitialState(gameState);
    setGameState(prev => ({ ...prev, status: GameStatus.Playing, message: "Simulation en cours..." }));
    
    // Reset local scores for simulation UI
    setLocalMatchGameCount(0);
    setLocalMatchHistory([]);
    setLocalMatchScores({ [Player.One]: 0, [Player.Two]: 0 });
    localMatchStartedRef.current = true;
    localMatchProcessedRef.current = false;
    
    gameRecorder.startRecording({
      mode: "Simulation",
      player1: `AI (${simDifficultyP1})`,
      player2: `AI (${simDifficultyP2})`,
      initialBoard: gameState.board
    });
  };

  const clearBoard = () => {
    setGameState(prev => ({ ...prev, board: Array(14).fill(0), scores: { 0: 0, 1: 0 } }));
  };

  const resetBoard = () => {
    setGameState(createInitialState(gameSystemRef.current, GameStatus.Setup));
  };

  // --- Online Logic ---
  const handleCreateRoom = async () => {
    // Show match config modal first
    setShowMatchConfigModal(true);
  };

  const handleMatchConfigConfirm = async (format: MatchFormat, target?: number, timeControl?: TimeControl) => {
    setSelectedMatchFormat(format);
    setSelectedMatchTarget(target);
    setSelectedTimeControl(timeControl || 'none');
    setShowMatchConfigModal(false);

    if (pendingLocalGameMode) {
      // Local game (VsAI / LocalMultiplayer): reset match and start
      resetLocalMatchState();
      localMatchStartedRef.current = true;
      const { mode, aiPlayerConfig, startingPlayer } = pendingLocalGameMode;
      setPendingLocalGameMode(null);
      startGame(mode, aiPlayerConfig, startingPlayer);
    } else {
      // Online game: create room with format (and tournament tag if any)
      const result = await onlineGame.handleCreateRoom(format, target, pendingTournamentId || undefined);
      if (result) {
        setMenuStep('room_waiting');
        if (pendingTournamentId) {
          setPendingTournamentId(null);
        }

        // If we came from /friends with ?invite=<friendId>, fire the invitation now
        if (pendingInviteUserId && user) {
          try {
            const invite = await sendInvitation(user.id, pendingInviteUserId, result.dbRoomId);
            onlineManager.sendInvitation(invite.id, pendingInviteUserId, user.id);
            toast.success('Défi envoyé.');
          } catch (err) {
            console.error('[App] Friend challenge invitation failed:', err);
            toast.error("Le défi n'a pas pu être envoyé.");
          } finally {
            setPendingInviteUserId(null);
          }
        }
      }
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
      const isMatchGame = onlineGame.room?.match_format && onlineGame.room.match_format !== 'infinite';

      // ALWAYS broadcast first so the opponent sees the game end immediately,
      // regardless of whether subsequent DB writes succeed or throw.
      onlineManager.broadcast({ type: 'GAME_ENDED', payload: newState });

      if (isMatchGame) {
        if (gameMode === GameMode.OnlineHost) {
          // Host surrenders → guest wins → host records the game directly
          const winnerId = onlineGame.room?.guest_id || null;
          try {
            await handleRecordMatchGame(winnerId, newState.scores[Player.One], newState.scores[Player.Two]);
          } catch (err) {
            console.error('[handleSurrender] match record failed:', err);
          }
        }
        // Guest surrender: host will record via onGameEnded when it receives GAME_ENDED
      } else {
        // Infinite format: abandon the session entirely in DB
        try {
          await onlineGame.abandonGameInDB(user.id);
        } catch (err) {
          console.error('[handleSurrender] abandonGameInDB failed:', err);
        }
      }
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen bg-canvas" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', paddingTop: `calc(3.75rem + env(safe-area-inset-top, 0px))` }}>

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
          gameSystem={gameSystem}
          setGameSystem={setGameSystem}
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
        <GameView
          gameState={gameState}
          gameMode={gameMode}
          playerProfiles={playerProfiles}
          aiPlayer={aiPlayer}
          aiDifficulty={aiDifficulty}
          isAiThinking={isAiThinking}
          onlineRoom={onlineGame.room}
          isGuest={onlineGame.isGuest}
          matchScoreVersion={matchScoreVersion}
          selectedMatchFormat={selectedMatchFormat}
          selectedMatchTarget={selectedMatchTarget}
          localMatchScores={localMatchScores}
          localMatchStarted={localMatchStartedRef.current}
          simDifficultyP1={simDifficultyP1}
          simDifficultyP2={simDifficultyP2}
          isSimAuto={isSimAuto}
          timeMs={gameTimer.timeMs}
          selectedTimeControl={selectedTimeControl}
          isAnimating={animation.isAnimating}
          handState={animation.animHand}
          boardSkinUrl={boardSkinUrl}
          gameSystem={gameSystem}
          seedColor={seedColor}
          sgnEntries={sgnEntries}
          drawOfferPending={drawOfferPending}
          onMove={handlePitClick}
          onEditPit={handleEditPit}
          onEditScore={handleEditScore}
          onShowRules={() => setShowRules(true)}
          onProposeDraw={() => {
            const myName = profile?.display_name || profile?.username || 'Adversaire';
            onlineManager.broadcast({ type: 'DRAW_OFFER', payload: { fromName: myName } });
            setDrawOfferPending(true);
            toast('Proposition de nulle envoyée', { icon: '🤝' });
          }}
          onShowSurrender={() => setShowSurrenderModal(true)}
        />
      )}

      {/* SIMULATION CONTROL PANEL - Revolutionary Design */}
      {
        gameMode === GameMode.Simulation && (
          <SimulationControlPanel
            gameStatus={gameState.status}
            currentPlayer={gameState.currentPlayer}
            simSpeed={simSpeed}
            simDifficultyP1={simDifficultyP1}
            simDifficultyP2={simDifficultyP2}
            isSimAuto={isSimAuto}
            isSimContinuous={isSimContinuous}
            onSetCurrentPlayer={(player) => setGameState(prev => ({ ...prev, currentPlayer: player }))}
            onSetSimSpeed={setSimSpeed}
            onSetSimDifficultyP1={setSimDifficultyP1}
            onSetSimDifficultyP2={setSimDifficultyP2}
            onToggleSimAuto={() => setIsSimAuto(!isSimAuto)}
            onToggleSimContinuous={() => setIsSimContinuous(!isSimContinuous)}
            onStartSimulation={startSimulation}
            onRestartSimulation={restartSimulation}
            onClearBoard={clearBoard}
            onResetBoard={resetBoard}
            onExit={exitToMenu}
            onOpenCalibration={profile?.is_admin ? () => setCalibrationOpen(true) : undefined}
          />
        )
      }

      {/* BOARD CALIBRATION TOOL (admin only) */}
      {
        calibrationOpen && profile?.is_admin && (
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
      {/* Show after each game (party) finishes - for match system, if the match isn't complete yet */}
      {
        gameState.status === GameStatus.Finished &&
        !showMatchOverModal && ( // Don't show if MatchOverModal is being displayed (full match complete)
          <GameOverModal
            gameState={gameState}
            gameMode={gameMode}
            aiPlayer={aiPlayer}
            playerProfiles={
              gameMode === GameMode.VsAI && aiPlayer !== null
                ? {
                    ...playerProfiles,
                    [aiPlayer]: {
                      ...playerProfiles[aiPlayer],
                      display_name: aiDifficulty === 'neural' ? 'AlphaZero' : `IA (${aiDifficulty.toUpperCase()})`,
                    } as Profile,
                  }
                : playerProfiles
            }
            currentUserId={user?.id}
            matchFormat={
              (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest)
                ? onlineGame.room?.match_format
                : (selectedMatchFormat !== 'infinite' ? selectedMatchFormat : undefined)
            }
            onRestart={restartGame}
            onExitToMenu={exitToMenu}
            onAnalyze={moveList.length > 0 ? () => setShowAnalysis(true) : undefined}
          />
        )
      }

      {/* Game Analysis */}
      {showAnalysis && (
        <GameAnalysis
          moves={moveList}
          nameOne={playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1'}
          nameTwo={playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2'}
          gameSystem={gameSystem}
          onClose={() => setShowAnalysis(false)}
        />
      )}

      {/* Draw Offer Modal */}
      <DrawOfferModal
        isOpen={showDrawOfferModal}
        opponentName={drawOfferFromName}
        onAccept={() => {
          setShowDrawOfferModal(false);
          onlineManager.broadcast({ type: 'DRAW_RESPONSE', payload: { accepted: true } });
          const drawState: GameState = {
            ...gameStateRef.current,
            board: [...gameStateRef.current.board],
            scores: { ...gameStateRef.current.scores },
            status: GameStatus.Finished,
            winner: 'Draw',
            message: 'Nulle acceptée par les deux joueurs.',
          };
          setGameState(drawState);
          if (gameMode === GameMode.OnlineHost && onlineGame.roomDbId) {
            handleRecordMatchGame(null, drawState.scores[Player.One], drawState.scores[Player.Two]);
          }
        }}
        onDecline={() => {
          setShowDrawOfferModal(false);
          onlineManager.broadcast({ type: 'DRAW_RESPONSE', payload: { accepted: false } });
          toast('Proposition de nulle refusée', { icon: '❌' });
        }}
      />

      {/* Surrender Confirmation Modal */}
      <SurrenderModal
        isOpen={showSurrenderModal}
        gameMode={gameMode}
        matchFormat={
          (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest)
            ? onlineGame.room?.match_format
            : (selectedMatchFormat !== 'infinite' ? selectedMatchFormat : undefined)
        }
        onClose={() => setShowSurrenderModal(false)}
        onSurrender={handleSurrender}
        onSurrenderMatch={async () => {
          // Close the modal first so the user gets immediate feedback,
          // regardless of how the rest of the flow unfolds.
          setShowSurrenderModal(false);

          if (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) {
            if (user?.id && onlineGame.roomDbId) {
              // Compute the final state where the OPPONENT wins by forfeit, so
              // they see GameOverModal with a clear message.
              const surrenderingPlayer = gameMode === GameMode.OnlineGuest ? Player.Two : Player.One;
              const winner = surrenderingPlayer === Player.One ? Player.Two : Player.One;
              const myProfile = playerProfiles[surrenderingPlayer];
              const myName =
                myProfile?.display_name || myProfile?.username || 'L\'adversaire';
              const finalState: GameState = {
                ...gameStateRef.current,
                status: GameStatus.Finished,
                winner,
                message: `${myName} a abandonné le match.`,
              };

              // Broadcast FIRST so the opponent's game ends immediately,
              // even if the subsequent DB write hangs or fails.
              onlineManager.broadcast({ type: 'GAME_ENDED', payload: finalState });

              try {
                await abandonMatch(onlineGame.roomDbId, user.id);
              } catch (err) {
                console.error('[onSurrenderMatch] abandonMatch failed:', err);
              }

              toast.error('Match abandonné');
              exitToMenu();
            }
          } else {
            // Local match: simply exit
            toast.error('Match abandonné');
            exitToMenu();
          }
        }}
      />

      {/* Match Configuration Modal */}
      <MatchConfigModal
        isOpen={showMatchConfigModal}
        onClose={() => {
          setShowMatchConfigModal(false);
          setPendingLocalGameMode(null);
        }}
        onConfirm={handleMatchConfigConfirm}
        confirmLabel={pendingLocalGameMode ? 'Commencer' : 'Créer la Partie'}
      />

      {/* Match Over Modal - Online */}
      {showMatchOverModal && (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) && onlineGame.room && (
        <MatchOverModal
          matchFormat={onlineGame.room.match_format}
          matchTarget={onlineGame.room.match_target}
          scoreOne={onlineGame.room.match_score_host}
          scoreTwo={onlineGame.room.match_score_guest}
          gameCount={matchHistory.length}
          matchWinnerPlayer={
            onlineGame.room.match_winner_id === onlineGame.room.host_id ? Player.One
            : onlineGame.room.match_winner_id === onlineGame.room.guest_id ? Player.Two
            : 'Draw'
          }
          playerProfiles={playerProfiles}
          matchHistory={matchHistory.map(g => ({
            gameNumber: g.game_number,
            winnerPlayer: g.winner_id === onlineGame.room?.host_id ? Player.One
              : g.winner_id === onlineGame.room?.guest_id ? Player.Two
              : 'Draw' as 'Draw',
            scoreOne: g.final_score_host,
            scoreTwo: g.final_score_guest,
          }))}
          currentUserPlayer={onlineGame.isGuest ? Player.Two : Player.One}
          onNewMatch={() => {
            setShowMatchOverModal(false);
            setMatchHistory([]);
            exitToMenu();
          }}
          onExitToMenu={() => {
            setShowMatchOverModal(false);
            setMatchHistory([]);
            exitToMenu();
          }}
        />
      )}

      {/* Match Over Modal - Local (VsAI / LocalMultiplayer) */}
      {showMatchOverModal && (gameMode === GameMode.VsAI || gameMode === GameMode.LocalMultiplayer) && (
        <MatchOverModal
          matchFormat={selectedMatchFormat}
          matchTarget={selectedMatchTarget}
          scoreOne={localMatchScores[Player.One]}
          scoreTwo={localMatchScores[Player.Two]}
          gameCount={localMatchGameCount}
          matchWinnerPlayer={localMatchWinner}
          playerProfiles={playerProfiles}
          matchHistory={localMatchHistory}
          currentUserPlayer={gameMode === GameMode.VsAI ? (aiPlayer === Player.One ? Player.Two : Player.One) : null}
          onNewMatch={() => {
            setShowMatchOverModal(false);
            // Reset scores/history but keep format → same match format for new match
            setLocalMatchScores({ [Player.One]: 0, [Player.Two]: 0 });
            setLocalMatchWinner(null);
            setLocalMatchGameCount(0);
            setLocalMatchHistory([]);
            // localMatchStartedRef stays true so startGame won't prompt for format again
            startGame(gameMode!, aiPlayer);
          }}
          onExitToMenu={() => {
            setShowMatchOverModal(false);
            exitToMenu();
          }}
        />
      )}

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
