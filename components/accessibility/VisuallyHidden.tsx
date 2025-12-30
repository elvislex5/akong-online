import React, { ElementType } from 'react';

interface VisuallyHiddenProps {
    children: React.ReactNode;
    as?: ElementType;
}

/**
 * Composant pour masquer visuellement du contenu tout en le gardant accessible
 * aux lecteurs d'écran
 * 
 * Utilise la classe Tailwind 'sr-only' (screen reader only)
 * 
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Fermer le menu</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({
    children,
    as: Component = 'span'
}: VisuallyHiddenProps) {
    return (
        <Component className="sr-only">
            {children}
        </Component>
    );
}

export default VisuallyHidden;
