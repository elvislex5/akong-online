import React from 'react';
import { useOnlineCount } from '../../hooks/useOnlineCount';

/**
 * Compact pill showing how many players are currently on the platform.
 * Layout: small green dot + total count, with the in-game count as a
 * subtler suffix when non-zero ("247 · 18 ⚔").
 *
 * Stays silent (renders nothing) when total is 0 — no need to advertise
 * an empty house, especially on cold starts.
 */
export const OnlineIndicator: React.FC = () => {
  const { online, inGame, total } = useOnlineCount();

  if (total === 0) return null;

  const label =
    inGame > 0
      ? `${total} en ligne · ${inGame} en partie`
      : `${total} en ligne`;

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-xs font-medium tabular-nums text-ink-muted"
      title={label}
      aria-label={label}
    >
      <span className="relative inline-flex items-center justify-center w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-500/70 animate-ping" />
        <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </span>
      <span>
        {total.toLocaleString('fr-FR')}
        {inGame > 0 && (
          <span className="ml-1 text-ink-subtle">· {inGame} <span aria-hidden="true">⚔</span></span>
        )}
      </span>
    </span>
  );
};

export default OnlineIndicator;
