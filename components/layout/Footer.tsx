import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="glass-navbar border-t border-gold/30 mt-auto relative z-20" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-glow-gold rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-black text-gold shimmer-gold" aria-hidden="true">A</span>
              </div>
              <span className="text-xl font-black neon-text-gold text-glow-gold-sm shimmer-gold">
                AKÔNG
              </span>
            </div>
            <p className="text-white-60 text-sm leading-relaxed">
              Le jeu de stratégie africain millénaire, maintenant en ligne.
              Capturez les graines et dominez le plateau !
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider text-glow-gold-sm">
              Navigation
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-white-60 hover:text-gold transition-colors text-sm glass-button inline-block px-3 py-1 rounded-lg hover:glass-glow-gold focus-visible-ring"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  to="/game"
                  className="text-white-60 hover:text-gold transition-colors text-sm glass-button inline-block px-3 py-1 rounded-lg hover:glass-glow-gold focus-visible-ring"
                >
                  Jouer
                </Link>
              </li>
            </ul>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider text-glow-gold-sm">
              À propos
            </h3>
            <p className="text-white-60 text-sm leading-relaxed">
              Akông est une adaptation moderne du jeu traditionnel Songo (variante MPEM).
              Développé avec passion pour préserver et partager ce patrimoine culturel.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gold/20">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-white-40 text-sm">
              © {currentYear} Akông. Tous droits réservés.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-white-40 text-xs glass px-3 py-1 rounded-full">
                ETAO
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
