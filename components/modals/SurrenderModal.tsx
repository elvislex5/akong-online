import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMode, Player } from '../../types';

interface SurrenderModalProps {
  isOpen: boolean;
  gameMode: GameMode | null;
  onClose: () => void;
  onSurrender: (player: Player) => void;
}

export function SurrenderModal({ isOpen, gameMode, onClose, onSurrender }: SurrenderModalProps) {
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
          className="bg-gradient-to-br from-gray-900/95 to-red-950/95 backdrop-blur-xl border-2 border-red-500/30 rounded-3xl shadow-2xl text-center max-w-md w-full relative overflow-hidden"
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
              className="mb-6 text-6xl sm:text-7xl text-red-500"
            >
              !
            </motion.div>

            {/* Title with gradient */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-4 uppercase tracking-wider"
            >
              Abandonner ?
            </motion.h2>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
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
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-red-500/50 text-sm sm:text-base"
              >
                OUI, ABANDONNER
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 text-sm sm:text-base"
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
