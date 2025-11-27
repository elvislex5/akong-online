import React, { useEffect, useState } from 'react';

interface HandProps {
  pitIndex: number | null;
  seedCount: number;
  isActive: boolean;
}

type HandPose = 'open' | 'closed' | 'grabbing';

const Hand: React.FC<HandProps> = ({ pitIndex, seedCount, isActive }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [pose, setPose] = useState<HandPose>('open');

  useEffect(() => {
    console.log('[Hand] Props:', { pitIndex, seedCount, isActive });

    // Change pose based on seed count
    if (seedCount === 0) {
      setPose('open');
    } else if (seedCount > 3) {
      setPose('closed');
    } else {
      setPose('grabbing');
    }

    const updatePosition = () => {
      if (pitIndex === null) return;

      // Retry logic to wait for DOM to be ready
      let attempts = 0;
      const maxAttempts = 10;

      const tryFindElement = () => {
        const element = document.getElementById(`pit-${pitIndex}`);
        console.log('[Hand] Attempt', attempts + 1, '- Looking for pit element:', `pit-${pitIndex}`, element);

        if (element) {
          const rect = element.getBoundingClientRect();
          const newPos = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          console.log('[Hand] Position updated:', newPos);
          setPosition(newPos);
          setVisible(true);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryFindElement, 50); // Retry after 50ms
        } else {
          console.error('[Hand] Could not find element after', maxAttempts, 'attempts');
        }
      };

      tryFindElement();
    };

    if (isActive && pitIndex !== null) {
      console.log('[Hand] ACTIVATING - pitIndex:', pitIndex);
      updatePosition();

      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    } else {
      console.log('[Hand] HIDING');
      setVisible(false);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [pitIndex, isActive, seedCount]);

  // SVG Hand paths for different poses
  const renderHandSVG = () => {
    const skinTone = '#FFD4A3'; // Natural skin tone
    const shadowColor = '#D4A373';

    if (pose === 'open') {
      // Open hand - palm facing viewer
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Palm */}
          <ellipse cx="32" cy="40" rx="16" ry="20" fill={skinTone} stroke={shadowColor} strokeWidth="2"/>
          {/* Thumb */}
          <ellipse cx="18" cy="38" rx="6" ry="10" fill={skinTone} stroke={shadowColor} strokeWidth="1.5" transform="rotate(-20 18 38)"/>
          {/* Index finger */}
          <rect x="26" y="14" width="6" height="20" rx="3" fill={skinTone} stroke={shadowColor} strokeWidth="1.5"/>
          {/* Middle finger */}
          <rect x="32" y="10" width="6" height="24" rx="3" fill={skinTone} stroke={shadowColor} strokeWidth="1.5"/>
          {/* Ring finger */}
          <rect x="38" y="14" width="6" height="20" rx="3" fill={skinTone} stroke={shadowColor} strokeWidth="1.5"/>
          {/* Pinky */}
          <rect x="44" y="18" width="5" height="18" rx="2.5" fill={skinTone} stroke={shadowColor} strokeWidth="1.5"/>
        </svg>
      );
    } else if (pose === 'closed') {
      // Closed fist
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Fist body */}
          <ellipse cx="32" cy="36" rx="18" ry="16" fill={skinTone} stroke={shadowColor} strokeWidth="2"/>
          {/* Thumb on top */}
          <ellipse cx="20" cy="32" rx="7" ry="12" fill={skinTone} stroke={shadowColor} strokeWidth="1.5" transform="rotate(-30 20 32)"/>
          {/* Knuckles indication */}
          <line x1="28" y1="28" x2="28" y2="32" stroke={shadowColor} strokeWidth="2" strokeLinecap="round"/>
          <line x1="34" y1="26" x2="34" y2="30" stroke={shadowColor} strokeWidth="2" strokeLinecap="round"/>
          <line x1="40" y1="28" x2="40" y2="32" stroke={shadowColor} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    } else {
      // Grabbing - partially closed
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Palm */}
          <ellipse cx="32" cy="38" rx="15" ry="18" fill={skinTone} stroke={shadowColor} strokeWidth="2"/>
          {/* Thumb */}
          <ellipse cx="20" cy="36" rx="6" ry="10" fill={skinTone} stroke={shadowColor} strokeWidth="1.5" transform="rotate(-15 20 36)"/>
          {/* Curved fingers */}
          <path d="M 28 20 Q 28 30, 30 36" stroke={shadowColor} strokeWidth="5" strokeLinecap="round" fill={skinTone}/>
          <path d="M 34 18 Q 34 28, 35 36" stroke={shadowColor} strokeWidth="5" strokeLinecap="round" fill={skinTone}/>
          <path d="M 40 20 Q 40 30, 40 36" stroke={shadowColor} strokeWidth="5" strokeLinecap="round" fill={skinTone}/>
          <path d="M 45 24 Q 44 32, 44 36" stroke={shadowColor} strokeWidth="4" strokeLinecap="round" fill={skinTone}/>
        </svg>
      );
    }
  };

  return (
    <div
      className="fixed z-[9998] pointer-events-none transition-all duration-200 ease-out"
      style={{
        left: position.x,
        top: position.y,
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.5})`,
      }}
    >
      <div className="relative">
        {/* Subtle shadow */}
        <div className={`w-20 h-20 rounded-full blur-lg absolute top-0 left-0 transition-opacity duration-200 ${visible ? 'opacity-30' : 'opacity-0'}`}
          style={{
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.3) 0%, transparent 70%)'
          }}>
        </div>

        {/* Animated Hand SVG */}
        <div className="relative transition-transform duration-200" style={{
          transform: `scale(${pose === 'closed' ? 1.1 : 1})`
        }}>
          {renderHandSVG()}

          {/* Seed count badge */}
          {seedCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-lg">
              {seedCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hand;