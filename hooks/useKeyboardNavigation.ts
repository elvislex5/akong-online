import { useEffect, useCallback, useState } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: (e: KeyboardEvent) => void;
    description?: string;
}

/**
 * Hook pour gérer les raccourcis clavier globaux
 * 
 * @param shortcuts - Liste des raccourcis à enregistrer
 * @param enabled - Active/désactive les raccourcis
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 'Escape', handler: closeModal, description: 'Fermer' },
 *   { key: 'k', ctrl: true, handler: openSearch, description: 'Recherche' }
 * ]);
 */
export function useKeyboardShortcuts(
    shortcuts: KeyboardShortcut[],
    enabled: boolean = true
) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;

            for (const shortcut of shortcuts) {
                const keyMatches = e.key === shortcut.key;
                const ctrlMatches = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
                const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
                const altMatches = shortcut.alt ? e.altKey : !e.altKey;

                if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
                    e.preventDefault();
                    shortcut.handler(e);
                    break;
                }
            }
        },
        [shortcuts, enabled]
    );

    useEffect(() => {
        if (!enabled) return;

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);
}

/**
 * Hook pour navigation au clavier dans une liste/grille
 * Gère les touches Arrow Up/Down/Left/Right
 * 
 * @param itemCount - Nombre total d'items
 * @param onSelect - Callback quand un item est sélectionné (Enter/Space)
 * @param columns - Nombre de colonnes (pour grille)
 * @returns Index actuellement sélectionné et fonction pour le changer
 */
export function useKeyboardNavigation(
    itemCount: number,
    onSelect?: (index: number) => void,
    columns: number = 1
) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const next = prev + columns;
                        return next < itemCount ? next : prev;
                    });
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const next = prev - columns;
                        return next >= 0 ? next : prev;
                    });
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev + 1) % itemCount);
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (onSelect) {
                        onSelect(selectedIndex);
                    }
                    break;

                case 'Home':
                    e.preventDefault();
                    setSelectedIndex(0);
                    break;

                case 'End':
                    e.preventDefault();
                    setSelectedIndex(itemCount - 1);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [itemCount, selectedIndex, onSelect, columns]);

    return { selectedIndex, setSelectedIndex };
}
