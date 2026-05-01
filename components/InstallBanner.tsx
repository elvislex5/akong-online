import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
      >
        <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Installer Songo</p>
            <p className="text-gray-400 text-xs mt-0.5">Jouer hors-ligne, accès rapide</p>
          </div>
          <button
            onClick={install}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors shrink-0"
          >
            Installer
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
