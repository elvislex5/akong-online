import { useCallback, useRef } from 'react';

type Politeness = 'polite' | 'assertive' | 'off';

/**
 * Hook pour annoncer des messages aux lecteurs d'écran
 * Utilise des live regions ARIA invisibles
 * 
 * @example
 * const { announce } = useAnnouncer();
 * announce('Partie gagnée !', 'assertive');
 */
export function useAnnouncer() {
    const politeRegionRef = useRef<HTMLDivElement | null>(null);
    const assertiveRegionRef = useRef<HTMLDivElement | null>(null);

    // Créer les live regions si elles n'existent pas
    const ensureLiveRegions = useCallback(() => {
        if (!politeRegionRef.current) {
            const politeRegion = document.createElement('div');
            politeRegion.setAttribute('role', 'status');
            politeRegion.setAttribute('aria-live', 'polite');
            politeRegion.setAttribute('aria-atomic', 'true');
            politeRegion.className = 'sr-only';
            document.body.appendChild(politeRegion);
            politeRegionRef.current = politeRegion;
        }

        if (!assertiveRegionRef.current) {
            const assertiveRegion = document.createElement('div');
            assertiveRegion.setAttribute('role', 'alert');
            assertiveRegion.setAttribute('aria-live', 'assertive');
            assertiveRegion.setAttribute('aria-atomic', 'true');
            assertiveRegion.className = 'sr-only';
            document.body.appendChild(assertiveRegion);
            assertiveRegionRef.current = assertiveRegion;
        }
    }, []);

    /**
     * Annonce un message aux lecteurs d'écran
     * @param message - Message à annoncer
     * @param politeness - Niveau d'urgence ('polite' ou 'assertive')
     */
    const announce = useCallback(
        (message: string, politeness: Politeness = 'polite') => {
            if (politeness === 'off') return;

            ensureLiveRegions();

            const region =
                politeness === 'assertive'
                    ? assertiveRegionRef.current
                    : politeRegionRef.current;

            if (region) {
                // Vider puis remplir pour forcer l'annonce
                region.textContent = '';
                setTimeout(() => {
                    region.textContent = message;
                }, 100);
            }
        },
        [ensureLiveRegions]
    );

    /**
     * Annonce un message de succès
     */
    const announceSuccess = useCallback(
        (message: string) => {
            announce(`Succès: ${message}`, 'polite');
        },
        [announce]
    );

    /**
     * Annonce un message d'erreur
     */
    const announceError = useCallback(
        (message: string) => {
            announce(`Erreur: ${message}`, 'assertive');
        },
        [announce]
    );

    /**
     * Annonce un changement d'état du jeu
     */
    const announceGameState = useCallback(
        (message: string) => {
            announce(message, 'polite');
        },
        [announce]
    );

    return {
        announce,
        announceSuccess,
        announceError,
        announceGameState,
    };
}
