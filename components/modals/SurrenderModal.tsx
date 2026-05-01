import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag, Trophy } from 'lucide-react';
import { GameMode, Player } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardNavigation';
import type { MatchFormat } from '../../services/supabase';

interface SurrenderModalProps {
  isOpen: boolean;
  gameMode: GameMode | null;
  matchFormat?: MatchFormat;
  onClose: () => void;
  onSurrender: (player: Player) => void;
  onSurrenderMatch?: () => void;
}

export function SurrenderModal({
  isOpen,
  gameMode,
  matchFormat,
  onClose,
  onSurrender,
  onSurrenderMatch,
}: SurrenderModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [choice, setChoice] = useState<'game' | 'match' | null>(null);

  const isMatchSystem = matchFormat && matchFormat !== 'infinite' && onSurrenderMatch;

  useKeyboardShortcuts(
    [{ key: 'Escape', handler: onClose, description: 'Annuler' }],
    isOpen
  );

  const handleSurrender = () => {
    if (gameMode === GameMode.LocalMultiplayer) onSurrender(Player.One);
    else if (gameMode === GameMode.OnlineGuest) onSurrender(Player.Two);
    else onSurrender(Player.One);
  };

  const handleClose = () => {
    setChoice(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          ref={modalRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="surrender-title"
          aria-describedby="surrender-desc"
          className="bg-surface border border-rule shadow-lg w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <p className="kicker mb-3 text-danger">Abandon</p>
            <h2
              id="surrender-title"
              className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-4"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40', fontSize: 'clamp(1.875rem, 4vw, 2.5rem)' }}
            >
              {isMatchSystem && choice === null
                ? 'Abandonner quoi ?'
                : choice === 'match'
                  ? 'Abandonner le match ?'
                  : 'Abandonner la partie ?'}
            </h2>

            <p id="surrender-desc" className="text-sm text-ink-muted mb-8 leading-relaxed">
              {isMatchSystem && choice === null
                ? 'Vous pouvez perdre seulement la partie en cours, ou tout le match.'
                : 'Cette action est irréversible. Votre adversaire remportera la partie.'}
            </p>

            {/* Match-system: choice between game and match */}
            {isMatchSystem && choice === null && (
              <div className="grid grid-cols-1 gap-px bg-rule border border-rule mb-6">
                <ChoiceRow
                  icon={Flag}
                  title="Cette partie seulement"
                  sub="Le match continue. Vous perdez la manche en cours."
                  onClick={() => setChoice('game')}
                />
                <ChoiceRow
                  icon={Trophy}
                  title="Le match entier"
                  sub="Vous perdez l'ensemble du match."
                  onClick={() => setChoice('match')}
                />
              </div>
            )}

            {/* Confirm buttons */}
            {(!isMatchSystem || choice !== null) && (
              <div className="flex flex-col sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (choice === 'match' && onSurrenderMatch) onSurrenderMatch();
                    else handleSurrender();
                  }}
                  className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-danger text-canvas hover:opacity-90 transition-opacity duration-150"
                >
                  Oui, abandonner
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-accent hover:text-accent transition-colors duration-150"
                >
                  Continuer la partie
                </button>
              </div>
            )}

            {/* Back to choice */}
            {isMatchSystem && choice !== null && (
              <button
                type="button"
                onClick={() => setChoice(null)}
                className="mt-6 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors duration-150"
              >
                <ArrowLeft size={12} strokeWidth={1.75} />
                Retour au choix
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const ChoiceRow: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  sub: string;
  onClick: () => void;
}> = ({ icon: Icon, title, sub, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-canvas p-5 flex items-center gap-4 hover:bg-surface transition-colors duration-150 text-left"
  >
    <Icon size={18} strokeWidth={1.5} className="text-ink-subtle shrink-0" />
    <div className="min-w-0">
      <p
        className="font-display text-lg text-ink"
        style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
      >
        {title}
      </p>
      <p className="text-xs text-ink-muted mt-0.5">{sub}</p>
    </div>
  </button>
);
