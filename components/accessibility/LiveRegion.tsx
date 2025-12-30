import React, { useEffect, useRef } from 'react';

type Politeness = 'polite' | 'assertive' | 'off';

interface LiveRegionProps {
    message: string;
    politeness?: Politeness;
    clearOnUnmount?: boolean;
}

/**
 * Composant Live Region pour annonces dynamiques aux lecteurs d'écran
 * 
 * @param message - Message à annoncer
 * @param politeness - 'polite' (attendre) ou 'assertive' (interrompre)
 * @param clearOnUnmount - Vider le message au démontage
 * 
 * @example
 * <LiveRegion 
 *   message="Partie gagnée !" 
 *   politeness="assertive" 
 * />
 */
export function LiveRegion({
    message,
    politeness = 'polite',
    clearOnUnmount = true,
}: LiveRegionProps) {
    const regionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (regionRef.current && message) {
            // Vider puis remplir pour forcer l'annonce
            regionRef.current.textContent = '';
            const timeout = setTimeout(() => {
                if (regionRef.current) {
                    regionRef.current.textContent = message;
                }
            }, 100);

            return () => clearTimeout(timeout);
        }
    }, [message]);

    useEffect(() => {
        return () => {
            if (clearOnUnmount && regionRef.current) {
                regionRef.current.textContent = '';
            }
        };
    }, [clearOnUnmount]);

    if (politeness === 'off') return null;

    return (
        <div
            ref={regionRef}
            role={politeness === 'assertive' ? 'alert' : 'status'}
            aria-live={politeness}
            aria-atomic="true"
            className="sr-only"
        />
    );
}

export default LiveRegion;
