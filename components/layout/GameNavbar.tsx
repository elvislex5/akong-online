import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    if (onQuitGame) {
      onQuitGame();
    }
    navigate('/');
  };

  return (
    <>
      {/* Minimal Game Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo - Return to Home */}
            <Link
              to="/"
              className="flex items-center space-x-2 group hover:opacity-80 transition-opacity"
              onClick={(e) => {
                if (isInGame) {
                  e.preventDefault();
                  handleQuit();
                }
              }}
            >
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                <span className="text-2xl font-black text-amber-500">Â</span>
              </div>
              <span className="text-xl font-black text-amber-500 tracking-tight hidden sm:block">
                AKÔNG
              </span>
            </Link>

            {/* Right Side Buttons */}
            <div className="flex items-center space-x-2">
              {/* Profile Button */}
              {onShowProfile && (
                <button
                  onClick={onShowProfile}
                  aria-label="Voir le profil"
                  className="px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-amber-500 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline text-sm font-semibold">Profil</span>
                </button>
              )}

              {/* Quit/Home Button */}
              <button
                onClick={handleQuit}
                className="px-3 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors flex items-center space-x-2"
                aria-label={isInGame ? "Quitter la partie" : "Retour à l'accueil"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline text-sm font-semibold">
                  {isInGame ? 'Quitter' : 'Accueil'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border-2 border-amber-500/30 shadow-2xl">
            <h3 className="text-2xl font-black text-amber-500 mb-4">Quitter la partie ?</h3>
            <p className="text-gray-300 mb-6">
              Êtes-vous sûr de vouloir quitter la partie en cours ? Votre progression ne sera pas sauvegardée.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmQuit}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
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
