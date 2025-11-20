import React, { useEffect, useState } from 'react';

interface HandProps {
  pitIndex: number | null; // ID of the pit the hand is currently over
  seedCount: number;
  isActive: boolean;
}

const Hand: React.FC<HandProps> = ({ pitIndex, seedCount, isActive }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
       if (pitIndex === null) return;
       const element = document.getElementById(`pit-${pitIndex}`);
       if (element) {
         const rect = element.getBoundingClientRect();
         setPosition({
           x: rect.left + rect.width / 2,
           y: rect.top + rect.height / 2
         });
       }
    };

    if (isActive && pitIndex !== null) {
      updatePosition();
      // Ensure visible is set after position is updated to prevent jump
      setVisible(true);
      
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    } else {
      setVisible(false);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [pitIndex, isActive]);

  return (
    <>
      <style>
        {`
          @keyframes seed-wiggle {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-0.5px, -1px); }
            50% { transform: translate(0, -0.5px); }
            75% { transform: translate(0.5px, -1px); }
          }
          .seed-wiggle {
            animation: seed-wiggle 0.4s infinite linear;
          }
        `}
      </style>
      <div 
        className="fixed z-50 pointer-events-none transition-all duration-300 ease-out"
        style={{ 
          left: position.x, 
          top: position.y,
          opacity: visible ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.5})`,
        }}
      >
        {/* Hand Visualization */}
        <div className="relative">
            {/* Shadow */}
            <div className={`w-16 h-16 bg-black/30 rounded-full blur-md absolute top-6 left-2 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}></div>
            
            {/* Hand Container */}
            <div className="w-14 h-14 bg-amber-900 rounded-full border-4 border-amber-700 shadow-inner flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              
              {/* Visual Seeds inside hand */}
              <div className="relative z-10 flex flex-wrap justify-center items-center gap-0.5 w-8 h-8 content-center">
                  {Array.from({ length: Math.min(seedCount, 12) }).map((_, i) => (
                      <div 
                        key={i} 
                        className="w-2 h-2 bg-stone-200 rounded-full shadow-sm border border-stone-300 seed-wiggle"
                        style={{ animationDelay: `${Math.random() * 0.5}s` }}
                      ></div>
                  ))}
              </div>
              
              {/* Count Badge */}
              <div className={`absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform duration-200 ${seedCount > 0 ? 'scale-100' : 'scale-0'}`}>
                  {seedCount}
              </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default Hand;