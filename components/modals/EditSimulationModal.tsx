import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { Player } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';

interface EditSimulationModalProps {
  isOpen: boolean;
  editPitIndex: number | null;
  editScorePlayer: Player | null;
  editValue: number;
  onSetEditValue: (value: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EditSimulationModal({
  isOpen,
  editPitIndex,
  editScorePlayer,
  editValue,
  onSetEditValue,
  onConfirm,
  onCancel,
}: EditSimulationModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useKeyboardShortcuts(
    [
      { key: 'Escape', handler: onCancel, description: 'Annuler' },
      { key: 'Enter', handler: onConfirm, description: 'Valider' },
    ],
    isOpen
  );

  if (!isOpen) return null;

  const increment = () => onSetEditValue(Math.min(editValue + 1, 99));
  const decrement = () => onSetEditValue(Math.max(editValue - 1, 0));

  const subtitle =
    editPitIndex !== null
      ? `Case ${editPitIndex + 1}`
      : editScorePlayer !== null
        ? `Score Joueur ${editScorePlayer === Player.One ? '1' : '2'}`
        : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          className="bg-surface border border-rule shadow-lg w-full max-w-sm"
        >
          <div className="p-6">
            <p className="kicker mb-2">Simulation · édition</p>
            <h2
              id="edit-modal-title"
              className="font-display text-2xl text-ink mb-1"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Modifier
            </h2>
            <p className="text-sm text-ink-muted mb-8">{subtitle}</p>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={decrement}
                aria-label="Diminuer la valeur"
                className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-rule-strong text-ink-muted hover:text-ink hover:border-accent hover:bg-canvas transition-colors duration-150"
              >
                <Minus size={16} strokeWidth={1.75} />
              </button>

              <div
                className="border border-rule-strong px-6 h-14 flex items-center justify-center min-w-[120px]"
                role="status"
                aria-live="polite"
              >
                <span
                  className="font-display tabular-nums text-ink"
                  style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30', fontSize: '2.5rem' }}
                >
                  {editValue}
                </span>
              </div>

              <button
                type="button"
                onClick={increment}
                aria-label="Augmenter la valeur"
                className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-rule-strong text-ink-muted hover:text-ink hover:border-accent hover:bg-canvas transition-colors duration-150"
              >
                <Plus size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row-reverse gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
              >
                Valider
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
              >
                Annuler
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
