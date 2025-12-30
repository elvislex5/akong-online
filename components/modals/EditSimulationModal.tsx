import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onCancel
}: EditSimulationModalProps) {
  // Accessibility: Focus trap
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Accessibility: Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'Escape', handler: onCancel, description: 'Annuler' },
    { key: 'Enter', handler: onConfirm, description: 'Valider' }
  ], isOpen);

  if (!isOpen) return null;

  const increment = () => onSetEditValue(Math.min(editValue + 1, 99));
  const decrement = () => onSetEditValue(Math.max(editValue - 1, 0));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          className="modal-container border-emerald-500/30 text-center max-w-sm"
        >
          {/* Subtle glow effect */}
          <div className="glow-overlay-emerald"></div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8">
            {/* Title */}
            <h2 id="edit-modal-title" className="title-section text-gradient-emerald mb-2">
              Modifier
            </h2>

            {/* Subtitle */}
            <p className="text-gray-400 mb-6 text-sm">
              {editPitIndex !== null ? `Case ${editPitIndex + 1}` :
                editScorePlayer !== null ? `Score Joueur ${editScorePlayer === Player.One ? '1' : '2'}` : ''}
            </p>

            {/* Value editor */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={decrement}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-2xl text-white transition-all duration-300 focus-visible-ring"
                aria-label="Diminuer la valeur"
              >
                −
              </button>

              <div className="glass-card border-2 border-emerald-500/30 px-6 py-4 rounded-2xl min-w-[100px]" role="status" aria-live="polite">
                <span className="text-4xl font-black text-emerald-400">
                  {editValue}
                </span>
              </div>

              <button
                onClick={increment}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-2xl text-white transition-all duration-300 focus-visible-ring"
                aria-label="Augmenter la valeur"
              >
                +
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={onConfirm}
                className="btn-emerald flex-1 focus-visible-ring"
              >
                Valider
              </button>
              <button
                onClick={onCancel}
                className="btn-secondary flex-1 focus-visible-ring"
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
