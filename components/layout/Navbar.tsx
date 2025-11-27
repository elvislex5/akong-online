import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  isAuthenticated: boolean;
  onShowProfile?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onShowProfile }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Accueil' },
    { path: '/game', label: 'Jouer' },
    { path: '/lobby', label: 'Lobby' },
    { path: '/rules', label: 'Règles' },
  ];

  return (
    <nav className="glass-navbar fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo - Neon Style */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 glass-glow-gold rounded-xl flex items-center justify-center transform group-hover:scale-110 group-hover-glow-gold transition-all duration-300">
              <span className="text-3xl sm:text-4xl font-black neon-text-gold">Â</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black neon-text-gold tracking-tight hidden sm:block shimmer-gold">
              AKÔNG
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${isActive(link.path)
                    ? 'glass-glow-gold neon-text-gold scale-105'
                    : 'glass text-white-80 hover:text-gold hover:glass-glow-gold hover:scale-105'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Profile Button */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated && onShowProfile && (
              <button
                onClick={onShowProfile}
                aria-label="Voir le profil utilisateur"
                className="neon-button px-5 py-2.5 rounded-xl flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profil</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl glass hover:glass-glow-gold transition-all duration-300"
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Animated Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-dark border-t border-gold/30 animate-slide-in-down">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link, index) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-5 py-3 rounded-xl font-semibold transition-all duration-300 animate-fade-in-up ${isActive(link.path)
                    ? 'glass-glow-gold neon-text-gold'
                    : 'glass text-white-80 hover:text-gold hover:glass-glow-gold'
                  }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated && onShowProfile && (
              <button
                onClick={() => {
                  onShowProfile();
                  setIsMobileMenuOpen(false);
                }}
                aria-label="Voir le profil utilisateur"
                className="w-full neon-button px-5 py-3 rounded-xl flex items-center justify-center space-x-2 animate-fade-in-up"
                style={{ animationDelay: `${navLinks.length * 50}ms` }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profil</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
