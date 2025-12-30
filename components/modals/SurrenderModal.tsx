import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMode, Player } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';
import { AlertTriangle } from 'lucide-react';

interface SurrenderModalProps {
  isOpen: boolean;
  gameMode: GameMode | null;
  onClose: () => void;
  onSurrender: (player: Player) => void;
}

export function SurrenderModal({ isOpen, gameMode, onClose, onSurrender }: SurrenderModalProps) {
  // Accessibility: Focus trap
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Accessibility: Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'Escape', handler: onClose, description: 'Annuler' }
  ], isOpen);

  const handleSurrender = () => {
    // For local multiplayer, we don't know which player is surrendering
    // For online/AI, it's always the human player (Player.One for online guest, or the non-AI player)
    if (gameMode === GameMode.LocalMultiplayer) {
      // Default to Player.One for local
      onSurrender(Player.One);
    } else if (gameMode === GameMode.OnlineGuest) {
      onSurrender(Player.Two);
    } else {
      onSurrender(Player.One);
    }
  };

  if (!isOpen) return null;

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
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="surrender-title"
          aria-describedby="surrender-desc"
          className="modal-container border-red-500/30 text-center max-w-md"
        >
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 pointer-events-none rounded-3xl"></div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8">
            {/* Warning icon with pulse animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 200,
                delay: 0.1
              }}
              className="mb-6 flex justify-center text-red-500"
              aria-hidden="true"
            >
              <AlertTriangle className="w-20 h-20" />
            </motion.div>

            {/* Title with gradient */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              id="surrender-title"
              className="title-section text-gradient-red mb-4 uppercase tracking-wider"
            >
              Abandonner ?
            </motion.h2>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              id="surrender-desc"
              className="mb-8"
            >
              <p className="text-gray-300 mb-3 text-sm sm:text-base">
                Êtes-vous sûr de vouloir abandonner cette partie ?
              </p>
              <p className="text-amber-400 font-bold text-sm sm:text-base">
                Cette action est irréversible.
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button
                onClick={handleSurrender}
                className="btn-danger text-sm sm:text-base py-3 focus-visible-ring"
              >
                OUI, ABANDONNER
              </button>
              <button
                onClick={onClose}
                className="btn-emerald text-sm sm:text-base py-3 focus-visible-ring"
              >
                NON, CONTINUER
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
