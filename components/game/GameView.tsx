import React from 'react';
import { GameMode, GameStatus, Player, GameSystem, AIDifficulty } from '../../types';
import type { Profile, GameRoom, MatchFormat } from '../../services/supabase';
import type { GameState, AnimationStep } from '../../types';
import type { TimeControl } from '../../hooks/useGameTimer';
import type { SGNEntry } from '../../services/sgnNotation';
import type { SeedColorConfig } from '../../config/seedColors';
import { formatSGNText } from '../../services/sgnNotation';
import BoardRevolutionary from '../BoardRevolutionary';
import { MoveHistoryToggle } from '../MoveHistory';
import { GameHeader } from './GameHeader';
import { GameStatusBar } from './GameStatusBar';
import { GameActions } from './GameActions';

type GameViewProps = {
  // Game state
  gameState: GameState;
  gameMode: GameMode;

  // Players
  playerProfiles: { [key in Player]: Profile | null };
  aiPlayer: Player | null;
  aiDifficulty: AIDifficulty;
  isAiThinking: boolean;

  // Online
  onlineRoom: GameRoom | null;
  isGuest: boolean;
  matchScoreVersion: number;

  // Local match
  selectedMatchFormat: MatchFormat;
  selectedMatchTarget?: number;
  localMatchScores: Record<Player, number>;
  localMatchStarted: boolean;

  // Simulation
  simDifficultyP1: AIDifficulty;
  simDifficultyP2: AIDifficulty;
  isSimAuto: boolean;

  // Timer
  timeMs: Record<Player, number>;
  selectedTimeControl: TimeControl;

  // Animation
  isAnimating: boolean;
  handState: { pitIndex: number | null; seedCount: number };

  // Board
  boardSkinUrl: string;
  gameSystem: GameSystem;
  seedColor: SeedColorConfig;

  // SGN
  sgnEntries: SGNEntry[];

  // Draw offer
  drawOfferPending: boolean;

  // Callbacks
  onMove: (idx: number) => void;
  onEditPit: (idx: number) => void;
  onEditScore: (player: Player) => void;
  onShowRules: () => void;
  onProposeDraw: () => void;
  onShowSurrender: () => void;
};

/**
 * Pure presentational composition of the in-game UI.
 * App.tsx orchestrates state/sync; GameView only arranges the visible parts.
 */
export function GameView(props: GameViewProps) {
  const {
    gameState,
    gameMode,
    playerProfiles,
    aiPlayer,
    aiDifficulty,
    isAiThinking,
    onlineRoom,
    isGuest,
    matchScoreVersion,
    selectedMatchFormat,
    selectedMatchTarget,
    localMatchScores,
    localMatchStarted,
    simDifficultyP1,
    simDifficultyP2,
    isSimAuto,
    timeMs,
    selectedTimeControl,
    isAnimating,
    handState,
    boardSkinUrl,
    gameSystem,
    seedColor,
    sgnEntries,
    drawOfferPending,
    onMove,
    onEditPit,
    onEditScore,
    onShowRules,
    onProposeDraw,
    onShowSurrender,
  } = props;

  // Build the player profiles seen by the board (override Sim names)
  const boardProfiles =
    gameMode === GameMode.Simulation
      ? {
          ...playerProfiles,
          [Player.One]: { ...playerProfiles[Player.One], display_name: `BOT: ${simDifficultyP1.toUpperCase()}` } as Profile,
          [Player.Two]: { ...playerProfiles[Player.Two], display_name: `BOT: ${simDifficultyP2.toUpperCase()}` } as Profile,
        }
      : playerProfiles;

  const nameOne = playerProfiles[Player.One]?.display_name || playerProfiles[Player.One]?.username || 'Joueur 1';
  const nameTwo = playerProfiles[Player.Two]?.display_name || playerProfiles[Player.Two]?.username || 'Joueur 2';

  // Resolve the active player's display name (with Sim/AI overrides).
  let currentPlayerName: string;
  if (gameMode === GameMode.Simulation) {
    currentPlayerName =
      gameState.currentPlayer === Player.One
        ? `BOT: ${simDifficultyP1.toUpperCase()}`
        : `BOT: ${simDifficultyP2.toUpperCase()}`;
  } else if (gameMode === GameMode.VsAI && aiPlayer === gameState.currentPlayer) {
    const label = aiDifficulty === 'neural' ? 'AlphaZero' : `IA · ${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)}`;
    currentPlayerName = label;
  } else {
    currentPlayerName = gameState.currentPlayer === Player.One ? nameOne : nameTwo;
  }

  return (
    <div className="w-full h-full flex flex-col py-2 sm:py-4 md:py-8">
      <GameHeader
        gameMode={gameMode}
        gameStatus={gameState.status}
        currentPlayer={gameState.currentPlayer}
        playerProfiles={playerProfiles}
        onlineRoom={onlineRoom}
        isGuest={isGuest}
        matchScoreVersion={matchScoreVersion}
        selectedMatchFormat={selectedMatchFormat}
        selectedMatchTarget={selectedMatchTarget}
        localMatchScores={localMatchScores}
        localMatchStarted={localMatchStarted}
        simDifficultyP1={simDifficultyP1}
        simDifficultyP2={simDifficultyP2}
        timeMs={timeMs}
        selectedTimeControl={selectedTimeControl}
      />

      <BoardRevolutionary
        gameState={gameState}
        onMove={onMove}
        gameMode={gameMode}
        isAnimating={isAnimating}
        handState={handState}
        onEditPit={onEditPit}
        onEditScore={onEditScore}
        aiPlayer={aiPlayer}
        playerProfiles={boardProfiles}
        isSimulationManual={!isSimAuto && gameMode === GameMode.Simulation}
        invertView={isGuest}
        boardSkinUrl={boardSkinUrl}
        gameSystem={gameSystem}
        seedColor={seedColor}
      />

      <GameStatusBar
        gameStatus={gameState.status}
        currentPlayer={gameState.currentPlayer}
        currentPlayerName={currentPlayerName}
        message={gameState.message}
        isAiThinking={isAiThinking}
        aiDifficulty={aiDifficulty}
      />

      <GameActions
        gameMode={gameMode}
        gameStatus={gameState.status}
        drawOfferPending={drawOfferPending}
        onShowRules={onShowRules}
        onProposeDraw={onProposeDraw}
        onShowSurrender={onShowSurrender}
      />

      {gameMode !== GameMode.Simulation && (
        <MoveHistoryToggle
          entries={sgnEntries}
          currentMoveIndex={sgnEntries.length - 1}
          gameStatus={gameState.status}
          nameOne={nameOne}
          nameTwo={nameTwo}
          sgnText={formatSGNText(sgnEntries, {
            player1: nameOne,
            player2: nameTwo,
            date: new Date().toISOString().split('T')[0],
            result: sgnEntries.length > 0 ? sgnEntries[sgnEntries.length - 1].resultText : undefined,
          })}
        />
      )}
    </div>
  );
}
