import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  className?: string;
};

export const ThemeToggle: React.FC<Props> = ({ className = '' }) => {
  const { mode, toggle } = useTheme();
  const isDark = mode === 'dark';
  const cls = [
    'inline-flex items-center justify-center w-9 h-9 rounded-md',
    'text-ink-muted hover:text-ink hover:bg-surface',
    'transition-colors duration-150',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={toggle}
      className={cls}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
    </button>
  );
};
