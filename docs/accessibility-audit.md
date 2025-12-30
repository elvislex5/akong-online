# Audit d'Accessibilité - AKÔNG

Date: 29 Novembre 2025
Statut: En cours d'implémentation / Vérification

## Résumé

L'application a été mise à jour pour respecter les critères WCAG 2.1 Level AA. L'accent a été mis sur la navigabilité au clavier et la compatibilité avec les lecteurs d'écran.

## Fonctionnalités Implémentées

### 1. Navigation Clavier ⌨️
- **Focus Trap** : Les modales (Règles, Game Over, Édition, Calibration) capturent le focus pour éviter la navigation en arrière-plan.
- **Skip Link** : Un lien "Aller au contenu principal" permet d'éviter la navigation répétitive.
- **Indicateurs Visuels** : Tous les éléments interactifs ont un anneau de focus visible (`focus-visible-ring`).
- **Raccourcis** : La touche `Esc` ferme les modales.

### 2. Lecteurs d'Écran 🗣️
- **ARIA Labels** : Ajoutés sur les boutons icones, les liens de navigation et les éléments du plateau.
- **Live Regions** : Annonces dynamiques pour les changements d'état (victoire, tour de jeu, statut en ligne).
- **Sémantique** : Utilisation correcte des rôles (`dialog`, `navigation`, `main`, `contentinfo`).

### 3. Composants Spécifiques
- **Plateau de Jeu** : Les trous (Pits) et greniers sont focusables et activables avec `Enter` ou `Espace`.
- **Menu Mobile** : Gestion du focus lors de l'ouverture/fermeture.

## Raccourcis Clavier ⌨️

| Action | Raccourci | Contexte |
|--------|-----------|----------|
| **Naviguer** | `Tab` / `Shift+Tab` | Partout |
| **Sélectionner** | `Enter` / `Espace` | Boutons, Liens, Trous |
| **Fermer Modale** | `Esc` | Modales |
| **Menu Mobile** | `Enter` sur burger | Mobile |

## Points à Vérifier (Audit Futur)

### Contraste 🎨
- Vérifier le ratio de contraste des textes dorés (`text-amber-400`) sur fond noir.
- Vérifier le ratio des textes gris (`text-gray-400`).

### Mobile 📱
- Vérifier la taille des cibles tactiles (44x44px minimum).

### Tests Utilisateurs
- Valider le parcours complet avec un lecteur d'écran (NVDA/VoiceOver).
