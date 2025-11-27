import React from 'react';
import { motion } from 'framer-motion';

interface LogoIconProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ size = 48, animate = false, className = '' }) => {
  const variants = animate ? {
    initial: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: { duration: 20, repeat: Infinity, ease: 'linear' }
    }
  } : {};

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(animate ? { variants, initial: 'initial', animate: 'animate' } : {})}
    >
      {/* Outer hexagon */}
      <path
        d="M50 5 L85 27.5 L85 72.5 L50 95 L15 72.5 L15 27.5 Z"
        stroke="url(#gradient1)"
        strokeWidth="3"
        fill="none"
      />

      {/* Inner geometric pattern */}
      <circle cx="50" cy="50" r="25" stroke="url(#gradient2)" strokeWidth="2" fill="none" />

      {/* Central "A" stylized */}
      <path
        d="M50 30 L40 65 M50 30 L60 65 M43 55 L57 55"
        stroke="url(#gradient3)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Decorative dots (representing seeds) */}
      <circle cx="50" cy="20" r="2" fill="#FFD700" />
      <circle cx="72" cy="35" r="2" fill="#FFD700" />
      <circle cx="72" cy="65" r="2" fill="#FFD700" />
      <circle cx="50" cy="80" r="2" fill="#FFD700" />
      <circle cx="28" cy="65" r="2" fill="#FFD700" />
      <circle cx="28" cy="35" r="2" fill="#FFD700" />

      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF8C00" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
};

export default LogoIcon;
