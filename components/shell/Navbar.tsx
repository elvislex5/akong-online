import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Wordmark } from '../ui/Wordmark';
import { OnlineIndicator } from './OnlineIndicator';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type NavItem = { to: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { to: '/game', label: 'Jouer' },
  { to: '/watch', label: 'Regarder' },
  { to: '/tournaments', label: 'Tournois' },
  { to: '/friends', label: 'Amis' },
  { to: '/learn', label: 'Apprendre' },
  { to: '/lobby', label: 'Lobby' },
  { to: '/rules', label: 'Règles' },
];

const linkBase =
  'relative inline-flex items-center h-full px-3 text-sm font-medium ' +
  'text-ink-muted hover:text-ink transition-colors duration-150';

const activeUnderline =
  'after:absolute after:left-3 after:right-3 after:bottom-[-1px] after:h-px after:bg-accent';

type Props = {
  isAuthenticated: boolean;
};

export const Navbar: React.FC<Props> = ({ isAuthenticated }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useFocusTrap<HTMLDivElement>(open);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <header
        role="banner"
        className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-md border-b border-rule"
      >
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 max-w-[1200px]"
        >
          {/* Brand */}
          <Link to="/" aria-label="Songo — Accueil" className="flex items-center -ml-1 px-1">
            <Wordmark size="md" />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center h-full ml-8 mr-auto" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className="h-full">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [linkBase, isActive && `text-ink ${activeUnderline}`].filter(Boolean).join(' ')
                  }
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Right cluster */}
          <div className="hidden md:flex items-center gap-1">
            <OnlineIndicator />
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/profile"
                className="ml-1 inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
              >
                <User size={16} strokeWidth={1.75} />
                <span>Profil</span>
              </Link>
            ) : (
              <Link
                to="/game"
                className="ml-1 inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
              >
                Se connecter
              </Link>
            )}
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            aria-label="Ouvrir le menu"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 -mr-1 text-ink-muted hover:text-ink"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="fixed top-0 right-0 z-50 h-full w-[min(320px,85vw)] bg-surface border-l border-rule md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-rule">
              <Wordmark size="md" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="inline-flex items-center justify-center w-9 h-9 -mr-1 text-ink-muted hover:text-ink"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 py-4" role="list">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      [
                        'flex items-center h-12 px-3 rounded-md text-md',
                        isActive
                          ? 'text-ink bg-canvas border-l-2 border-accent pl-[10px]'
                          : 'text-ink-muted hover:text-ink hover:bg-canvas',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="border-t border-rule p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <OnlineIndicator />
              </div>
              {isAuthenticated ? (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-ink hover:bg-canvas"
                >
                  <User size={16} strokeWidth={1.75} />
                  <span>Profil</span>
                </Link>
              ) : (
                <Link
                  to="/game"
                  className="inline-flex items-center h-10 px-4 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover"
                >
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
