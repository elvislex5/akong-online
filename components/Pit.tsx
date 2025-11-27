import React, { useMemo } from 'react';

interface PitProps {
  seeds: number;
  onClick: () => void;
  isOwner: boolean;
  isPlayable: boolean;
  pitIndex: number;
  isEditable?: boolean;
}

const Pit: React.FC<PitProps> = ({ seeds, onClick, isOwner, isPlayable, pitIndex, isEditable }) => {

  // Visual seeds generation with golden spheres - Reduced size for better overview
  const visualSeeds = useMemo(() => {
    const visuals = [];
    const maxVisuals = Math.min(seeds, 20); // Reduced from 25

    const isCongested = seeds > 8; // Reduced threshold from 12
    const sizeClass = isCongested ? 'w-2 sm:w-2.5 h-2 sm:h-2.5' : 'w-2.5 sm:w-3 md:w-3.5 h-2.5 sm:h-3 md:h-3.5';

    // Grid calculation
    const cols = Math.ceil(Math.sqrt(maxVisuals * 1.5));
    const rows = Math.ceil(maxVisuals / cols);

    const cellWidth = 80 / cols;
    const cellHeight = 70 / rows;

    for (let i = 0; i < maxVisuals; i++) {
      // Deterministic pseudo-randomness
      const seedRandom = (i * 9301 + pitIndex * 49297) % 233280;
      const rndX = (seedRandom % 100) / 100;
      const rndY = ((seedRandom * 17) % 100) / 100;

      const col = i % cols;
      const row = Math.floor(i / cols);

      const baseX = 10 + (col * cellWidth) + (cellWidth / 2);
      const baseY = 15 + (row * cellHeight) + (cellHeight / 2);

      const jitterX = (rndX - 0.5) * (cellWidth * 0.8);
      const jitterY = (rndY - 0.5) * (cellHeight * 0.8);

      const x = baseX + jitterX;
      const y = baseY + jitterY;

      const finalX = Math.max(5, Math.min(95, x));
      const finalY = Math.max(5, Math.min(95, y));

      visuals.push(
        <div
          key={i}
          className={`absolute ${sizeClass} rounded-full seed-3d animate-fade-in`}
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFE55C, #FFD700 50%, #B8860B)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(255, 215, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
            left: `${finalX}%`,
            top: `${finalY}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10 + i,
            animationDelay: `${i * 30}ms`
          }}
        />
      );
    }

    return visuals;
  }, [seeds, pitIndex]);

  const handleClick = (e: React.MouseEvent) => {
    if (isEditable || isPlayable) {
      onClick();
    }
  };

  return (
    <div className="flex flex-col items-center group relative px-1" id={`pit-${pitIndex}`}>

      {/* Count Badge - Amber Style */}
      <div
        className={`
            absolute ${isOwner ? '-bottom-3 sm:-bottom-4' : '-top-3 sm:-top-4'}
            min-w-[2rem] sm:min-w-[2.5rem] h-[2rem] sm:h-[2.5rem]
            flex items-center justify-center
            px-2 rounded-full
            font-black text-sm sm:text-base font-mono
            z-20 pointer-events-none
            transition-all duration-300
            ${isEditable
            ? 'glass-glow-emerald text-emerald-400 scale-110 animate-pulse'
            : seeds > 0
              ? 'text-amber-500 scale-110'
              : 'glass text-white-60'
          }
        `}
        style={seeds > 0 ? {
          background: 'rgba(139, 90, 43, 0.3)',
          boxShadow: '0 0 10px rgba(255, 140, 0, 0.4)',
          border: '1px solid rgba(255, 140, 0, 0.5)'
        } : {}}
      >
        {seeds}
      </div>

      {/* The Pit Container - Realistic 3D Cavity */}
      <button
        onClick={handleClick}
        disabled={!isPlayable && !isEditable}
        aria-label={`Case ${pitIndex + 1}, ${seeds} graine${seeds > 1 ? 's' : ''}${isPlayable ? ', jouable' : ''}`}
        aria-disabled={!isPlayable && !isEditable}
        style={{
          background: 'radial-gradient(ellipse at center, #1a0f08 0%, #0d0705 60%, #000000 100%)',
          boxShadow: `
            inset 0 8px 16px rgba(0, 0, 0, 0.9),
            inset 0 -2px 8px rgba(0, 0, 0, 0.6),
            inset 0 0 20px rgba(0, 0, 0, 0.7),
            0 2px 4px rgba(0, 0, 0, 0.5)
            ${isPlayable ? ', 0 0 20px rgba(255, 140, 0, 0.3), 0 0 40px rgba(255, 140, 0, 0.1)' : ''}
          `,
          border: isPlayable
            ? '2px solid rgba(255, 140, 0, 0.5)'
            : isEditable
              ? '2px solid rgba(16, 185, 129, 0.5)'
              : '2px solid rgba(139, 90, 43, 0.3)'
        }}
        className={`
          pit-3d relative
          w-[5.5rem] h-[4rem] sm:w-28 sm:h-20 md:w-32 md:h-24
          rounded-2xl
          transition-all duration-300 ease-out
          overflow-hidden
          transform-3d
          
          /* Focus */
          focus:outline-none focus:ring-4 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-black
          
          /* Cursor */
          ${isPlayable || isEditable ? 'cursor-pointer' : 'cursor-default'}
          
          /* Hover effect */
          ${isPlayable ? 'hover:scale-105' : ''}
        `}
      >
        {/* Inner shadow for depth */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(139, 90, 43, 0.05) 0%, transparent 50%)',
            boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.8)'
          }}>
        </div>

        {/* Seeds */}
        {visualSeeds}

        {/* Overflow indicator */}
        {seeds > 20 && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="rounded-lg px-2 py-1" style={{
              background: 'rgba(139, 90, 43, 0.5)',
              border: '1px solid rgba(255, 140, 0, 0.5)'
            }}>
              <span className="text-amber-400 text-xs font-bold">+{seeds - 20}</span>
            </div>
          </div>
        )}
      </button>

      {/* Edit Icon Overlay */}
      {isEditable && (
        <div className="absolute top-1 right-1 z-30 pointer-events-none">
          <div className="glass-glow-emerald rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg >
          </div >
        </div >
      )}
    </div>
  );
};

export default Pit;