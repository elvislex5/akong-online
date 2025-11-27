import React from 'react';
import ParticlesBackground from '../effects/ParticlesBackground';
import AnimatedGradient from '../effects/AnimatedGradient';

interface ImmersiveWrapperProps {
  children: React.ReactNode;
  variant?: 'hero' | 'subtle' | 'vibrant' | 'dark';
  showParticles?: boolean;
}

const ImmersiveWrapper: React.FC<ImmersiveWrapperProps> = ({
  children,
  variant = 'subtle',
  showParticles = true
}) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Particles Background */}
      {showParticles && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <ParticlesBackground theme={variant === 'hero' || variant === 'vibrant' ? 'gold' : 'dark'} />
        </div>
      )}

      {/* Animated Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatedGradient variant={variant} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ImmersiveWrapper;
