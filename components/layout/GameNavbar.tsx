import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, X } from 'lucide-react';
import { Wordmark } from '../ui/Wordmark';

interface GameNavbarProps {
  isInGame: boolean;
  onShowProfile?: () => void;
  onQuitGame?: () => void;
}

const GameNavbar: React.FC<GameNavbarProps> = ({ isInGame, onShowProfile, onQuitGame }) => {
  const navigate = useNavigate();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const handleQuit = () => {
    if (isInGame) {
      setShowQuitConfirm(true);
    } else {
      navigate('/');
    }
  };

  const confirmQuit = () => {
    setShowQuitConfirm(false);
    onQuitGame?.();
    navigate('/');
  };

  return (
    <>
      <header
        role="banner"
        className="fixed top-0 left-0 right-0 z-40 bg-canvas/85 backdrop-blur-md border-b border-rule"
      >
        <nav
          aria-label="Navigation de jeu"
          className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14"
        >
          <Link
            to="/"
            aria-label="Songo — Accueil"
            onClick={(e) => {
              if (isInGame) {
                e.preventDefault();
                handleQuit();
              }
            }}
            className="flex items-center -ml-1 px-1"
          >
            <Wordmark size="md" />
          </Link>

          <div className="flex items-center gap-1">
            {onShowProfile && (
              <button
                type="button"
                onClick={onShowProfile}
                aria-label="Voir le profil"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
              >
                <User size={16} strokeWidth={1.75} />
                <span className="hidden sm:inline">Profil</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleQuit}
              aria-label={isInGame ? 'Quitter la partie' : 'Retour à l\'accueil'}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium text-danger hover:bg-danger/10 transition-colors duration-150"
            >
              <X size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">{isInGame ? 'Quitter' : 'Accueil'}</span>
            </button>
          </div>
        </nav>
      </header>

      {showQuitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm"
          onClick={() => setShowQuitConfirm(false)}
        >
          <div
            className="bg-surface border border-rule shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="kicker mb-3">Confirmer</p>
            <h3
              id="quit-title"
              className="font-display text-2xl text-ink mb-3"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Quitter la partie ?
            </h3>
            <p className="text-sm text-ink-muted mb-6 leading-relaxed">
              Votre progression ne sera pas sauvegardée. Cette action est définitive pour la partie en cours.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuitConfirm(false)}
                className="inline-flex items-center h-10 px-4 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmQuit}
                className="inline-flex items-center h-10 px-4 rounded-md text-sm font-medium bg-danger text-canvas hover:opacity-90 transition-opacity duration-150"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameNavbar;
