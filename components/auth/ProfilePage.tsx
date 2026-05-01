import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Edit2, Save, X, Lock, History as HistoryIcon } from 'lucide-react';
import { updateUsername, updateProfile } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import { getAllSkinsWithUnlockStatus, selectBoardSkin, type BoardSkin } from '../../services/boardSkinService';
import { selectSeedColor } from '../../services/seedColorService';
import { SEED_COLOR_LIST, getSeedColor, type SeedColorId } from '../../config/seedColors';
import {
  SONGO_HOME_COUNTRIES,
  AFRICA_COUNTRIES,
  WORLD_COUNTRIES,
  formatCountry,
  getCountry,
} from '../../config/countries';
import { getUserAllRatings, type RatingRecord } from '../../services/ratingService';
import { getEkangTitle, type Cadence } from '../../services/glicko2';
import type { Profile } from '../../services/supabase';
import { Container } from '../ui/Container';
import { Input } from '../ui/Input';
import { RatingChart } from '../profile/RatingChart';
import type { GameSystem } from '../../types';

interface ProfilePageProps {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: (profile: Profile) => void;
}

const AVATARS = [
  '/avatars/avatar_male_black.png',
  '/avatars/avatar_female_black.png',
  '/avatars/avatar_male_white.png',
  '/avatars/avatar_female_white.png',
];

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onClose, onProfileUpdated }) => {
  const navigate = useNavigate();
  const { signOut } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);

  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [aliasSongo, setAliasSongo] = useState(profile.alias_songo || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar_url || AVATARS[0]);
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(profile.selected_board_skin);
  const [selectedSeedColorId, setSelectedSeedColorId] = useState<SeedColorId>(
    (profile.selected_seed_color as SeedColorId) || 'ezang'
  );
  const [country, setCountry] = useState<string>(profile.country || '');

  const [skins, setSkins] = useState<(BoardSkin & { unlocked: boolean })[]>([]);
  const [loadingSkins, setLoadingSkins] = useState(true);

  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync state when profile changes
  useEffect(() => {
    setUsername(profile.username);
    setDisplayName(profile.display_name || '');
    setAliasSongo(profile.alias_songo || '');
    setBio(profile.bio || '');
    setSelectedAvatar(profile.avatar_url || AVATARS[0]);
    setSelectedSkinId(profile.selected_board_skin);
    setSelectedSeedColorId((profile.selected_seed_color as SeedColorId) || 'ezang');
    setCountry(profile.country || '');
  }, [profile]);

  // Fetch skins
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllSkinsWithUnlockStatus(profile.id);
        if (cancelled) return;
        setSkins(list);
        if (!profile.selected_board_skin && list.length > 0) {
          const def = list.find((s) => s.name === 'Classic Wood') || list[0];
          setSelectedSkinId(def.id);
        }
      } catch (err) {
        console.error('[ProfilePage] skins:', err);
      } finally {
        if (!cancelled) setLoadingSkins(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.selected_board_skin]);

  // Fetch ratings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getUserAllRatings(profile.id);
        if (!cancelled) setRatings(list);
      } catch (err) {
        console.error('[ProfilePage] ratings:', err);
      } finally {
        if (!cancelled) setLoadingRatings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updates: Partial<Profile> = {};
      if (username !== profile.username) await updateUsername(profile.id, username);
      if (displayName !== (profile.display_name || '')) updates.display_name = displayName;
      if (bio !== (profile.bio || '')) updates.bio = bio;
      if (aliasSongo !== (profile.alias_songo || '')) updates.alias_songo = aliasSongo || null;
      if (selectedAvatar !== profile.avatar_url) updates.avatar_url = selectedAvatar;
      if (country !== (profile.country || '')) updates.country = country || null;

      if (selectedSkinId && selectedSkinId !== profile.selected_board_skin) {
        await selectBoardSkin(profile.id, selectedSkinId);
      }

      if (selectedSeedColorId !== profile.selected_seed_color) {
        await selectSeedColor(profile.id, selectedSeedColorId);
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(profile.id, updates);
      }

      onProfileUpdated({
        ...profile,
        username,
        display_name: displayName,
        alias_songo: aliasSongo || null,
        bio,
        avatar_url: selectedAvatar,
        selected_board_skin: selectedSkinId,
        selected_seed_color: selectedSeedColorId,
        country: country || null,
      });

      setSuccess('Profil mis à jour.');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ProfilePage] save:', err);
      setError(err?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setUsername(profile.username);
    setDisplayName(profile.display_name || '');
    setAliasSongo(profile.alias_songo || '');
    setBio(profile.bio || '');
    setSelectedAvatar(profile.avatar_url || AVATARS[0]);
    setSelectedSkinId(profile.selected_board_skin);
    setSelectedSeedColorId((profile.selected_seed_color as SeedColorId) || 'ezang');
    setCountry(profile.country || '');
    setError('');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (err: any) {
      console.error('[ProfilePage] sign out:', err);
      setError('Erreur lors de la déconnexion.');
    }
  };

  const winRate = useMemo(
    () => (profile.games_played > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0),
    [profile.games_played, profile.games_won]
  );

  const ekangTitle = getEkangTitle(profile.elo_rating);
  const currentSkinName = skins.find((s) => s.id === selectedSkinId)?.name || 'Classique';

  return (
    <div className="bg-canvas min-h-screen">
      <Container width="wide" className="py-12 md:py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-12">
          <button
            type="button"
            onClick={onClose}
            aria-label="Retour"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <p className="kicker">Espace personnel</p>
        </div>

        {/* Identity hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start mb-16">
          <div className="lg:col-span-3">
            <div className="w-32 h-32 rounded-full overflow-hidden border border-rule">
              <img src={selectedAvatar} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="lg:col-span-9">
            <h1
              className="font-display text-ink leading-[0.95] tracking-[-0.03em] mb-2"
              style={{
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              }}
            >
              {profile.display_name || profile.username}
            </h1>
            <p className="text-ink-muted mb-1">@{profile.username}</p>
            {profile.alias_songo && (
              <p
                className="text-ink-muted italic font-display"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 60' }}
              >
                « {profile.alias_songo} »
              </p>
            )}
            <p className="kicker mt-6">
              Titre Ekang · <span className="text-ink">{ekangTitle.name}</span>
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <section className="border-y border-rule -mx-4 sm:mx-0 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-rule">
            <Stat label="Parties" value={profile.games_played} />
            <Stat label="Victoires" value={profile.games_won} />
            <Stat label="Défaites" value={profile.games_lost} />
            <Stat label="Win rate" value={`${winRate}%`} />
            <Stat label="ELO" value={profile.elo_rating} sub={`pic ${profile.peak_elo}`} />
          </div>
        </section>

        {/* Notices */}
        {error && <Notice tone="danger">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        {/* Identity (read or edit) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <p className="kicker">Identité</p>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
              >
                <Edit2 size={14} strokeWidth={1.75} />
                Modifier
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
                >
                  <X size={14} strokeWidth={1.75} />
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
                >
                  <Save size={14} strokeWidth={1.75} />
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <ReadGrid
              items={[
                { label: 'Nom d\'utilisateur', value: `@${profile.username}` },
                { label: 'Nom d\'affichage', value: profile.display_name || '—' },
                { label: 'Alias Songo', value: profile.alias_songo || '—' },
                { label: 'Pays', value: formatCountry(profile.country) },
                { label: 'Apparence du plateau', value: currentSkinName },
                { label: 'Couleur des graines', value: getSeedColor(profile.selected_seed_color).name },
                { label: 'Bio', value: profile.bio || '—', wide: true },
              ]}
            />
          ) : (
            <div className="space-y-8">
              {/* Avatar picker */}
              <Field label="Avatar">
                <div className="flex gap-3 flex-wrap">
                  {AVATARS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={
                        'w-16 h-16 rounded-full overflow-hidden border-2 transition-all ' +
                        (selectedAvatar === url ? 'border-accent' : 'border-rule hover:border-rule-strong')
                      }
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </Field>

              {/* Board skin */}
              <Field label="Apparence du plateau">
                {loadingSkins ? (
                  <p className="text-sm text-ink-subtle">Chargement…</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {skins.map((skin) => (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => skin.unlocked && setSelectedSkinId(skin.id)}
                        disabled={!skin.unlocked}
                        className={
                          'relative border p-2 rounded-md flex flex-col gap-2 transition-all ' +
                          (selectedSkinId === skin.id
                            ? 'border-accent bg-surface'
                            : skin.unlocked
                              ? 'border-rule hover:border-rule-strong bg-surface'
                              : 'border-rule bg-surface opacity-50 cursor-not-allowed')
                        }
                      >
                        <div className="aspect-[3/2] rounded-sm overflow-hidden relative bg-canvas">
                          <img src={skin.image_url} alt="" className="w-full h-full object-cover" />
                          {!skin.unlocked && (
                            <div className="absolute inset-0 bg-canvas/70 flex items-center justify-center">
                              <Lock size={16} strokeWidth={1.5} className="text-ink-subtle" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-ink-muted truncate">{skin.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              {/* Seed colour */}
              <Field label="Couleur des graines">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SEED_COLOR_LIST.map((color) => {
                    const active = selectedSeedColorId === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedSeedColorId(color.id)}
                        aria-pressed={active}
                        className={
                          'relative border p-3 rounded-md flex flex-col items-center gap-2 transition-all ' +
                          (active
                            ? 'border-accent bg-surface'
                            : 'border-rule hover:border-rule-strong bg-surface')
                        }
                      >
                        <div
                          className="w-10 h-10 rounded-full"
                          style={{ background: color.gradient, boxShadow: color.shadow }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-ink-muted">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Nom d'utilisateur" hint="Lettres minuscules et chiffres uniquement">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  />
                </Field>
                <Field label="Nom d'affichage">
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </Field>
              </div>

              <Field label="Alias Songo" hint="Votre nom de guerre sur le plateau">
                <Input
                  value={aliasSongo}
                  onChange={(e) => setAliasSongo(e.target.value)}
                  placeholder="Vivi le Champion"
                />
              </Field>

              <Field label="Pays" hint="Pour le classement national. Les quatre pays d'ancrage du Songo apparaissent en tête.">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-surface text-ink border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
                >
                  <option value="">— Non renseigné —</option>
                  <optgroup label="Pays d'ancrage du Songo">
                    {SONGO_HOME_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Afrique">
                    {AFRICA_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Reste du monde">
                    {WORLD_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>

              <Field label="Bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Quelques mots à propos de vous…"
                  className="w-full px-3 py-2 rounded-md bg-surface text-ink placeholder:text-ink-subtle border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150 resize-none"
                />
              </Field>
            </div>
          )}
        </section>

        {/* Multi-system ratings */}
        <section className="mb-16">
          <p className="kicker mb-6">Classements par système</p>
          {loadingRatings ? (
            <p className="text-sm text-ink-subtle">Chargement…</p>
          ) : ratings.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune partie classée pour le moment.</p>
          ) : (
            <div className="space-y-10">
              {(['mgpwem', 'angbwe'] as const).map((system) => {
                const rows = ratings.filter((r) => r.game_system === system);
                if (rows.length === 0) return null;
                return (
                  <div key={system}>
                    <h3
                      className="font-display text-2xl text-ink mb-4"
                      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
                    >
                      {system === 'mgpwem' ? 'Mgpwém' : 'Angbwé'}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
                      {rows.map((r) => {
                        const t = getEkangTitle(r.rating);
                        const cad = { bullet: 'Bullet', blitz: 'Blitz', rapide: 'Rapide', classique: 'Classique' }[r.cadence];
                        return (
                          <div key={r.id} className="bg-canvas p-5">
                            <p className="kicker">{cad}</p>
                            <p
                              className="font-display text-3xl text-ink mt-2 tabular-nums"
                              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
                            >
                              {r.rating}
                            </p>
                            <p className="text-xs text-ink-muted mt-1 italic font-display">{t.name}</p>
                            <p className="text-xs text-ink-subtle mt-3">
                              {r.games_played}p · {r.wins}V {r.losses}D {r.draws}N
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rating evolution chart */}
        {ratings.length > 0 && (
          <section className="mb-16">
            <RatingChart
              userId={profile.id}
              gameSystem={pickPrimaryRating(ratings).game_system as GameSystem}
              cadence={pickPrimaryRating(ratings).cadence as Cadence}
            />
          </section>
        )}

        {/* Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border-y border-rule -mx-4 sm:mx-0">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="bg-canvas py-5 px-6 flex items-center justify-between hover:bg-surface transition-colors duration-150 text-left"
          >
            <div className="flex items-center gap-3">
              <HistoryIcon size={16} strokeWidth={1.75} className="text-ink-muted" />
              <div>
                <p className="text-ink font-medium text-sm">Historique des parties</p>
                <p className="text-xs text-ink-subtle">Toutes vos parties terminées</p>
              </div>
            </div>
            <ArrowRight size={16} strokeWidth={1.5} className="text-ink-subtle" />
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="bg-canvas py-5 px-6 flex items-center justify-between hover:bg-surface transition-colors duration-150 text-left text-danger"
          >
            <div>
              <p className="font-medium text-sm">Se déconnecter</p>
              <p className="text-xs text-danger/70">Fin de la session sur cet appareil</p>
            </div>
            <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        </section>
      </Container>
    </div>
  );
};

export default ProfilePage;

/**
 * Picks the (system, cadence) the user has the most experience with —
 * that's the most relevant default for the rating chart.
 */
function pickPrimaryRating(ratings: RatingRecord[]): RatingRecord {
  return ratings.reduce((best, r) => (r.games_played > best.games_played ? r : best), ratings[0]);
}

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const Stat: React.FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
  <div className="px-6 py-6">
    <p className="kicker mb-2">{label}</p>
    <p
      className="font-display text-ink leading-none tabular-nums"
      style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
    >
      {value}
    </p>
    {sub && <p className="text-xs text-ink-subtle mt-1">{sub}</p>}
  </div>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">{label}</label>
    {children}
    {hint && <p className="mt-2 text-xs text-ink-subtle">{hint}</p>}
  </div>
);

const ReadGrid: React.FC<{ items: { label: string; value: string; wide?: boolean }[] }> = ({ items }) => (
  <dl className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
    {items.map((item) => (
      <div key={item.label} className={'bg-canvas p-5 ' + (item.wide ? 'md:col-span-2' : '')}>
        <dt className="kicker mb-2">{item.label}</dt>
        <dd className="text-ink text-md">{item.value}</dd>
      </div>
    ))}
  </dl>
);

const Notice: React.FC<{ tone: 'danger' | 'success'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'danger' ? 'alert' : 'status'}
    className={
      'mb-8 border-l-2 px-3 py-2 text-sm ' +
      (tone === 'danger' ? 'border-danger text-danger bg-danger/5' : 'border-success text-success bg-success/5')
    }
  >
    {children}
  </div>
);
