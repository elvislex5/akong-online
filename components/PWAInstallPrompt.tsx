import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Détecte iOS Safari (pas de beforeinstallprompt sur iOS)
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !('MSStream' in window);

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as any).standalone === true);

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    // Déjà installée (mode standalone)
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // iOS : pas de beforeinstallprompt, on affiche les instructions manuelles
    if (isIOS()) {
      setPlatform('ios');
      const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
      if (dismissedTime) {
        const days = (Date.now() - parseInt(dismissedTime)) / 86400000;
        if (days < 7) return;
      }
      setTimeout(() => setShowPrompt(true), 4000);
      return;
    }

    // Android / Chrome : beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('android');
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    await deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-80"
      >
        <div className="bg-gray-900/95 backdrop-blur-sm p-4 rounded-2xl border border-amber-500/30 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              {platform === 'ios' ? (
                <Share className="w-6 h-6 text-white" />
              ) : (
                <Download className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white mb-1">Installer Songo</h3>

              {platform === 'ios' ? (
                <p className="text-sm text-gray-300 mb-3">
                  Appuyez sur <span className="text-amber-400 font-semibold">Partager</span> puis{' '}
                  <span className="text-amber-400 font-semibold">« Sur l'écran d'accueil »</span>{' '}
                  dans Safari.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-300 mb-3">
                    Accès rapide, mode plein écran et jeu hors ligne.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleInstall}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-orange-700 transition-all"
                    >
                      Installer
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      Plus tard
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
