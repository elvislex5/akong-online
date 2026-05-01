import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Medal, TrendingUp, Trophy } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { useAuth } from '../hooks/useAuth';
import {
  getRatingsLeaderboard,
  type LeaderboardEntry,
  type LeaderboardScope,
} from '../services/ratingService';
import { getEkangTitle, type Cadence } from '../services/glicko2';
import { getCountry, SONGO_HOME_COUNTRIES } from '../config/countries';
import type { GameSystem } from '../types';

/* ============================================================
   Songo — Classement
   ----------------------------------------------------------------
   Three filter rows:
     1. Scope (Mondial · 4 pays Songo · Reste du monde) — CDC §9.3 MUST
     2. Système (Mgpwém · Angbwé)
     3. Cadence (Bullet · Blitz · Rapide · Classique)
   Editorial list of hairline rows.
   ============================================================ */

type ScopeTab = { id: LeaderboardScope; label: string; flag?: string };

const SCOPE_TABS: ScopeTab[] = [
  { id: 'world', label: 'Mondial', flag: '🌍' },
  ...SONGO_HOME_COUNTRIES.map((c) => ({ id: c.code, label: c.name, flag: c.flag } as ScopeTab)),
  { id: 'rest', label: 'Reste du monde', flag: '🌐' },
];

