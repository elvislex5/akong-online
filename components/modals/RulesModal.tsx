import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden relative flex flex-col"
        >
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-3xl"></div>

          {/* Header - Sticky */}
          <div className="flex-shrink-0 bg-black/60 backdrop-blur-xl p-4 sm:p-6 border-b border-amber-500/30 flex justify-between items-center z-10">
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Règles du Songo
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="relative z-10 p-4 sm:p-6 text-gray-300 space-y-4 leading-relaxed overflow-y-auto flex-1">

            <section className="bg-white/5 border border-amber-500/20 p-4 rounded-xl hover:border-amber-500/40 transition-all duration-300">
              <h3 className="text-base font-bold text-amber-400 mb-2">
                But du jeu
              </h3>
              <p className="text-sm text-gray-300">
                Capturer plus de 35 graines.
              </p>
            </section>

            <section className="bg-white/5 border border-amber-500/20 p-4 rounded-xl hover:border-amber-500/40 transition-all duration-300">
              <h3 className="text-base font-bold text-amber-400 mb-2">
                Distribution
              </h3>
              <p className="text-sm text-gray-300">
                On sème les graines une par une vers la droite (sens anti-horaire). Si on a plus de 14 graines,
                on fait un tour complet en sautant la case de départ.
              </p>
            </section>

            <section className="bg-white/5 border border-amber-500/20 p-4 rounded-xl hover:border-amber-500/40 transition-all duration-300">
              <h3 className="text-base font-bold text-amber-400 mb-2">
                La Prise
              </h3>
              <p className="text-sm text-gray-300">
                Si la dernière graine tombe chez l'adversaire et que la case contient alors 2, 3 ou 4 graines,
                on capture ces graines (ainsi que celles des cases précédentes si elles remplissent la même condition).
              </p>
            </section>

            <section className="bg-white/5 border border-amber-500/20 p-4 rounded-xl hover:border-amber-500/40 transition-all duration-300">
              <h3 className="text-base font-bold text-amber-400 mb-2">
                Règles Spéciales
              </h3>
              <ul className="list-none space-y-2 text-gray-300">
                <li className="flex gap-2 text-sm">
                  <span className="text-emerald-400 font-bold">•</span>
                  <div>
                    <strong className="text-emerald-400">Auto-capture :</strong> Tour complet avec 1 graine → capturée automatiquement.
                  </div>
                </li>
                <li className="flex gap-2 text-sm">
                  <span className="text-amber-400 font-bold">•</span>
                  <div>
                    <strong className="text-amber-400">Solidarité :</strong> Si 1 seule graine dans votre dernière case, vous l'auto-capturez.
                    L'adversaire DOIT vous nourrir.
                  </div>
                </li>
                <li className="flex gap-2 text-sm">
                  <span className="text-red-400 font-bold">•</span>
                  <div>
                    <strong className="text-red-400">Interdiction d'assécher :</strong> On ne peut pas capturer toutes les graines
                    de l'adversaire si cela le prive de mouvement.
                  </div>
                </li>
              </ul>
            </section>

            {/* Close button at bottom */}
            <div className="flex justify-center pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-amber-500/50 text-sm"
              >
                Compris !
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
