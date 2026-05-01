import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { MatchFormat } from '../../services/supabase';
import { TIME_CONTROLS, type TimeControl } from '../../hooks/useGameTimer';

interface MatchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: MatchFormat, target?: number, timeControl?: TimeControl) => void;
  confirmLabel?: string;
}

type FormatDef = {
  id: MatchFormat;
  title: string;
  description: string;
  recommended?: boolean;
};

const FORMATS: FormatDef[] = [
  {
    id: 'infinite',
    title: 'Parties libres',
    description: 'Sans limite. Le score s\'affiche, mais le match ne s\'arrête jamais tout seul.',
  },
  {
    id: 'traditional_6',
    title: 'Traditionnel · 6 parties',
    description: 'Format historique du Songo. Six parties exactement, le total décide.',
    recommended: true,
  },
  {
    id: 'traditional_2',
    title: 'Traditionnel · 2 parties',
    description: 'Aller-retour. Idéal pour une session courte.',
  },
  {
    id: 'first_to_x',
    title: 'Premier à X victoires',
    description: 'Format compétitif moderne. Le premier à atteindre la cible l\'emporte.',
  },
];

export function MatchConfigModal({
  isOpen,
  onClose,
  onConfirm,
  confirmLabel = 'Créer la partie',
}: MatchConfigModalProps) {
  const [format, setFormat] = useState<MatchFormat>('traditional_6');
  const [target, setTarget] = useState<number>(3);
  const [time, setTime] = useState<TimeControl>('none');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (format === 'first_to_x' && target < 1) return;
    onConfirm(format, format === 'first_to_x' ? target : undefined, time);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-surface border border-rule shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-config-title"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-rule px-6 py-5 flex items-start justify-between">
          <div>
            <p className="kicker">Configuration du match</p>
            <h2
              id="match-config-title"
              className="font-display text-2xl text-ink mt-1"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Format
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Format selection */}
          <fieldset>
            <legend className="kicker mb-3">Choisir un format</legend>
            <div className="grid grid-cols-1 gap-px bg-rule border border-rule">
              {FORMATS.map((f) => (
                <FormatRow
                  key={f.id}
                  selected={format === f.id}
                  onClick={() => setFormat(f.id)}
                  title={f.title}
                  description={f.description}
                  recommended={f.recommended}
                />
              ))}
            </div>
          </fieldset>

          {/* First to X target */}
          {format === 'first_to_x' && (
            <fieldset>
              <legend className="kicker mb-3">Cible · victoires</legend>
              <div className="grid grid-cols-4 gap-px bg-rule border border-rule">
                {[2, 3, 5, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTarget(n)}
                    className={
                      'py-4 transition-colors duration-150 ' +
                      (target === n ? 'bg-accent text-accent-ink' : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
                    }
                  >
                    <span
                      className="font-display text-2xl tabular-nums"
                      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
                    >
                      {n}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-subtle mt-2">
                Le match se termine dès qu'un joueur atteint {target} victoire{target > 1 ? 's' : ''}.
              </p>
            </fieldset>
          )}

          {/* Time control */}
          <fieldset>
            <legend className="kicker mb-3">Cadence</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border border-rule">
              {(Object.entries(TIME_CONTROLS) as [TimeControl, typeof TIME_CONTROLS[TimeControl]][]).map(([key, tc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTime(key)}
                  className={
                    'py-3 px-3 text-sm font-medium transition-colors duration-150 ' +
                    (time === key ? 'bg-accent text-accent-ink' : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
                  }
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-rule px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 inline-flex items-center justify-center px-4 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-10 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const FormatRow: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  recommended?: boolean;
}> = ({ selected, onClick, title, description, recommended }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={
      'p-5 flex items-start gap-4 transition-colors duration-150 text-left ' +
      (selected ? 'bg-surface ring-1 ring-inset ring-accent' : 'bg-canvas hover:bg-surface')
    }
  >
    <span
      className={
        'mt-1 w-4 h-4 rounded-full border flex-shrink-0 transition-colors duration-150 ' +
        (selected ? 'border-accent' : 'border-rule-strong')
      }
    >
      {selected && <span className="block w-2 h-2 rounded-full bg-accent m-[3px]" />}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <p
          className="font-display text-lg text-ink"
          style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
        >
          {title}
        </p>
        {recommended && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase bg-accent/10 text-accent rounded-sm">
            Recommandé
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
    </div>
  </button>
);
