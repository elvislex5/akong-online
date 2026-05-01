import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, X as XIcon, Minus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getUserGameHistory, getMatchFormatLabel } from '../services/roomService';
import type { GameRoom } from '../services/supabase';
import { Container } from '../components/ui/Container';

type ResultKind = 'win' | 'loss' | 'draw' | 'unknown';

const formatDate = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const GameHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getUserGameHistory(user.id);
        if (!cancelled) setGames(list);
      } catch (err) {
        console.error('[GameHistoryPage]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const getResult = (g: GameRoom): ResultKind => {
    if (!user) return 'unknown';
    if (!g.winner_id) return 'draw';
    return g.winner_id === user.id ? 'win' : 'loss';
  };

  const getOpponent = (g: GameRoom) => {
    if (!user) return null;
    return g.host_id === user.id ? g.guest : g.host;
  };

  if (!user) {
    return (
      <div className="bg-canvas min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Connectez-vous pour voir votre historique.</p>
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen">
      <Container width="wide" className="py-12 md:py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <div>
            <p className="kicker">Espace personnel</p>
          </div>
        </div>

        <h1
          className="font-display text-ink leading-[0.95] tracking-[-0.03em] mb-12"
          style={{
            fontVariationSettings: '"opsz" 144, "SOFT" 50',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
          }}
        >
          Historique
        </h1>

        {loading ? (
          <SkeletonRows />
        ) : games.length === 0 ? (
          <EmptyState />
        ) : (
          <ul role="list" className="border border-rule divide-y divide-rule">
            {games.map((g) => (
              <Row
                key={g.id}
                game={g}
                result={getResult(g)}
                opponent={getOpponent(g)}
              />
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
};

export default GameHistoryPage;

/* ----------------------------------------------------------------
   Row
   ---------------------------------------------------------------- */

const Row: React.FC<{
  game: GameRoom;
  result: ResultKind;
  opponent: GameRoom['host'] | GameRoom['guest'] | null;
}> = ({ game, result, opponent }) => {
  return (
    <li className="px-5 py-4 flex items-center gap-4 bg-canvas hover:bg-surface transition-colors duration-150">
      {/* Result badge */}
      <ResultBadge result={result} />

      {/* Opponent */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-rule shrink-0 bg-surface">
          <img
            src={opponent?.avatar_url || '/avatars/avatar_male_black.png'}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-ink font-medium truncate">
            {opponent?.display_name || opponent?.username || 'Inconnu'}
          </p>
          <p className="text-xs text-ink-subtle">{opponent?.elo_rating || 1200}</p>
        </div>
      </div>

      {/* Score (match) */}
      <div className="hidden sm:block shrink-0 text-xs text-ink-muted tabular-nums w-16 text-right">
        {game.match_format !== 'infinite'
          ? `${game.match_score_host} – ${game.match_score_guest}`
          : '—'}
      </div>

      {/* Format */}
      <div className="hidden md:block shrink-0 text-xs text-ink-subtle w-32 text-right">
        {getMatchFormatLabel(game.match_format, game.match_target)}
      </div>

      {/* Date */}
      <div className="shrink-0 text-xs text-ink-subtle w-36 text-right tabular-nums">
        {formatDate(game.finished_at)}
      </div>
    </li>
  );
};

const ResultBadge: React.FC<{ result: ResultKind }> = ({ result }) => {
  const map = {
    win: { label: 'Victoire', cls: 'text-success border-success/40 bg-success/5', Icon: Trophy },
    loss: { label: 'Défaite', cls: 'text-danger border-danger/40 bg-danger/5', Icon: XIcon },
    draw: { label: 'Nul', cls: 'text-ink-muted border-rule-strong bg-surface', Icon: Minus },
    unknown: { label: '—', cls: 'text-ink-subtle border-rule', Icon: Minus },
  } as const;
  const { label, cls, Icon } = map[result];
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-xs font-medium tracking-wide w-24 shrink-0 ' +
        cls
      }
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </span>
  );
};

/* ----------------------------------------------------------------
   States
   ---------------------------------------------------------------- */

const SkeletonRows: React.FC = () => (
  <div className="border border-rule divide-y divide-rule">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="px-5 py-4 flex items-center gap-4 bg-canvas">
        <div className="h-7 w-24 bg-surface rounded animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-32 bg-surface rounded animate-pulse" />
        </div>
        <div className="h-3 w-32 bg-surface rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC = () => (
  <div className="border border-rule py-20 px-6 text-center">
    <h2
      className="font-display text-2xl text-ink mb-2"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      Aucune partie
    </h2>
    <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
      Lancez votre première partie en ligne — elle apparaîtra ici dès qu'elle sera terminée.
    </p>
  </div>
);
