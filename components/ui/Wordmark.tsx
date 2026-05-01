import React from 'react';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
} as const;

/**
 * "Songo" wordmark — Fraunces, italic, dialed-up SOFT axis for warmth.
 * Single typographic mark, no icon. Lichess-style restraint.
 */
export const Wordmark: React.FC<Props> = ({ size = 'md', className = '' }) => {
  const cls = [
    'font-display italic tracking-[-0.04em] text-ink leading-none',
    'inline-block',
    sizes[size],
    className,
  ].join(' ');
  return (
    <span
      className={cls}
      style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 0' }}
    >
      Songo
    </span>
  );
};
