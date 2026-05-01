import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Search, Swords, UserMinus, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Container } from '../components/ui/Container';
import { useAuth } from '../hooks/useAuth';
import {
  acceptFriendRequest,
  listFriendships,
  removeFriendship,
  searchProfiles,
  sendFriendRequest,
  type FriendEntry,
  type FriendStatus,
} from '../services/friendsService';
import { getEkangTitle } from '../services/glicko2';
import { getCountry } from '../config/countries';
import { useEmailVerificationGate } from '../hooks/useEmailVerificationGate';
import type { Profile } from '../services/supabase';

const PRESENCE_DOT: Record<FriendStatus, string> = {
  online: 'bg-emerald-500',
  in_game: 'bg-amber-500',
  offline: 'bg-ink-subtle/40',
};

const PRESENCE_LABEL: Record<FriendStatus, string> = {
  online: 'En ligne',
  in_game: 'En partie',
  offline: 'Hors ligne',
};

const FriendsPage: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const requireVerified = useEmailVerificationGate();

  const [entries, setEntries] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setEntries(await listFriendships(user.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for the local useAuth to resolve before deciding anything —
    // otherwise the first render sees isAuthenticated=false (bootstrap)
    // and we'd redirect a logged-in user back home.
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]);

  const accepted = useMemo(() => entries.filter((e) => e.friendship.status === 'accepted'), [entries]);
  const incoming = useMemo(
    () => entries.filter((e) => e.friendship.status === 'pending' && e.direction === 'received'),
    [entries],
  );
  const outgoing = useMemo(
    () => entries.filter((e) => e.friendship.status === 'pending' && e.direction === 'sent'),
    [entries],
  );

  const handleAccept = async (entry: FriendEntry) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await acceptFriendRequest(entry.profile.id, user.id);
      toast.success(`${displayName(entry.profile)} est maintenant votre ami·e.`);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (entry: FriendEntry, label: string) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await removeFriendship(entry.profile.id, user.id);
      toast(label);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  const handleChallenge = (entry: FriendEntry) => {
    requireVerified(
      () => navigate(`/game?action=create-online&invite=${entry.profile.id}`),
      'défier un ami',
    );
  };

  return (
    <div className="bg-canvas min-h-[60vh]">
      <Container width="wide" className="py-10 md:py-14">
        {/* Header */}
        <div className="mb-10">
          <p className="kicker mb-3">Communauté</p>
          <h1
            className="font-display text-ink leading-[1.0] tracking-[-0.03em]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50', fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}
          >
            Amis
          </h1>
          <p className="lead mt-6 max-w-[640px]">
            Vos partenaires de Songo. Défiez, suivez leur présence, gérez vos demandes.
          </p>
        </div>

        {/* Add friend */}
        <AddFriendBlock onChanged={refresh} meId={user?.id || ''} />

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <Section title={`Demandes reçues · ${incoming.length}`}>
            <ul role="list" className="border border-rule divide-y divide-rule">
              {incoming.map((entry) => (
                <FriendRow
                  key={`${entry.friendship.requester_id}_${entry.friendship.addressee_id}`}
                  entry={entry}
                  actions={
                    <>
                      <IconButton onClick={() => handleAccept(entry)} disabled={busy} variant="primary" label="Accepter">
                        <Check size={14} strokeWidth={1.75} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleRemove(entry, 'Demande refusée')}
                        disabled={busy}
                        variant="danger"
                        label="Refuser"
                      >
                        <X size={14} strokeWidth={1.75} />
                      </IconButton>
                    </>
                  }
                />
              ))}
            </ul>
          </Section>
        )}

        {/* Friends list */}
        <Section title={`Mes amis · ${accepted.length}`}>
          {loading ? (
            <p className="text-sm text-ink-subtle">Chargement…</p>
          ) : accepted.length === 0 ? (
            <div className="border border-rule py-12 text-center text-sm text-ink-muted">
              Aucun ami pour le moment. Cherchez des joueurs ci-dessus pour ajouter votre première relation.
            </div>
          ) : (
            <ul role="list" className="border border-rule divide-y divide-rule">
              {accepted
                .slice()
                .sort(presenceSort)
                .map((entry) => (
                  <FriendRow
                    key={`${entry.friendship.requester_id}_${entry.friendship.addressee_id}`}
                    entry={entry}
                    actions={
                      <>
                        <IconButton
                          onClick={() => handleChallenge(entry)}
                          disabled={busy || entry.presence === 'in_game'}
                          variant="primary"
                          label={entry.presence === 'in_game' ? 'Déjà en partie' : 'Défier'}
                        >
                          <Swords size={14} strokeWidth={1.75} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleRemove(entry, 'Ami retiré')}
                          disabled={busy}
                          variant="ghost"
                          label="Retirer"
                        >
                          <UserMinus size={14} strokeWidth={1.75} />
                        </IconButton>
                      </>
                    }
                  />
                ))}
            </ul>
          )}
        </Section>

        {/* Outgoing requests */}
        {outgoing.length > 0 && (
          <Section title={`Demandes envoyées · ${outgoing.length}`}>
            <ul role="list" className="border border-rule divide-y divide-rule">
              {outgoing.map((entry) => (
                <FriendRow
                  key={`${entry.friendship.requester_id}_${entry.friendship.addressee_id}`}
                  entry={entry}
                  meta="En attente de réponse"
                  actions={
                    <IconButton
                      onClick={() => handleRemove(entry, 'Demande annulée')}
                      disabled={busy}
                      variant="ghost"
                      label="Annuler"
                    >
                      <X size={14} strokeWidth={1.75} />
                    </IconButton>
                  }
                />
              ))}
            </ul>
          </Section>
        )}
      </Container>
    </div>
  );
};

