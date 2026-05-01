import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Crown, Eye, Filter } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { listFinishedGames, type FinishedGamesFilters } from '../services/roomService';
import type { GameRoom, MatchFormat, Profile } from '../services/supabase';
import { getCountry } from '../config/countries';

const PAGE_SIZE = 30;

const FORMAT_LABEL: Record<MatchFormat, string> = {
  infinite: 'Libre',
  traditional_6: '6 parties',
  traditional_2: '2 parties',
  first_to_x: 'Premier à X',
};

const FORMATS: { value: MatchFormat | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous formats' },
  { value: 'infinite', label: 'Libre' },
  { value: 'traditional_6', label: 'Traditionnel 6' },
  { value: 'traditional_2', label: 'Traditionnel 2' },
  { value: 'first_to_x', label: 'Premier à X' },
];

const GamesPage: React.FC = () => {
  const [games, setGames] = useState<GameRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [matchFormat, setMatchFormat] = useState<MatchFormat | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const filters: FinishedGamesFilters = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (matchFormat !== 'all') filters.matchFormat = matchFormat;

    listFinishedGames(filters).then((result) => {
      if (cancelled) return;
      setGames(result.games);
      setTotal(result.total);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, matchFormat]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div className="bg-canvas min-h-[60vh]">
      <Container width="wide" className="py-10 md:py-14">
        {/* Header */}
        <div className="mb-10">
          <p className="kicker mb-3">Archives</p>
          <h1
            className="font-display text-ink leading-[1.0] tracking-[-0.03em]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50', fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}
          >
            Toutes les parties
          </h1>
          <p className="lead mt-6 max-w-[640px]">
            Base de données publique des parties terminées sur la plateforme.
            {total > 0 && <span className="text-ink-muted"> {total.toLocaleString('fr-FR')} parties enregistrées.</span>}
          </p>
        </div>

        {/* Filters */}
        <div className="border-y border-rule -mx-4 sm:mx-0 mb-8 px-4 sm:px-0 py-4 flex flex-wrap items-center gap-2">
          <span className="kicker inline-flex items-center gap-1.5 mr-2">
            <Filter size={11} strokeWidth={1.75} />
            Filtres
          </span>
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setMatchFormat(f.value);
                setPage(0);
              }}
              className={
                'h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 ' +
                (matchFormat === f.value
                  ? 'bg-accent text-accent-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-surface')
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-ink-subtle">Chargement…</p>
        ) : games.length === 0 ? (
          <div className="border border-rule py-12 text-center text-sm text-ink-muted">
            Aucune partie ne correspond à ces filtres.
          </div>
        ) : (
          <>
            <ul role="list" className="border border-rule divide-y divide-rule">
              {games.map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs text-ink-subtle tabular-nums">
                  Page {page + 1} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-rule-strong text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-rule-strong text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                    aria-label="Page suivante"
                  >
                    <ChevronRight size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
};

export default GamesPage;

/* ---------------------------------------------------------------- */

function displayName(p: Profile | null): string {
  if (!p) return '—';
  return p.alias_songo || p.display_name || p.username || 'Joueur';
}

const GameRow: React.FC<{ game: GameRoom }> = ({ game }) => {
  const hostFlag = getCountry(game.host?.country)?.flag || '·';
  const guestFlag = getCountry(game.guest?.country)?.flag || '·';
  const winnerIsHost = game.winner_id && game.winner_id === game.host?.id;
  const winnerIsGuest = game.winner_id && game.winner_id === game.guest?.id;
  const isDraw = game.status === 'finished' && !game.winner_id;
  const isAbandoned = game.status === 'abandoned';

  const finishedAt = game.finished_at ? new Date(game.finished_at) : null;
  const dateLabel = finishedAt
    ? finishedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <li className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-canvas hover:bg-surface transition-colors duration-150">
      {/* Players column */}
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">{hostFlag}</span>
          <span className={'truncate ' + (winnerIsHost ? 'text-ink font-medium' : 'text-ink')}>
            {displayName(game.host)}
          </span>
          {winnerIsHost && <Crown size={11} strokeWidth={1.75} className="text-accent shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">{guestFlag}</span>
          <span className={'truncate ' + (winnerIsGuest ? 'text-ink font-medium' : 'text-ink')}>
            {displayName(game.guest)}
          </span>
          {winnerIsGuest && <Crown size={11} strokeWidth={1.75} className="text-accent shrink-0" />}
        </div>
      </div>

      {/* Meta column */}
      <div className="hidden sm:flex flex-col items-end gap-1 text-right shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-ink-subtle">{FORMAT_LABEL[game.match_format]}</span>
        <span className="text-xs text-ink-subtle tabular-nums">{dateLabel}</span>
      </div>

      {/* Status / action */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span
          className={
            'inline-flex items-center px-1.5 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm font-medium ' +
            (isAbandoned
              ? 'border-rule text-ink-subtle'
              : isDraw
              ? 'border-rule-strong text-ink-muted'
              : 'border-accent/40 text-accent')
          }
        >
          {isAbandoned ? 'Abandon' : isDraw ? 'Nulle' : 'Terminée'}
        </span>
        <Link
          to={`/watch?room=${game.room_code}`}
          className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent transition-colors duration-150"
        >
          <Eye size={11} strokeWidth={1.75} />
          Voir
        </Link>
      </div>
    </li>
  );
};
