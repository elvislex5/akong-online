import React from 'react';

export const StrategyIcon: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="glow-gold">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Brain/Strategy Icon */}
        <circle cx="50" cy="50" r="35" stroke="#FFD700" strokeWidth="3" fill="none" filter="url(#glow-gold)" />
        <path d="M35 40 Q40 30, 50 35 T 65 40" stroke="#FFD700" strokeWidth="2" fill="none" filter="url(#glow-gold)" />
        <path d="M35 50 Q40 45, 50 50 T 65 50" stroke="#FFD700" strokeWidth="2" fill="none" filter="url(#glow-gold)" />
        <path d="M35 60 Q40 55, 50 60 T 65 60" stroke="#FFD700" strokeWidth="2" fill="none" filter="url(#glow-gold)" />
        <circle cx="50" cy="35" r="3" fill="#FFD700" filter="url(#glow-gold)" />
        <circle cx="40" cy="50" r="3" fill="#FFD700" filter="url(#glow-gold)" />
        <circle cx="60" cy="50" r="3" fill="#FFD700" filter="url(#glow-gold)" />
        <circle cx="50" cy="65" r="3" fill="#FFD700" filter="url(#glow-gold)" />
    </svg>
);

export const AIIcon: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="glow-amber">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Robot/AI Head */}
        <rect x="30" y="35" width="40" height="40" rx="5" stroke="#FF8C00" strokeWidth="3" fill="none" filter="url(#glow-amber)" />
        <circle cx="42" cy="50" r="4" fill="#FF8C00" filter="url(#glow-amber)" />
        <circle cx="58" cy="50" r="4" fill="#FF8C00" filter="url(#glow-amber)" />
        <path d="M40 62 L50 67 L60 62" stroke="#FF8C00" strokeWidth="2" fill="none" filter="url(#glow-amber)" />
        {/* Antenna */}
        <line x1="50" y1="35" x2="50" y2="25" stroke="#FF8C00" strokeWidth="2" filter="url(#glow-amber)" />
        <circle cx="50" cy="23" r="3" fill="#FF8C00" filter="url(#glow-amber)" />
    </svg>
);

export const SimulationIcon: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="glow-purple">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Lightning/Energy Icon */}
        <path d="M55 20 L35 50 L45 50 L30 80 L60 45 L50 45 L70 20 Z"
            fill="#A855F7" stroke="#A855F7" strokeWidth="2" filter="url(#glow-purple)" />
        <circle cx="50" cy="50" r="38" stroke="#A855F7" strokeWidth="2" fill="none" opacity="0.3" filter="url(#glow-purple)" />
    </svg>
);
