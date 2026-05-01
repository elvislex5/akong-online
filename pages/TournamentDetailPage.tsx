import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Crown, Eye, LogIn, LogOut, Play, Radio, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Container } from '../components/ui/Container';
import { useAuth } from '../hooks/useAuth';
import {
  getTournament,
  getParticipants,
  getTournamentGames,
  joinTournament,
  leaveTournament,
  isRegistered,
  type Tournament,
  type TournamentParticipant,
  type TournamentGame,
} from '../services/tournamentService';
import { getEkangTitle } from '../services/glicko2';
import { getCountry } from '../config/countries';
import { supabase } from '../services/supabase';
import { useEmailVerificationGate } from '../hooks/useEmailVerificationGate';

const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const requireVerified = useEmailVerificationGate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [games, setGames] = useState<TournamentGame[]>([]);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInFlight, setActionInFlight] = useState(false);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [t, p, g] = await Promise.all([
        getTournament(id),
        getParticipants(id),
        getTournamentGames(id),
      ]);
      setTournament(t);
      setParticipants(p);
      setGames(g);
      if (user) {
        setRegistered(await isRegistered(id, user.id));
      } else {
        setRegistered(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Live leaderboard: subscribe to participant + game changes for this tournament.
  // Avoids manual polling — Postgres CDC pushes us the new score the moment the
  // auto-scoring trigger fires (see migration 017).
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tournament:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${id}` },
        () => { getParticipants(id).then(setParticipants); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `tournament_id=eq.${id}` },
        () => { getTournamentGames(id).then(setGames); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleJoin = () => {
    requireVerified(async () => {
      if (!user || !id || actionInFlight) return;
      setActionInFlight(true);
      try {
        await joinTournament(id, user.id);
        toast.success('Inscription confirmée.');
        await refresh();
      } catch (err: any) {
        toast.error(err?.message || 'Inscription impossible');
      } finally {
        setActionInFlight(false);
      }
    }, 'rejoindre un tournoi');
  };

  const handleLeave = async () => {
    if (!user || !id || actionInFlight) return;
    setActionInFlight(true);
    try {
      await leaveTournament(id, user.id);
      toast('Désinscription enregistrée.');
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Désinscription impossible');
    } finally {
      setActionInFlight(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-canvas min-h-[60vh]">
        <Container width="wide" className="py-12">
          <p className="text-sm text-ink-subtle">Chargement…</p>
        </Container>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="bg-canvas min-h-[60vh]">
        <Container width="wide" className="py-12">
          <p className="text-sm text-ink-muted">Tournoi introuvable.</p>
          <button
            type="button"
            onClick={() => navigate('/tournaments')}
            className="mt-6 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={14} strokeWidth={1.75} /> Retour aux tournois
          </button>
        </Container>
      </div>
    );
  }

  const country = getCountry(tournament.country);
  const startsAt = new Date(tournament.starts_at);
  const endsAt = new Date(tournament.ends_at);
  const isUpcoming = tournament.status === 'upcoming';
  const isOngoing = tournament.status === 'ongoing';
  const isFinished = tournament.status === 'finished' || tournament.status === 'cancelled';
  const isFull = tournament.max_participants
    ? (tournament.participant_count ?? 0) >= tournament.max_participants
    : false;
  const canJoin =
    !!user && isUpcoming && !registered && !isFull;
  const canLeave = !!user && isUpcoming && registered;
  const canPlay = !!user && isOngoing && registered;

  return (
    <div className="bg-canvas min-h-[60vh]">
      <Container width="wide" className="py-10 md:py-12">
        {/* Back */}
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors duration-150"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Retour aux tournois
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="kicker mb-3 inline-flex items-center gap-2">
            {country && <span aria-hidden="true">{country.flag}</span>}
            {tournament.format.toUpperCase()} · {tournament.game_system === 'mgpwem' ? 'Mgpwém' : 'Angbwé'} · {tournament.cadence}
            <StatusBadge status={tournament.status} />
          </p>
          <h1
            className="font-display text-ink leading-[1.0] tracking-[-0.03em]"
            style={{
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 'clamp(2.25rem, 6vw, 4.5rem)',
            }}
          >
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="lead mt-6 max-w-[760px]">{tournament.description}</p>
          )}
        </div>

        {/* Meta strip */}
        <section className="border-y border-rule -mx-4 sm:mx-0 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule">
            <Stat
              label="Début"
              value={startsAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              sub={startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              icon={Calendar}
            />
            <Stat
              label="Fin"
              value={endsAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              sub={endsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              icon={Calendar}
            />
            <Stat
              label="Inscrits"
              value={String(tournament.participant_count ?? 0)}
              sub={tournament.max_participants ? `max ${tournament.max_participants}` : 'illimité'}
              icon={Users}
            />
            <Stat
              label="Dotation"
              value={tournament.prize_description ? '✓' : '—'}
              sub={tournament.prize_description ?? 'Aucune'}
              icon={Trophy}
            />
          </div>
        </section>

        {/* Eligibility */}
        {(tournament.min_rating || tournament.max_rating || tournament.country) && (
          <div className="mb-8 border border-rule p-4">
            <p className="kicker mb-2">Éligibilité</p>
            <div className="text-sm text-ink-muted space-y-1">
              {(tournament.min_rating || tournament.max_rating) && (
                <p>
                  ELO requis :
                  {tournament.min_rating ? ` ≥ ${tournament.min_rating}` : ''}
                  {tournament.min_rating && tournament.max_rating ? ' — ' : ' '}
                  {tournament.max_rating ? `≤ ${tournament.max_rating}` : ''}
                </p>
              )}
              {tournament.country && country && (
                <p>
                  Réservé à : {country.flag} {country.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        {!isFinished && (
          <div className="mb-10 flex flex-wrap items-center gap-2">
            {!user ? (
              <p className="text-sm text-ink-muted">Connectez-vous pour vous inscrire.</p>
            ) : (
              <>
                {canPlay && (
                  <button
                    type="button"
                    onClick={() =>
                      requireVerified(
                        () => navigate(`/game?action=create-online&tournament=${tournament.id}`),
                        'lancer une partie de tournoi',
                      )
                    }
                    className="h-11 inline-flex items-center justify-center gap-2 px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
                  >
                    <Play size={14} strokeWidth={1.75} />
                    Lancer une partie
                  </button>
                )}
                {registered ? (
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={!canLeave || actionInFlight}
                    className="h-11 inline-flex items-center justify-center gap-2 px-5 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-danger hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <LogOut size={14} strokeWidth={1.75} />
                    Se désinscrire
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={!canJoin || actionInFlight}
                    className="h-11 inline-flex items-center justify-center gap-2 px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <LogIn size={14} strokeWidth={1.75} />
                    {isFull ? 'Complet' : "S'inscrire"}
                  </button>
                )}
              </>
            )}
            {registered && isUpcoming && (
              <span className="text-xs text-ink-subtle">
                Vous êtes inscrit. Présentez-vous au démarrage du tournoi.
              </span>
            )}
            {registered && isOngoing && (
              <span className="text-xs text-ink-subtle">
                Tournoi en cours. Lancez une partie pour marquer des points.
              </span>
            )}
          </div>
        )}

        {/* Two-column: Leaderboard + Games stream (stack on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10">
          {/* Participants list / Live leaderboard */}
          <section>
            <p className="kicker mb-4 inline-flex items-center gap-2">
              {tournament.status === 'ongoing' && (
                <span className="inline-flex items-center gap-1 text-accent">
                  <Radio size={11} strokeWidth={2} className="animate-pulse" />
                  Live
                </span>
              )}
              {tournament.status === 'finished' ? 'Résultats finaux' : 'Participants'} · {participants.length}
            </p>
            {participants.length === 0 ? (
              <div className="border border-rule py-12 text-center text-sm text-ink-muted">
                Personne ne s'est encore inscrit.
              </div>
            ) : (
              <ul role="list" className="border border-rule divide-y divide-rule">
                {participants.map((p, i) => (
                  <ParticipantRow
                    key={p.user_id}
                    participant={p}
                    rank={i + 1}
                    showScore={tournament.status !== 'upcoming'}
                    isCurrentUser={p.user_id === user?.id}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Games stream */}
          <section>
            <p className="kicker mb-4">Parties · {games.length}</p>
            {games.length === 0 ? (
              <div className="border border-rule py-12 text-center text-sm text-ink-muted">
                {tournament.status === 'upcoming'
                  ? 'Les parties apparaîtront ici quand le tournoi démarre.'
                  : 'Aucune partie tournoi enregistrée.'}
              </div>
            ) : (
              <ul role="list" className="border border-rule divide-y divide-rule">
                {games.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </Container>
    </div>
  );
};

export default TournamentDetailPage;

/* ----------------------------------------------------------------
   Sub-components
   ---------------------------------------------------------------- */

const StatusBadge: React.FC<{ status: Tournament['status'] }> = ({ status }) => {
  const map = {
    upcoming: { label: 'À venir', cls: 'border-rule-strong text-ink-muted' },
    ongoing: { label: 'En cours', cls: 'border-accent text-accent bg-accent/10' },
    finished: { label: 'Terminé', cls: 'border-rule text-ink-subtle' },
    cancelled: { label: 'Annulé', cls: 'border-danger text-danger' },
  } as const;
  const { label, cls } = map[status];
  return (
    <span className={'inline-block px-1.5 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm font-medium ' + cls}>
      {label}
    </span>
  );
};

const Stat: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = ({ label, value, sub, icon: Icon }) => (
  <div className="px-5 py-5">
    <p className="kicker mb-2 inline-flex items-center gap-1.5">
      {Icon && <Icon size={11} strokeWidth={1.75} />}
      {label}
    </p>
    <p
      className="font-display text-ink leading-none tabular-nums"
      style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}
    >
      {value}
    </p>
    {sub && <p className="text-xs text-ink-subtle mt-1 truncate">{sub}</p>}
  </div>
);

const ParticipantRow: React.FC<{
  participant: TournamentParticipant;
  rank: number;
  showScore: boolean;
  isCurrentUser: boolean;
}> = ({ participant, rank, showScore, isCurrentUser }) => {
  const profile = participant.profile;
  const country = getCountry(profile?.country);
  const title = profile ? getEkangTitle(profile.elo_rating || 1200) : null;
  const displayName = profile?.alias_songo || profile?.display_name || profile?.username || 'Joueur';

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
      <div className="w-8 shrink-0 text-center">
        {showScore && rank === 1 ? (
          <Crown size={14} strokeWidth={1.75} className="text-accent mx-auto" />
        ) : (
          <span className="text-ink-subtle font-mono text-xs tabular-nums">{rank}</span>
        )}
      </div>
      <span className="text-base shrink-0 select-none w-5 text-center" title={country?.name}>
        {country?.flag || '·'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={'truncate text-sm ' + (isCurrentUser ? 'text-ink font-medium' : 'text-ink')}>
          {displayName}
        </p>
        {title && (
          <p className="text-xs text-ink-subtle italic font-display">{title.name}</p>
        )}
      </div>
      {showScore && (
        <div className="text-right shrink-0">
          <p
            className={
              'font-display tabular-nums leading-none ' +
              (isCurrentUser ? 'text-accent' : 'text-ink')
            }
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.125rem' }}
          >
            {participant.score}
          </p>
          <p className="text-[10px] text-ink-subtle mt-0.5 tabular-nums">
            {participant.wins}V {participant.losses}D {participant.draws}N
          </p>
        </div>
      )}
    </li>
  );
};

const GameRow: React.FC<{ game: TournamentGame }> = ({ game }) => {
  const navigate = useNavigate();
  const hostName = game.host?.alias_songo || game.host?.display_name || game.host?.username || 'Hôte';
  const guestName = game.guest?.alias_songo || game.guest?.display_name || game.guest?.username || '—';
  const hostFlag = getCountry(game.host?.country)?.flag || '·';
  const guestFlag = getCountry(game.guest?.country)?.flag || '·';

  const isLive = game.status === 'playing';
  const isFinished = game.status === 'finished' || game.status === 'abandoned';
  const winnerIsHost = game.winner_id && game.winner_id === game.host?.id;
  const winnerIsGuest = game.winner_id && game.winner_id === game.guest?.id;

  const statusLabel = (() => {
    switch (game.status) {
      case 'playing':   return 'En direct';
      case 'waiting':   return 'En attente';
      case 'finished':  return game.winner_id ? 'Terminée' : 'Nulle';
      case 'abandoned': return 'Abandon';
      default:          return game.status;
    }
  })();

  return (
    <li className="px-4 py-3 bg-canvas hover:bg-surface transition-colors duration-150">
      <div className="flex items-start justify-between gap-3">
        {/* Players */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden="true">{hostFlag}</span>
            <span className={'truncate ' + (winnerIsHost ? 'text-ink font-medium' : 'text-ink')}>
              {hostName}
            </span>
            {winnerIsHost && <Crown size={11} strokeWidth={1.75} className="text-accent shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden="true">{guestFlag}</span>
            <span className={'truncate ' + (winnerIsGuest ? 'text-ink font-medium' : 'text-ink')}>
              {guestName}
            </span>
            {winnerIsGuest && <Crown size={11} strokeWidth={1.75} className="text-accent shrink-0" />}
          </div>
        </div>

        {/* Status + watch */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={
              'inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm font-medium ' +
              (isLive
                ? 'border-accent text-accent bg-accent/10'
                : isFinished
                ? 'border-rule text-ink-subtle'
                : 'border-rule-strong text-ink-muted')
            }
          >
            {isLive && <Radio size={9} strokeWidth={2} className="animate-pulse" />}
            {statusLabel}
          </span>
          {isLive && (
            <button
              type="button"
              onClick={() => navigate(`/watch?room=${game.room_code}`)}
              className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-accent transition-colors duration-150"
            >
              <Eye size={11} strokeWidth={1.75} />
              Regarder
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
