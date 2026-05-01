import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, X } from 'lucide-react';

interface LandscapePromptProps {
  isGameActive: boolean;
}

const DISMISS_KEY = 'akong_landscape_dismissed';

export default function LandscapePrompt({ isGameActive }: LandscapePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  // Try to lock orientation when game starts
  useEffect(() => {
    if (!isGameActive) {
      try { (screen?.orientation as any)?.unlock?.(); } catch { /* not supported */ }
      return;
    }

    const orientation = screen?.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (orientation?.lock) {
      orientation.lock('landscape-primary').catch(() => {
        // iOS et autres : le verrou n'est pas supporté → le toast s'affichera
      });
    }
  }, [isGameActive]);

  useEffect(() => {
    if (dismissed) return;

    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowPrompt(isMobile && isPortrait && isGameActive);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isGameActive, dismissed]);

  // Auto-hide after 6 seconds
  useEffect(() => {
    if (!showPrompt) return;
    const timer = setTimeout(() => setShowPrompt(false), 6000);
    return () => clearTimeout(timer);
  }, [showPrompt]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }, []);

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -32 }}
          transition={{ duration: 0.2 }}
          className="fixed top-3 left-3 right-3 z-50 flex items-center gap-3 px-3 py-2.5 bg-surface border border-rule shadow-md"
          role="status"
        >
          <motion.div
            animate={{ rotate: [0, -90, -90, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, times: [0, 0.3, 0.7, 1] }}
            aria-hidden="true"
          >
            <RotateCw size={16} strokeWidth={1.75} className="text-accent" />
          </motion.div>

          <p className="text-xs sm:text-sm text-ink-muted flex-1">
            Tournez en <span className="text-ink font-medium">mode paysage</span> pour une meilleure expérience.
          </p>

          <button
            onClick={dismiss}
            className="inline-flex items-center justify-center w-7 h-7 text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
            aria-label="Fermer"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
