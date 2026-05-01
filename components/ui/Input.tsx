import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ invalid, className = '', ...rest }, ref) => {
    const cls = [
      'w-full h-10 px-3 rounded-md',
      'bg-surface text-ink placeholder:text-ink-subtle',
      'border',
      invalid ? 'border-danger' : 'border-rule-strong',
      'focus:outline-none focus:border-accent',
      'transition-colors duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return <input ref={ref} className={cls} {...rest} />;
  }
);

Input.displayName = 'Input';
