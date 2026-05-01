import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 font-medium tracking-tight ' +
  'transition-[background-color,color,border-color,opacity] duration-200 ease-out ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover ' +
    'border border-accent hover:border-accent-hover',
  secondary:
    'bg-surface text-ink border border-rule-strong hover:bg-surface-2 hover:border-ink-subtle',
  ghost:
    'bg-transparent text-ink-muted hover:text-ink hover:bg-surface border border-transparent',
  danger:
    'bg-transparent text-danger border border-danger/40 hover:bg-danger hover:text-canvas',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-sm',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-md',
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', ...rest }, ref) => {
    const cls = [base, variants[variant], sizes[size], fullWidth && 'w-full', className]
      .filter(Boolean)
      .join(' ');
    return <button ref={ref} className={cls} {...rest} />;
  }
);

Button.displayName = 'Button';
