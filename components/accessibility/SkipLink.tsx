import React from 'react';

interface SkipLinkProps {
    href: string;
    children: React.ReactNode;
}

/**
 * Lien "Skip to content" pour navigation clavier
 * Invisible par défaut, visible au focus
 * 
 * Permet aux utilisateurs de clavier de sauter directement au contenu principal
 * 
 * @example
 * <SkipLink href="#main-content">
 *   Aller au contenu principal
 * </SkipLink>
 */
export function SkipLink({ href, children }: SkipLinkProps) {
    return (
        <a
            href={href}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-amber-500 focus:text-black focus:font-bold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
            {children}
        </a>
    );
}

export default SkipLink;
