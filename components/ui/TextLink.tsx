import React from 'react';
import { Link as RouterLink, type LinkProps } from 'react-router-dom';

type Variant = 'inline' | 'nav' | 'subtle';

type Props = LinkProps & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  /** Prose link — underlined, indigo on hover */
  inline:
    'text-ink underline decoration-rule-strong underline-offset-[3px] ' +
    'hover:decoration-accent hover:text-accent transition-colors duration-150',
  /** Navbar link — uppercase tracked, no underline */
  nav:
    'text-ink-muted hover:text-ink transition-colors duration-150 ' +
    'text-sm font-medium tracking-wide',
  /** Subdued link — used in metadata, footers */
  subtle:
    'text-ink-subtle hover:text-ink transition-colors duration-150 text-sm',
};

export const TextLink: React.FC<Props> = ({ variant = 'inline', className = '', ...rest }) => {
  const cls = [variants[variant], className].filter(Boolean).join(' ');
  return <RouterLink className={cls} {...rest} />;
};
