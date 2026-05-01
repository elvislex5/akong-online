import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';

interface DrawOfferModalProps {
  isOpen: boolean;
  opponentName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function DrawOfferModal({ isOpen, opponentName, onAccept, onDecline }: DrawOfferModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useKeyboardShortcuts(
    [{ key: 'Escape', handler: onDecline, description: 'Refuser la nulle' }],
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
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          ref={modalRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="draw-offer-title"
          className="bg-surface border border-rule shadow-lg w-full max-w-md"
        >
          <div className="p-8">
            <p className="kicker mb-3">Proposition</p>
            <h2
              id="draw-offer-title"
              className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-3"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40', fontSize: 'clamp(1.875rem, 4vw, 2.5rem)' }}
            >
              Match nul ?
            </h2>
            <p className="text-sm text-ink-muted mb-8 leading-relaxed">
              <span className="text-ink font-medium">{opponentName}</span> propose la nulle.
              Acceptez-vous d'arrêter la partie sur cette position ?
            </p>

            <div className="flex flex-col sm:flex-row-reverse gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
              >
                Accepter la nulle
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-accent hover:text-accent transition-colors duration-150"
              >
                Refuser
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
