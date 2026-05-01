import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Trophy, Users } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { useAuth } from '../hooks/useAuth';
import { listTournaments, type Tournament, type TournamentStatus } from '../services/tournamentService';
import { getCountry } from '../config/countries';
import { CreateTournamentModal } from '../components/tournaments/CreateTournamentModal';

const SECTIONS: { status: TournamentStatus; label: string; description: string }[] = [
  { status: 'ongoing',  label: 'En cours',  description: 'Tournois actifs en ce moment' },
  { status: 'upcoming', label: 'À venir',   description: 'Inscriptions ouvertes' },
  { status: 'finished', label: 'Terminés',  description: 'Archives et résultats' },
];

const formatLabels: Record<string, string> = {
  arena: 'Arène',
  swiss: 'Suisse',
  knockout: 'Élimination',
  round_robin: 'Round-robin',
  custom: 'Sur mesure',
  officiel: 'Officiel',
};

const cadenceLabels: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapide: 'Rapide',
  classique: 'Classique',
  officiel: 'Officiel',
};

const TournamentsPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const list = await listTournaments();
      setTournaments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<TournamentStatus, Tournament[]> = {
      upcoming: [],
      ongoing: [],
      finished: [],
      cancelled: [],
    };
    for (const t of tournaments) {
      map[t.status].push(t);
    }
    return map;
  }, [tournaments]);

  return (
    <div className="bg-canvas min-h-[60vh]">
      <Container width="wide" className="py-12 md:py-16">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <p className="kicker mb-3">Compete · Module 3</p>
            <h1
              className="font-display text-ink leading-[0.95] tracking-[-0.03em]"
              style={{
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
                fontSize: 'clamp(3rem, 8vw, 6rem)',
              }}
            >
              Tournois
            </h1>
            <p className="lead mt-6 max-w-[640px]">
              Arènes ouvertes, championnats nationaux, défis Titled Tuesday — la
              vie compétitive du Songo se tient ici.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
            >
              <Plus size={16} strokeWidth={1.75} />
              Créer un tournoi
            </button>
          )}
        </div>

        {/* Sections */}
        {loading ? (
          <SkeletonSection />
        ) : tournaments.length === 0 ? (
          <EmptyState isAdmin={isAdmin} />
        ) : (
          <div className="space-y-12">
            {SECTIONS.map((section) => {
              const items = grouped[section.status];
              if (items.length === 0) return null;
              return (
                <section key={section.status}>
                  <div className="mb-4">
                    <p className="kicker">{section.label}</p>
                    <p className="text-xs text-ink-subtle mt-0.5">{section.description}</p>
                  </div>
                  <ul role="list" className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
                    {items.map((t) => (
                      <TournamentCard key={t.id} tournament={t} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Container>

      {showCreate && (
        <CreateTournamentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
};

export default TournamentsPage;

/* ----------------------------------------------------------------
   TournamentCard — one tournament summary inside a section grid
   ---------------------------------------------------------------- */

const TournamentCard: React.FC<{ tournament: Tournament }> = ({ tournament: t }) => {
  const country = getCountry(t.country);
  const startsAt = new Date(t.starts_at);
  const endsAt = new Date(t.ends_at);
  const dateLabel = startsAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: startsAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
  const timeLabel = startsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const durationHours = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 3600000));

  return (
    <li className="bg-canvas hover:bg-surface transition-colors duration-150">
      <Link to={`/tournaments/${t.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="kicker mb-1 inline-flex items-center gap-1.5">
              {country && <span aria-hidden="true">{country.flag}</span>}
              {formatLabels[t.format] || t.format}
              <span className="text-ink-subtle">·</span>
              {t.game_system === 'mgpwem' ? 'Mgpwém' : 'Angbwé'}
              <span className="text-ink-subtle">·</span>
              {cadenceLabels[t.cadence] || t.cadence}
            </p>
            <h3
              className="font-display text-xl text-ink leading-tight"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              {t.name}
            </h3>
          </div>
          <Trophy size={16} strokeWidth={1.5} className="text-ink-subtle shrink-0 mt-1" />
        </div>

        {t.description && (
          <p className="text-sm text-ink-muted leading-relaxed line-clamp-2 mb-3">
            {t.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} strokeWidth={1.75} />
            {dateLabel} · {timeLabel} ({durationHours}h)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} strokeWidth={1.75} />
            {t.participant_count ?? 0}
            {t.max_participants ? ` / ${t.max_participants}` : ''}
          </span>
        </div>

        {(t.min_rating || t.max_rating) && (
          <p className="mt-2 text-[10px] text-ink-subtle font-medium tracking-wider uppercase">
            ELO{' '}
            {t.min_rating ? `≥ ${t.min_rating}` : ''}
            {t.min_rating && t.max_rating ? ' — ' : ''}
            {t.max_rating ? `≤ ${t.max_rating}` : ''}
          </p>
        )}
      </Link>
    </li>
  );
};

const SkeletonSection: React.FC = () => (
  <div className="space-y-12">
    {Array.from({ length: 2 }).map((_, s) => (
      <div key={s}>
        <div className="h-3 w-32 bg-surface mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-canvas p-5 space-y-3">
              <div className="h-3 w-40 bg-surface animate-pulse" />
              <div className="h-5 w-48 bg-surface animate-pulse" />
              <div className="h-3 w-56 bg-surface animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => (
  <div className="border border-rule py-20 px-6 text-center">
    <Trophy size={28} strokeWidth={1.5} className="mx-auto text-ink-subtle mb-4" />
    <h2
      className="font-display text-2xl text-ink mb-2"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      Aucun tournoi pour l'instant
    </h2>
    <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
      {isAdmin
        ? 'Lancez le premier — créez une arène en quelques clics.'
        : 'Reviens plus tard — les premiers tournois sont en préparation.'}
    </p>
  </div>
);
