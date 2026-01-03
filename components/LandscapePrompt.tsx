import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw } from 'lucide-react';

interface LandscapePromptProps {
  isGameActive: boolean;
}

export default function LandscapePrompt({ isGameActive }: LandscapePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024; // Mobile si largeur < 1024px
      const isPortrait = window.innerHeight > window.innerWidth; // Portrait si hauteur > largeur

      // Afficher le prompt si : mobile + portrait + partie active
      setShowPrompt(isMobile && isPortrait && isGameActive);
    };

    // Vérifier à l'initialisation
    checkOrientation();

    // Écouter les changements d'orientation et de taille
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isGameActive]);

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6"
        >
          {/* Rotating phone icon animation */}
          <motion.div
            animate={{ rotate: [0, -90, -90, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 0.5,
              times: [0, 0.3, 0.7, 1],
            }}
            className="mb-8"
          >
            <RotateCw className="w-20 h-20 text-emerald-400" />
          </motion.div>

          {/* Message */}
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Mode Paysage Recommandé
          </h2>
          <p className="text-gray-300 text-center max-w-md mb-6">
            Pour une meilleure expérience de jeu, veuillez tourner votre appareil en mode paysage.
          </p>

          {/* Dismiss button (optional) */}
          <button
            onClick={() => setShowPrompt(false)}
            className="px-6 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-emerald-400 transition-colors"
          >
            Continuer en mode portrait
          </button>

          {/* Visual phone representation */}
          <div className="mt-8 flex gap-8 items-center">
            {/* Portrait phone (red X) */}
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-24 border-4 border-red-500/50 rounded-lg mb-2"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-500 text-4xl font-bold">✕</div>
                </div>
              </div>
              <span className="text-xs text-gray-500">Portrait</span>
            </div>

            {/* Arrow */}
            <div className="text-emerald-400 text-3xl">→</div>

            {/* Landscape phone (green check) */}
            <div className="text-center">
              <div className="relative">
                <div className="w-24 h-16 border-4 border-emerald-500/50 rounded-lg mb-2"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-emerald-500 text-4xl font-bold">✓</div>
                </div>
              </div>
              <span className="text-xs text-gray-500">Paysage</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
