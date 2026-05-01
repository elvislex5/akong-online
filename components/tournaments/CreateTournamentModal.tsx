import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import {
  createTournament,
  type CreateTournamentInput,
  type TournamentFormat,
} from '../../services/tournamentService';
import { ALL_COUNTRIES, SONGO_HOME_COUNTRIES, AFRICA_COUNTRIES, WORLD_COUNTRIES } from '../../config/countries';
import type { GameSystem } from '../../types';
import type { Cadence } from '../../services/glicko2';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'arena', label: 'Arène (libre, durée fixe)' },
  { value: 'swiss', label: 'Suisse' },
  { value: 'knockout', label: 'Élimination directe' },
  { value: 'round_robin', label: 'Round-robin' },
  { value: 'custom', label: 'Sur mesure' },
];

const CADENCES: { value: Cadence | 'officiel'; label: string }[] = [
  { value: 'bullet', label: 'Bullet (2 min)' },
  { value: 'blitz', label: 'Blitz (5 min)' },
  { value: 'rapide', label: 'Rapide (10 min)' },
  { value: 'classique', label: 'Classique (20 min)' },
  { value: 'officiel', label: 'Officiel (6×20 min)' },
];

// HTML datetime-local needs YYYY-MM-DDTHH:mm in local time
const toLocalDatetime = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
};

const tomorrowAt = (hours: number) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, 0, 0, 0);
  return d;
};

export const CreateTournamentModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('arena');
  const [gameSystem, setGameSystem] = useState<GameSystem>('mgpwem');
  const [cadence, setCadence] = useState<Cadence | 'officiel'>('rapide');
  const [startsAt, setStartsAt] = useState(toLocalDatetime(tomorrowAt(20)));
  const [endsAt, setEndsAt] = useState(toLocalDatetime(tomorrowAt(22)));
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [country, setCountry] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [prize, setPrize] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || name.trim().length < 3) {
      toast.error('Le nom doit faire au moins 3 caractères.');
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!(start.getTime() < end.getTime())) {
      toast.error('La fin doit être après le début.');
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateTournamentInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        game_system: gameSystem,
        cadence,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        min_rating: minRating ? parseInt(minRating, 10) : undefined,
        max_rating: maxRating ? parseInt(maxRating, 10) : undefined,
        country: country || undefined,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
        prize_description: prize.trim() || undefined,
      };
      await createTournament(user.id, input);
      toast.success('Tournoi créé.');
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Création impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tournament-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-surface border border-rule shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-rule px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Nouveau tournoi</p>
            <h2
              id="create-tournament-title"
              className="font-display text-2xl text-ink mt-1"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Créer un tournoi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <Field label="Nom du tournoi" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Coupe Mengui d'avril"
              maxLength={80}
              required
            />
          </Field>

          <Field label="Description" hint="Optionnel — règles spécifiques, contexte, dotation">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Quelques mots à propos de ce tournoi…"
              className="w-full px-3 py-2 rounded-md bg-surface text-ink placeholder:text-ink-subtle border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150 resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Format">
              <Select value={format} onChange={(v) => setFormat(v as TournamentFormat)} options={FORMATS} />
            </Field>
            <Field label="Système">
              <Select
                value={gameSystem}
                onChange={(v) => setGameSystem(v as GameSystem)}
                options={[
                  { value: 'mgpwem', label: 'Mgpwém' },
                  { value: 'angbwe', label: 'Angbwé' },
                ]}
              />
            </Field>
            <Field label="Cadence">
              <Select value={cadence} onChange={(v) => setCadence(v as Cadence | 'officiel')} options={CADENCES} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Début" required>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md bg-surface text-ink border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
              />
            </Field>
            <Field label="Fin" required>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md bg-surface text-ink border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="ELO min" hint="Optionnel">
              <Input
                type="number"
                min={0}
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                placeholder="1200"
              />
            </Field>
            <Field label="ELO max" hint="Optionnel">
              <Input
                type="number"
                min={0}
                value={maxRating}
                onChange={(e) => setMaxRating(e.target.value)}
                placeholder="2500"
              />
            </Field>
            <Field label="Inscrits max" hint="Optionnel">
              <Input
                type="number"
                min={2}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="32"
              />
            </Field>
          </div>

          <Field label="Pays" hint="Optionnel — pour un championnat national">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-surface text-ink border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
            >
              <option value="">— Aucun pays spécifique —</option>
              <optgroup label="Pays d'ancrage du Songo">
                {SONGO_HOME_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Afrique">
                {AFRICA_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Reste du monde">
                {WORLD_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </optgroup>
            </select>
          </Field>

          <Field label="Dotation" hint="Optionnel — montant ou description du prix">
            <Input
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="500 000 FCFA + plateau gravé"
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-rule">
            <button
              type="button"
              onClick={onClose}
              className="h-10 inline-flex items-center justify-center px-4 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
            >
              {submitting ? 'Création…' : 'Créer le tournoi'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, required, children }) => (
  <div>
    <label className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">
      {label}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
  </div>
);

const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full h-10 px-3 rounded-md bg-surface text-ink border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);