const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'bullet',    label: 'Bullet' },
  { value: 'blitz',     label: 'Blitz' },
  { value: 'rapide',    label: 'Rapide' },
  { value: 'classique', label: 'Classique' },
];

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();

  const [scope, setScope] = useState<LeaderboardScope>('world');
  const [system, setSystem] = useState<GameSystem>('mgpwem');
  const [cadence, setCadence] = useState<Cadence>('blitz');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRatingsLeaderboard(system, cadence, scope, 100)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [system, cadence, scope]);

  const userRank = useMemo(() => {
    if (!user) return 0;
    return entries.findIndex((e) => e.user_id === user.id) + 1;
  }, [entries, user]);

  const scopeLabel = SCOPE_TABS.find((s) => s.id === scope);

  return (
    <div className="bg-canvas min-h-[60vh]">
      <Container width="wide" className="py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="kicker mb-3">
            Classement Glicko · {system === 'mgpwem' ? 'Mgpwém' : 'Angbwé'} · {CADENCES.find((c) => c.value === cadence)?.label}
          </p>
          <h1
            className="font-display text-ink leading-[0.95] tracking-[-0.03em]"
            style={{
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 'clamp(3rem, 8vw, 6rem)',
            }}
          >
            Classement
          </h1>
          <p className="lead mt-6 max-w-[640px]">
            Les joueurs classés sur Songo, par pays et par cadence. Inspiré du
            système Glicko-2, avec un titre Ekang attribué selon le rating.
          </p>
        </div>

        {/* Scope tabs (country) — horizontally scrollable on mobile */}
        <div className="mb-4">
          <p className="kicker mb-2">Région</p>
          <div className="flex gap-px bg-rule border border-rule overflow-x-auto">
            {SCOPE_TABS.map((tab) => (
              <button
                key={String(tab.id)}
                type="button"
                onClick={() => setScope(tab.id)}
                aria-pressed={scope === tab.id}
                className={
                  'shrink-0 inline-flex items-center gap-2 h-10 px-4 text-xs font-medium tracking-wide transition-colors duration-150 ' +
                  (scope === tab.id
                    ? 'bg-accent text-accent-ink'
                    : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
                }
              >
                {tab.flag && <span aria-hidden="true">{tab.flag}</span>}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* System + cadence sub-filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div>
            <p className="kicker mb-2">Système</p>
            <div className="grid grid-cols-2 gap-px bg-rule border border-rule">
              <FilterTab active={system === 'mgpwem'} onClick={() => setSystem('mgpwem')} label="Mgpwém" />
              <FilterTab active={system === 'angbwe'} onClick={() => setSystem('angbwe')} label="Angbwé" />
            </div>
          </div>
          <div>
            <p className="kicker mb-2">Cadence</p>
            <div className="grid grid-cols-4 gap-px bg-rule border border-rule">
              {CADENCES.map((c) => (
                <FilterTab
                  key={c.value}
                  active={cadence === c.value}
                  onClick={() => setCadence(c.value)}
                  label={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* User rank pill */}
        {user && userRank > 0 && (
          <div className="mb-6 border border-accent bg-accent/10 px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-ink">
              <span className="font-display tabular-nums text-accent mr-2">#{userRank}</span>
              Votre position dans ce classement
            </span>
            <span
              className="font-display tabular-nums text-accent"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.25rem' }}
            >
              {entries[userRank - 1]?.rating || 1200}
            </span>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <SkeletonRows />
        ) : entries.length === 0 ? (
          <EmptyState scopeLabel={scopeLabel?.label} />
        ) : (
          <ul role="list" className="border border-rule divide-y divide-rule">
            {entries.map((entry, index) => (
              <Row
                key={entry.id}
                entry={entry}
                rank={index + 1}
                isCurrentUser={user?.id === entry.user_id}
              />
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
};

export default LeaderboardPage;

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const FilterTab: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={
      'h-9 inline-flex items-center justify-center text-xs font-medium tracking-wide transition-colors duration-150 ' +
      (active
        ? 'bg-accent text-accent-ink'
        : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
    }
  >
    {label}
  </button>
);

const Row: React.FC<{ entry: LeaderboardEntry; rank: number; isCurrentUser: boolean }> = ({
  entry,
  rank,
  isCurrentUser,
}) => {
  const title = getEkangTitle(entry.rating);
  const country = getCountry(entry.country);
  const winRate = entry.games_played > 0 ? Math.round((entry.wins / entry.games_played) * 100) : 0;
  const displayName = entry.alias_songo || entry.display_name || entry.username || 'Joueur';

  return (
    <li
      className={
        'relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 ' +
        (isCurrentUser ? 'bg-accent/10' : 'bg-canvas hover:bg-surface')
      }
    >
      {isCurrentUser && (
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
      )}

      {/* Rank */}
      <div className="w-10 shrink-0 text-center">
        {rank === 1 ? (
          <Crown size={16} strokeWidth={1.75} className="text-accent mx-auto" />
        ) : rank === 2 ? (
          <Medal size={16} strokeWidth={1.75} className="text-ink-muted mx-auto" />
        ) : rank === 3 ? (
          <Medal size={16} strokeWidth={1.75} className="text-clay-500 mx-auto" />
        ) : (
          <span className="text-ink-subtle font-mono text-xs tabular-nums">{rank}</span>
        )}
      </div>

      {/* Flag */}
      <span
        className="text-base shrink-0 select-none w-5 text-center"
        title={country?.name}
        aria-label={country?.name || 'Pays inconnu'}
      >
        {country?.flag || '·'}
      </span>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={'truncate text-sm ' + (isCurrentUser ? 'text-ink font-medium' : 'text-ink')}>
            {displayName}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] tracking-wider uppercase font-medium px-1.5 py-0.5 bg-accent text-accent-ink rounded-sm shrink-0">
              Vous
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-subtle">
          <span className="italic font-display">{title.name}</span>
          <span className="tabular-nums">{entry.games_played}p</span>
          <span className="tabular-nums">{winRate}%</span>
        </div>
      </div>

      {/* Rating */}
      <div className="text-right shrink-0">
        <p
          className={
            'font-display tabular-nums leading-none ' +
            (isCurrentUser ? 'text-accent' : 'text-ink')
          }
          style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.25rem' }}
        >
          {entry.rating}
        </p>
        {entry.peak_rating > entry.rating && (
          <p className="text-[10px] text-ink-subtle inline-flex items-center gap-0.5 mt-0.5 tabular-nums">
            <TrendingUp size={10} strokeWidth={1.75} />
            {entry.peak_rating}
          </p>
        )}
      </div>
    </li>
  );
};

const SkeletonRows: React.FC = () => (
  <div className="border border-rule divide-y divide-rule">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="px-4 py-3 flex items-center gap-3 bg-canvas">
        <div className="w-6 h-3 bg-surface rounded animate-pulse" />
        <div className="w-5 h-3 bg-surface rounded animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-surface rounded animate-pulse" />
          <div className="h-2 w-24 bg-surface rounded animate-pulse" />
        </div>
        <div className="h-4 w-12 bg-surface rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ scopeLabel?: string }> = ({ scopeLabel }) => (
  <div className="border border-rule py-16 px-6 text-center">
    <Trophy size={28} strokeWidth={1.5} className="mx-auto text-ink-subtle mb-4" />
    <h2
      className="font-display text-2xl text-ink mb-2"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      Personne ici pour l'instant
    </h2>
    <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
      {scopeLabel
        ? `Aucun joueur classé dans la zone "${scopeLabel}" pour ce système et cette cadence.`
        : 'Aucun joueur classé pour ce système et cette cadence.'}{' '}
      Lancez une partie classée pour entrer dans la liste.
    </p>
  </div>
);
