import React from 'react';
import { BookOpen, Flag, Handshake } from 'lucide-react';
import { GameMode, GameStatus } from '../../types';

type Props = {
  gameMode: GameMode;
  gameStatus: GameStatus;
  drawOfferPending: boolean;

  onShowRules: () => void;
  onProposeDraw: () => void;
  onShowSurrender: () => void;
};

/**
 * Floating action cluster (bottom-right, mobile-first).
 * - Rules (always shown)
 * - Draw offer (online only, when game is playing)
 * - Surrender (when game is playing, not in simulation/spectator)
 */
export function GameActions({
  gameMode,
  gameStatus,
  drawOfferPending,
  onShowRules,
  onProposeDraw,
  onShowSurrender,
}: Props) {
  const isOnline = gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest;
  const isPlaying = gameStatus === GameStatus.Playing;
  const showSurrender =
    isPlaying && gameMode !== GameMode.Simulation && gameMode !== GameMode.OnlineSpectator;
  const showDrawOffer = isPlaying && isOnline && !drawOfferPending;

  return (
    <div
      className="fixed z-30 flex flex-col gap-1.5 items-end"
      style={{
        bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(0.75rem + env(safe-area-inset-right, 0px))',
      }}
    >
      <ActionFab
        Icon={BookOpen}
        label="Voir les règles du jeu"
        title="Règles"
        onClick={onShowRules}
        tone="neutral"
      />

      {showDrawOffer && (
        <ActionFab
          Icon={Handshake}
          label="Proposer la nulle"
          title="Proposer la nulle"
          onClick={onProposeDraw}
          tone="neutral"
        />
      )}

      {showSurrender && (
        <ActionFab
          Icon={Flag}
          label="Abandonner la partie"
          title="Abandonner"
          onClick={onShowSurrender}
          tone="danger"
        />
      )}
    </div>
  );
}

const ActionFab: React.FC<{
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  title: string;
  onClick: () => void;
  tone: 'neutral' | 'danger';
}> = ({ Icon, label, title, onClick, tone }) => {
  const cls = [
    'inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-md transition-colors duration-150',
    tone === 'danger'
      ? 'bg-canvas/90 backdrop-blur-md text-danger border-rule hover:bg-danger hover:text-canvas hover:border-danger'
      : 'bg-canvas/90 backdrop-blur-md text-ink-muted border-rule hover:text-accent hover:border-accent',
  ].join(' ');
  return (
    <button type="button" onClick={onClick} aria-label={label} title={title} className={cls}>
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
};
