import React from 'react';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** Visual elevation. `flat` = no border, `bordered` = hairline rule, `raised` = subtle shadow */
  elevation?: 'flat' | 'bordered' | 'raised';
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Render as a different element (e.g. `article`, `section`) */
  as?: keyof React.JSX.IntrinsicElements;
};

const elevations = {
  flat: 'bg-surface',
  bordered: 'bg-surface border border-rule',
  raised: 'bg-surface border border-rule shadow-sm',
} as const;

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export const Card: React.FC<Props> = ({
  elevation = 'bordered',
  padding = 'md',
  as: Tag = 'div',
  className = '',
  ...rest
}) => {
  const cls = [elevations[elevation], paddings[padding], 'rounded-lg', className]
    .filter(Boolean)
    .join(' ');
  return React.createElement(Tag, { className: cls, ...rest });
};
