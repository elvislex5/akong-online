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
  
  // Visual seeds generation using useMemo to prevent flickering on re-renders unless seeds change
  const visualSeeds = useMemo(() => {
    const visuals = [];
    // Show up to 30 seeds visually. Beyond that, the count badge handles it.
    const maxVisuals = Math.min(seeds, 30); 
    
    // Dynamic sizing based on congestion, with mobile responsiveness
    const isCongested = seeds > 12;
    const sizeClass = isCongested ? 'w-2 sm:w-2.5 h-2 sm:h-2.5' : 'w-3 sm:w-3.5 h-3 sm:h-3.5';
    
    // Grid calculation to distribute seeds evenly across the rectangular area
    // The pit is roughly 4:3 aspect ratio. 
    // We try to define a flexible grid based on count.
    const cols = Math.ceil(Math.sqrt(maxVisuals * 1.5));
    const rows = Math.ceil(maxVisuals / cols);
    
    const cellWidth = 80 / cols; // 80% of width available
    const cellHeight = 70 / rows; // 70% of height available

    for (let i = 0; i < maxVisuals; i++) {
      // Deterministic pseudo-randomness based on index and pitIndex to keep positions stable
      const seedRandom = (i * 9301 + pitIndex * 49297) % 233280;
      const rndX = (seedRandom % 100) / 100; // 0 to 1
      const rndY = ((seedRandom * 17) % 100) / 100; // 0 to 1
      
      // Grid Position
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Base position (centered in cell) + Jitter
      // We start at 10% padding
      const baseX = 10 + (col * cellWidth) + (cellWidth / 2);
      const baseY = 15 + (row * cellHeight) + (cellHeight / 2);
      
      // Jitter range (move up to 40% of cell size away from center)
      const jitterX = (rndX - 0.5) * (cellWidth * 0.8);
      const jitterY = (rndY - 0.5) * (cellHeight * 0.8);
      
      const x = baseX + jitterX;
      const y = baseY + jitterY;
      
      // Clamp to ensure inside
      const finalX = Math.max(5, Math.min(95, x));
      const finalY = Math.max(5, Math.min(95, y));

      visuals.push(
        <div
          key={i}
          className={`absolute ${sizeClass} rounded-full shadow-[1px_1px_2px_rgba(0,0,0,0.6)] border border-gray-400/30`}
          style={{ 
              backgroundColor: '#262626', // Dark grey/black
              backgroundImage: 'radial-gradient(circle at 30% 30%, #525252, #171717)', // Metallic shine
              left: `${finalX}%`, 
              top: `${finalY}%`, 
              transform: 'translate(-50%, -50%)',
              zIndex: 10 + i // Slight stacking order
          }}
        />
      );
    }
    
    if (seeds > 30) {
        visuals.push(
            <div key="overflow" className="absolute inset-0 flex items-center justify-center z-0">
               <div className="w-full h-full bg-black/10 blur-sm rounded-lg"></div>
            </div>
        )
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
      
      {/* Count Badge */}
      <div
        className={`
            absolute ${isOwner ? '-bottom-2 sm:-bottom-3' : '-top-2 sm:-top-3'}
            min-w-[1.5rem] sm:min-w-[1.8rem] h-[1.5rem] sm:h-[1.8rem]
            flex items-center justify-center
            px-1 sm:px-1.5
            rounded-full
            font-bold text-xs sm:text-sm font-mono
            z-20
            shadow-md border border-gray-400 sm:border-2
            pointer-events-none
            transition-transform duration-200
            ${isEditable
                ? 'bg-blue-600 text-white scale-110 border-white'
                : 'bg-black text-white'
            }
        `}
      >
          {seeds}
      </div>

      {/* The Pit Container */}
      <button
        onClick={handleClick}
        disabled={!isPlayable && !isEditable}
        aria-label={`Case ${pitIndex + 1}, ${seeds} graine${seeds > 1 ? 's' : ''}${isPlayable ? ', jouable' : ''}`}
        aria-disabled={!isPlayable && !isEditable}
        className={`
          relative
          w-[5rem] h-[3.5rem] sm:w-24 sm:h-16 md:w-28 md:h-20
          rounded-lg
          transition-all duration-200 ease-in-out
          overflow-hidden

          /* Background: Specific Light Blue-Grey */
          bg-[#d7e3e8]

          /* Inner Shadow for depth */
          shadow-[inset_0px_5px_10px_rgba(0,0,0,0.25),inset_0px_-2px_4px_rgba(255,255,255,0.7)]

          /* Borders */
          border-t border-white/60
          border-b border-gray-400

          /* Focus Indicator */
          focus:outline-none focus:ring-4 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900

          ${isPlayable
            ? 'ring-2 ring-amber-400 cursor-pointer brightness-105'
            : ''
          }
          ${isEditable
            ? 'cursor-pointer ring-2 ring-blue-500 animate-pulse'
            : ''
          }
          ${!isPlayable && !isEditable ? 'cursor-default' : ''}
        `}
      >
        {visualSeeds}
      </button>

      {/* Edit Icon Overlay */}
      {isEditable && (
           <div className="absolute top-1 right-1 z-30 pointer-events-none">
             <div className="bg-blue-600 rounded-full p-0.5 shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                 <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
               </svg>
             </div>
           </div>
      )}
    </div>
  );
};

export default Pit;