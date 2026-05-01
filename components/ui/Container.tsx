import React from 'react';

type Width = 'narrow' | 'reading' | 'wide' | 'full';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  width?: Width;
  as?: keyof React.JSX.IntrinsicElements;
};

const widths: Record<Width, string> = {
  narrow:  'max-w-[640px]',   // narrow editorial column
  reading: 'max-w-[760px]',   // long-form reading
  wide:    'max-w-[1200px]',  // app shell
  full:    'max-w-none',
};

export const Container: React.FC<Props> = ({
  width = 'wide',
  as: Tag = 'div',
  className = '',
  ...rest
}) => {
  const cls = [widths[width], 'mx-auto px-4 sm:px-6 lg:px-8', className]
    .filter(Boolean)
    .join(' ');
  return React.createElement(Tag, { className: cls, ...rest });
};
