import { useEffect, useRef } from 'react';

/**
 * Hook pour piéger le focus dans un container (ex: modal)
 * Empêche la navigation Tab de sortir du container
 * 
 * @param isActive - Active/désactive le focus trap
 * @returns ref à attacher au container
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
    const containerRef = useRef<T>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        // Sauvegarder l'élément actuellement focus
        previousActiveElement.current = document.activeElement as HTMLElement;

        const container = containerRef.current;

        // Obtenir tous les éléments focusables
        const getFocusableElements = (): HTMLElement[] => {
            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'textarea:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
            ].join(', ');

            return Array.from(container.querySelectorAll(focusableSelectors));
        };

        // Focus sur le premier élément focusable
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Gérer la navigation Tab
        const handleTabKey = (e: KeyboardEvent) => {
            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Shift + Tab sur premier élément -> aller au dernier
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
            // Tab sur dernier élément -> aller au premier
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                handleTabKey(e);
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            container.removeEventListener('keydown', handleKeyDown);

            // Restaurer le focus à l'élément précédent
            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        };
    }, [isActive]);

    return containerRef;
}
