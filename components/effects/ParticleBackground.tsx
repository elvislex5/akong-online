import React from 'react';

interface ParticleBackgroundProps {
    particleCount?: number;
    className?: string;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
    particleCount = 50,
    className = ""
}) => {
    const particles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        size: Math.random() * 3 + 1,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
    }));

    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent opacity-30"
                style={{
                    background: 'radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 140, 0, 0.05) 0%, transparent 50%)'
                }}
            />

            {/* Floating particles */}
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full bg-gold animate-particle-float"
                    style={{
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        left: `${particle.left}%`,
                        top: `${particle.top}%`,
                        animationDelay: `${particle.delay}s`,
                        animationDuration: `${particle.duration}s`,
                        boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                        opacity: 0.3,
                    }}
                />
            ))}
        </div>
    );
};

export default ParticleBackground;
