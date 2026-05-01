import React from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../ui/Wordmark';

type Column = {
  heading: string;
  links: { to: string; label: string; external?: boolean }[];
};

const COLUMNS: Column[] = [
  {
    heading: 'Jeu',
    links: [
      { to: '/game', label: 'Jouer' },
      { to: '/watch', label: 'Regarder' },
      { to: '/lobby', label: 'Lobby' },
      { to: '/tournaments', label: 'Tournois' },
      { to: '/games', label: 'Archives' },
      { to: '/leaderboard', label: 'Classement' },
    ],
  },
  {
    heading: 'Apprendre',
    links: [
      { to: '/rules', label: 'Règles' },
      { to: '/learn', label: 'Leçons' },
      { to: '/puzzles', label: 'Puzzles' },
    ],
  },
  {
    heading: 'Communauté',
    links: [
      { to: '/friends', label: 'Amis' },
      { to: '/history', label: 'Historique' },
    ],
  },
  {
    heading: 'À propos',
    links: [
      { to: '/about', label: 'Le Songo' },
      { to: '/about#history', label: 'Histoire' },
      { to: '/about#variants', label: 'Variantes' },
    ],
  },
];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule mt-auto">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Wordmark size="md" />
            <p className="mt-3 text-sm text-ink-muted leading-relaxed max-w-xs">
              Le mancala africain en ligne. Multijoueur, IA, leçons.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="kicker mb-3">{col.heading}</h3>
              <ul className="space-y-2" role="list">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-ink-muted hover:text-ink transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Hairline + meta row */}
        <div className="mt-12 pt-6 border-t border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-ink-subtle">
            © {year} Songo. Jeu traditionnel d&apos;Afrique centrale.
          </p>
          <p className="text-xs text-ink-subtle italic font-display" style={{ fontVariationSettings: '"opsz" 14, "SOFT" 50' }}>
            Variantes Mpem · Beti · Ngonn
          </p>
        </div>
      </div>
    </footer>
  );
};
