import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import LogoIcon from '../icons/LogoIcon';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface UnifiedNavbarProps {
  isAuthenticated: boolean;
  transparent?: boolean;
}

const UnifiedNavbar: React.FC<UnifiedNavbarProps> = ({
  isAuthenticated,
  transparent = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Accessibility: Focus trap for mobile menu
  const mobileMenuRef = useFocusTrap<HTMLDivElement>(isMobileMenuOpen);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Accueil', enabled: true },
    { path: '/game', label: 'Jouer', enabled: true },
    { path: '/lobby', label: 'Lobby', enabled: true },
    { path: '/rules', label: 'Règles', enabled: true },
  ];

  const handleNavClick = (e: React.MouseEvent, link: typeof navLinks[0]) => {
    if (!link.enabled) {
      e.preventDefault();
      toast('Fonctionnalité en cours de développement\n\nLe Lobby sera bientôt disponible !', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          color: '#fbbf24',
          fontSize: '16px',
          fontWeight: '600',
        },
      });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${transparent
        ? 'bg-transparent'
        : 'bg-black/80 backdrop-blur-xl border-b border-white/10'
        }`}
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-3 group focus-visible-ring rounded-lg"
            aria-label="AKÔNG - Retour à l'accueil"
          >
            <LogoIcon size={48} animate={false} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              AKÔNG
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => handleNavClick(e, link)}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 focus-visible-ring ${isActive(link.path)
                  ? 'text-amber-400'
                  : link.enabled
                    ? 'text-white/70 hover:text-white'
                    : 'text-white/40 cursor-not-allowed'
                  }`}
              >
                {isActive(link.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/50"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Desktop Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && (
              <Link
                to="/profile"
                aria-current={isActive('/profile') ? 'page' : undefined}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 shadow-lg focus-visible-ring ${isActive('/profile')
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/50'
                  : 'bg-gradient-to-r from-amber-500/10 to-orange-600/10 hover:from-amber-500 hover:to-orange-600 text-white border border-amber-500/30 hover:border-transparent'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profil
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors focus-visible-ring"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <motion.div
              animate={isMobileMenuOpen ? 'open' : 'closed'}
              className="w-6 h-5 flex flex-col justify-between"
              aria-hidden="true"
            >
              <motion.span
                variants={{
                  closed: { rotate: 0, y: 0 },
                  open: { rotate: 45, y: 8 }
                }}
                className="w-full h-0.5 bg-amber-400 block rounded"
              />
              <motion.span
                variants={{
                  closed: { opacity: 1 },
                  open: { opacity: 0 }
                }}
                className="w-full h-0.5 bg-amber-400 block rounded"
              />
              <motion.span
                variants={{
                  closed: { rotate: 0, y: 0 },
                  open: { rotate: -45, y: -8 }
                }}
                className="w-full h-0.5 bg-amber-400 block rounded"
              />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10"
          >
            <div className="px-4 py-6 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.path}
                    onClick={(e) => {
                      handleNavClick(e, link);
                      if (link.enabled) {
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    aria-current={isActive(link.path) ? 'page' : undefined}
                    className={`block px-6 py-4 rounded-xl font-semibold transition-all focus-visible-ring ${isActive(link.path)
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-400'
                      : link.enabled
                        ? 'text-white/70 hover:bg-white/10'
                        : 'text-white/40 cursor-not-allowed'
                      }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              {isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.1 }}
                >
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive('/profile') ? 'page' : undefined}
                    className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-semibold text-white flex items-center justify-center gap-2 mt-4 focus-visible-ring"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mon Profil
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default UnifiedNavbar;