export default FriendsPage;

/* ---------------------------------------------------------------- */

function presenceSort(a: FriendEntry, b: FriendEntry): number {
  const order: Record<FriendStatus, number> = { online: 0, in_game: 1, offline: 2 };
  return order[a.presence] - order[b.presence];
}

function displayName(p: Profile): string {
  return p.alias_songo || p.display_name || p.username || 'Joueur';
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-10">
    <p className="kicker mb-4">{title}</p>
    {children}
  </section>
);

const FriendRow: React.FC<{
  entry: FriendEntry;
  meta?: string;
  actions: React.ReactNode;
}> = ({ entry, meta, actions }) => {
  const country = getCountry(entry.profile.country);
  const title = getEkangTitle(entry.profile.elo_rating || 1200);

  return (
    <li className="flex items-center gap-3 px-4 py-3 bg-canvas hover:bg-surface transition-colors duration-150">
      <span className="relative shrink-0">
        <span className="text-base select-none" title={country?.name}>
          {country?.flag || '·'}
        </span>
        <span
          className={'absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full ring-2 ring-canvas ' + PRESENCE_DOT[entry.presence]}
          title={PRESENCE_LABEL[entry.presence]}
        />
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-ink">{displayName(entry.profile)}</p>
        <p className="text-xs text-ink-subtle italic font-display">
          {title.name} · {PRESENCE_LABEL[entry.presence]}
          {meta && <span> · {meta}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    </li>
  );
};

const IconButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'danger' | 'ghost';
  label: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, variant, label, children }) => {
  const base =
    'inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
    danger: 'border border-rule-strong text-ink-muted hover:border-danger hover:text-danger',
    ghost: 'text-ink-muted hover:text-ink hover:bg-surface',
  } as const;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
};

/* ---------------------------------------------------------------- */

const AddFriendBlock: React.FC<{ meId: string; onChanged: () => void }> = ({ meId, onChanged }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const requireVerified = useEmailVerificationGate();

  // Debounced search
  useEffect(() => {
    if (!meId || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchProfiles(query, meId));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, meId]);

  const handleAdd = (target: Profile) => {
    requireVerified(async () => {
      if (!meId || adding) return;
      setAdding(target.id);
      try {
        await sendFriendRequest(meId, target.id);
        toast.success(`Demande envoyée à ${displayName(target)}.`);
        setQuery('');
        setResults([]);
        onChanged();
      } catch (err: any) {
        toast.error(err?.message || 'Impossible d\'envoyer la demande');
      } finally {
        setAdding(null);
      }
    }, 'ajouter un ami');
  };

  return (
    <section className="mb-12">
      <p className="kicker mb-4">Chercher un joueur</p>
      <div className="relative max-w-xl">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
          <Search size={16} strokeWidth={1.75} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pseudo ou alias Songo (min. 2 caractères)"
          className="w-full h-11 pl-10 pr-4 rounded-md bg-surface text-ink placeholder:text-ink-subtle border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
        />
      </div>

      {results.length > 0 && (
        <ul role="list" className="mt-3 max-w-xl border border-rule divide-y divide-rule">
          {results.map((p) => {
            const c = getCountry(p.country);
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 bg-canvas">
                <span aria-hidden="true">{c?.flag || '·'}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-ink">{displayName(p)}</p>
                  <p className="text-xs text-ink-subtle">
                    {getEkangTitle(p.elo_rating || 1200).name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(p)}
                  disabled={adding === p.id}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
                >
                  <UserPlus size={13} strokeWidth={1.75} />
                  {adding === p.id ? 'Envoi…' : 'Ajouter'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="mt-3 text-sm text-ink-subtle">Aucun joueur trouvé pour « {query.trim()} ».</p>
      )}
    </section>
  );
};
