import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RULE_ITEMS = [
  {
    title: 'But du jeu',
    body: 'Capturer plus de trente-cinq graines.',
  },
  {
    title: 'Distribution',
    body: 'On sème une par une vers la droite (sens anti-horaire). Plus de quatorze graines : on saute la case de départ.',
  },
  {
    title: 'La capture',
    body: 'Si la dernière graine tombe chez l\'adversaire et porte la case à 2, 3 ou 4 graines — on capture, et la chaîne remonte tant que la condition tient.',
  },
];

const SPECIAL_RULES = [
  { label: 'Auto-capture', body: 'Tour complet avec une seule graine restante : capturée automatiquement.' },
  { label: 'Solidarité', body: 'Une seule graine dans la dernière case : auto-capturée. L\'adversaire doit nourrir.' },
  { label: 'Sécheresse', body: 'Interdit d\'affamer l\'adversaire totalement, sauf si inévitable.' },
];

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useKeyboardShortcuts(
    [{ key: 'Escape', handler: onClose, description: 'Fermer' }],
    isOpen
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-title"
          className="bg-surface border border-rule shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-surface border-b border-rule px-6 py-4 flex items-start justify-between">
            <div>
              <p className="kicker">Référence rapide</p>
              <h2
                id="rules-title"
                className="font-display text-2xl text-ink mt-1"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
              >
                Règles du Songo
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

          {/* Body */}
          <div className="p-6 space-y-6">
            <ol className="grid grid-cols-1 gap-px bg-rule border border-rule" role="list">
              {RULE_ITEMS.map((rule, i) => (
                <li key={rule.title} className="bg-canvas p-4">
                  <p className="kicker mb-2">{String(i + 1).padStart(2, '0')}</p>
                  <h3
                    className="font-display text-lg text-ink mb-2"
                    style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                  >
                    {rule.title}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{rule.body}</p>
                </li>
              ))}
            </ol>

            <div>
              <p className="kicker mb-3">Règles spéciales</p>
              <dl className="divide-y divide-rule border-t border-b border-rule">
                {SPECIAL_RULES.map((s) => (
                  <div key={s.label} className="grid grid-cols-[120px_1fr] gap-4 py-3 items-baseline">
                    <dt
                      className="font-display text-base text-ink italic"
                      style={{ fontVariationSettings: '"opsz" 18, "SOFT" 60' }}
                    >
                      {s.label}
                    </dt>
                    <dd className="text-sm text-ink-muted leading-relaxed">{s.body}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
              >
                Compris
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
