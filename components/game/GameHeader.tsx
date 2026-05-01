import React from 'react';
import { GameMode, GameStatus, Player, AIDifficulty } from '../../types';
import type { Profile, GameRoom, MatchFormat } from '../../services/supabase';
import { MatchScoreDisplay } from '../MatchScoreDisplay';
import { GameTimerDisplay } from '../GameTimerDisplay';
import type { TimeControl } from '../../hooks/useGameTimer';

type Props = {
  gameMode: GameMode;
  gameStatus: GameStatus;
  currentPlayer: Player;

  playerProfiles: { [key in Player]: Profile | null };

  // Online context
  onlineRoom: GameRoom | null;
  isGuest: boolean;
  matchScoreVersion: number;

  // Local match (VsAI / LocalMultiplayer / Simulation)
  selectedMatchFormat: MatchFormat;
  selectedMatchTarget?: number;
  localMatchScores: Record<Player, number>;
  localMatchStarted: boolean;

  // Simulation
  simDifficultyP1: AIDifficulty;
  simDifficultyP2: AIDifficulty;

  // Timer
  timeMs: Record<Player, number>;
  selectedTimeControl: TimeControl;
};

const nameOf = (p: Profile | null, fallback: string) =>
  p?.display_name || p?.username || fallback;

/**
 * Top section of the in-game view.
 * Shows the appropriate MatchScoreDisplay for the current game mode,
 * plus the chess-clock-style timers. Falls back to a minimal player
 * banner when neither display is rendered (infinite mode + no clock).
 */
export function GameHeader(props: Props) {
  const { gameMode, playerProfiles } = props;

  const nameOne = nameOf(playerProfiles[Player.One], 'Joueur 1');
  const nameTwo = nameOf(playerProfiles[Player.Two], 'Joueur 2');

  // For Simulation, override names with bot difficulty labels (matches MatchScoreDisplay behaviour)
  const displayNameOne =
    gameMode === GameMode.Simulation ? `BOT: ${props.simDifficultyP1.toUpperCase()}` : nameOne;
  const displayNameTwo =
    gameMode === GameMode.Simulation ? `BOT: ${props.simDifficultyP2.toUpperCase()}` : nameTwo;

  const showsOnlineMatchScore =
    (gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) &&
    !!props.onlineRoom &&
    props.onlineRoom.match_format !== 'infinite';
  const showsLocalMatchScore =
    (gameMode === GameMode.VsAI || gameMode === GameMode.LocalMultiplayer) &&
    props.selectedMatchFormat !== 'infinite' &&
    props.localMatchStarted;
  const showsSimMatchScore = gameMode === GameMode.Simulation && props.localMatchStarted;
  const showsAnyMatchScore = showsOnlineMatchScore || showsLocalMatchScore || showsSimMatchScore;
  const showsTimer = props.selectedTimeControl !== 'none';
  const showsFallbackBanner = !showsAnyMatchScore && !showsTimer;

  return (
    <>
      {/* Online match score */}
      {(gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) &&
        props.onlineRoom &&
        props.onlineRoom.match_format !== 'infinite' && (
          <MatchScoreDisplay
            key={props.matchScoreVersion}
            matchFormat={props.onlineRoom.match_format}
            matchTarget={props.onlineRoom.match_target}
            scoreOne={props.onlineRoom.match_score_host}
            scoreTwo={props.onlineRoom.match_score_guest}
            nameOne={nameOne}
            nameTwo={nameTwo}
            currentPlayer={props.currentPlayer}
            gameStatus={props.gameStatus}
          />
        )}

      {/* Local match score (VsAI / LocalMultiplayer) */}
      {(gameMode === GameMode.VsAI || gameMode === GameMode.LocalMultiplayer) &&
        props.selectedMatchFormat !== 'infinite' &&
        props.localMatchStarted && (
          <MatchScoreDisplay
            matchFormat={props.selectedMatchFormat}
            matchTarget={props.selectedMatchTarget}
            scoreOne={props.localMatchScores[Player.One]}
            scoreTwo={props.localMatchScores[Player.Two]}
            nameOne={nameOne}
            nameTwo={nameTwo}
            currentPlayer={props.currentPlayer}
            gameStatus={props.gameStatus}
          />
        )}

      {/* Simulation match score */}
      {gameMode === GameMode.Simulation && props.localMatchStarted && (
        <MatchScoreDisplay
          matchFormat="infinite"
          matchTarget={0}
          scoreOne={props.localMatchScores[Player.One]}
          scoreTwo={props.localMatchScores[Player.Two]}
          nameOne={`BOT: ${props.simDifficultyP1.toUpperCase()}`}
          nameTwo={`BOT: ${props.simDifficultyP2.toUpperCase()}`}
          currentPlayer={props.currentPlayer}
          gameStatus={props.gameStatus}
        />
      )}

      {/* Timers */}
      <GameTimerDisplay
        timeMs={props.timeMs}
        currentPlayer={props.currentPlayer}
        gameStatus={props.gameStatus}
        timeControl={props.selectedTimeControl}
        nameOne={nameOne}
        nameTwo={nameTwo}
        invertView={props.isGuest}
      />

      {/* Fallback player banner — when there is no match score and no timer */}
      {showsFallbackBanner && (
        <PlayerBanner
          nameOne={displayNameOne}
          nameTwo={displayNameTwo}
          currentPlayer={props.currentPlayer}
          invertView={props.isGuest}
        />
      )}
    </>
  );
}

const PlayerBanner: React.FC<{
  nameOne: string;
  nameTwo: string;
  currentPlayer: Player;
  invertView: boolean;
}> = ({ nameOne, nameTwo, currentPlayer, invertView }) => {
  // The "first" cell visually = top of the board.
  // When invertView is true (online guest), Player.One is on top.
  const topPlayer = invertView ? Player.One : Player.Two;
  const bottomPlayer = invertView ? Player.Two : Player.One;
  const topName = invertView ? nameOne : nameTwo;
  const bottomName = invertView ? nameTwo : nameOne;

  return (
    <div className="w-full max-w-2xl mx-auto mb-3">
      <div className="border border-rule bg-surface grid grid-cols-2 divide-x divide-rule">
        <PlayerCell name={topName} active={currentPlayer === topPlayer} />
        <PlayerCell name={bottomName} active={currentPlayer === bottomPlayer} align="right" />
      </div>
    </div>
  );
};

const PlayerCell: React.FC<{ name: string; active: boolean; align?: 'left' | 'right' }> = ({
  name,
  active,
  align = 'left',
}) => (
  <div
    className={
      'relative flex items-center px-4 py-2.5 transition-colors duration-200 ' +
      (active ? 'bg-accent/10' : '') + ' ' +
      (align === 'right' ? 'justify-end' : 'justify-start')
    }
  >
    {active && (
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
        'text-sm tracking-wide truncate ' +
        (active ? 'text-ink font-medium' : 'text-ink-muted')
      }
    >
      {name}
    </span>
  </div>
);
