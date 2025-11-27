import React from 'react';

interface AnimatedGradientProps {
  variant?: 'hero' | 'subtle' | 'vibrant';
}

const AnimatedGradient: React.FC<AnimatedGradientProps> = ({ variant = 'hero' }) => {
  const gradients = {
    hero: 'from-amber-900/30 via-orange-900/20 to-gray-900/10',
    subtle: 'from-gray-900/50 via-gray-800/30 to-transparent',
    vibrant: 'from-amber-600/20 via-orange-600/10 to-purple-900/20',
  };

  return (
    <>
      {/* Main animated gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradients[variant]} opacity-70`}
        style={{
          animation: 'gradient-shift 15s ease infinite',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Radial glow overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)',
          animation: 'pulse-glow 8s ease-in-out infinite',
        }}
      />

      {/* Moving spotlight effect */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255, 215, 0, 0.3) 0%, transparent 40%)',
          animation: 'spotlight-move 20s ease-in-out infinite',
        }}
      />

      {/* CSS Keyframes injected via style tag */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @keyframes spotlight-move {
          0%, 100% {
            --spotlight-x: 20%;
            --spotlight-y: 30%;
          }
          25% {
            --spotlight-x: 80%;
            --spotlight-y: 40%;
          }
          50% {
            --spotlight-x: 60%;
            --spotlight-y: 70%;
          }
          75% {
            --spotlight-x: 30%;
            --spotlight-y: 60%;
          }
        }
      `}</style>
    </>
  );
};

export default AnimatedGradient;
