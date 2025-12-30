# Navigation Blocking System

## 🎯 Objectif

Empêcher les utilisateurs de quitter accidentellement une partie en cours sans confirmation, améliorant ainsi l'expérience utilisateur et évitant les abandons involontaires.

## 🛠️ Implémentation

### Architecture

```
GameContext (contexts/GameContext.tsx)
    ↓
    ├─→ AppRouter.tsx (cache la navbar si partie en cours)
    └─→ App.tsx (bloque la navigation)
         └─→ useNavigationBlocker (hooks/useNavigationBlocker.ts)
```

### Composants

#### 1. **GameContext** (`contexts/GameContext.tsx`)
Contexte React partagé entre `AppRouter` et `App` pour communiquer l'état de la partie.

```typescript
interface GameContextType {
  isGameInProgress: boolean;
  setGameInProgress: (inProgress: boolean) => void;
}
```

#### 2. **useNavigationBlocker** (`hooks/useNavigationBlocker.ts`)
Hook personnalisé qui :
- Bloque la fermeture/rafraîchissement de l'onglet (`beforeunload`)
- Bloque la navigation React Router interne (`useBlocker`)
- Affiche un message de confirmation

#### 3. **AppRouter.tsx**
- Wrappe l'application avec `GameProvider`
- Cache la navbar (`UnifiedNavbar`) quand `isGameInProgress === true`

#### 4. **App.tsx**
- Met à jour le contexte quand le jeu démarre/termine
- Utilise `useNavigationBlocker` pour bloquer la navigation
- Affiche un toast d'erreur si tentative de navigation

## 🎮 Comportement

### Quand une partie est en cours (`GameStatus.Playing`)

✅ **Bloqué :**
- Navigation vers d'autres pages (Accueil, Règles, Profil)
- Fermeture de l'onglet
- Rafraîchissement de la page (F5)
- Bouton "retour" du navigateur

✅ **Permis :**
- Bouton "Abandonner" dans le jeu (affiche confirmation)
- Fin naturelle de la partie (victoire/défaite)

### Quand aucune partie n'est en cours

✅ **Comportement normal :**
- Navbar visible et cliquable
- Navigation libre entre les pages
- Aucun blocage

## 📋 Flux utilisateur

### Scénario 1 : Tentative de navigation pendant le jeu

```
1. Utilisateur lance une partie
   → gameState.status = GameStatus.Playing
   → setGameInProgress(true)
   → Navbar cachée
   → Navigation bloquée

2. Utilisateur clique sur un lien (bouton back, etc.)
   → useBlocker bloque la navigation
   → Toast affiché : "Veuillez abandonner la partie avant de quitter"
   → Navigation annulée

3. Utilisateur clique sur "Abandonner"
   → Modal de confirmation s'affiche
   → Si confirmé : gameState.status = GameStatus.Finished
   → setGameInProgress(false)
   → Navigation débloquée
   → Retour au menu
```

### Scénario 2 : Tentative de fermeture de l'onglet

```
1. Partie en cours
   → beforeunload event listener actif

2. Utilisateur tente de fermer l'onglet (Alt+F4, Ctrl+W, croix)
   → Navigateur affiche dialog natif :
     "Quitter cette page ? Les modifications que vous avez apportées ne seront peut-être pas enregistrées."
   → Utilisateur peut annuler
```

### Scénario 3 : Fin normale de partie

```
1. Partie se termine (victoire/défaite/égalité)
   → gameState.status = GameStatus.Finished
   → setGameInProgress(false)
   → Navigation débloquée automatiquement
   → Navbar réapparaît
   → Modal de fin de partie s'affiche
```

## 🔧 Détails techniques

### Détection de partie en cours

```typescript
const isPlaying = gameState.status === GameStatus.Playing && gameMode !== null;
```

Une partie est considérée "en cours" si :
- Le status est `Playing` (pas `Finished` ou `Setup`)
- Un mode de jeu est sélectionné (pas au menu principal)

### Blocage multi-niveaux

1. **Browser-level** : `beforeunload` event
   - Bloque fermeture/refresh de l'onglet
   - Dialog natif du navigateur

2. **Router-level** : React Router `useBlocker`
   - Bloque navigation interne (liens, navigate())
   - Callback personnalisé pour afficher toast

3. **UI-level** : Navbar cachée
   - Prévention visuelle
   - Pas de liens cliquables

## 🧪 Tests

### Test manuel

1. **Lancer une partie** (n'importe quel mode)
2. **Vérifier** : Navbar disparaît
3. **Essayer de naviguer** :
   - Cliquer bouton "retour" → Bloqué + toast
   - Presser F5 → Dialog de confirmation
   - Alt+F4 → Dialog de confirmation
4. **Abandonner la partie**
5. **Vérifier** : Navbar réapparaît, navigation libre

### Points à tester

- ✅ LocalMultiplayer
- ✅ VsAI
- ✅ Simulation
- ✅ OnlineHost
- ✅ OnlineGuest
- ✅ Fin de partie normale
- ✅ Abandon de partie
- ✅ Retour au menu après partie

## 🐛 Dépannage

### La navbar ne disparaît pas
- Vérifier que `GameProvider` wrappe bien l'app dans `AppRouter.tsx`
- Vérifier que `gameState.status === GameStatus.Playing`
- Console : vérifier que `isGameInProgress` est `true`

### La navigation n'est pas bloquée
- Vérifier que `useNavigationBlocker` est appelé dans `App.tsx`
- Vérifier que le hook reçoit `isGameInProgress === true`
- Tester sur navigateur moderne (Chrome, Firefox, Edge)

### Le toast ne s'affiche pas
- Vérifier que React Hot Toast est configuré
- Vérifier le callback `onNavigationAttempt` dans `useNavigationBlocker`

## 📝 Notes

- Le dialog `beforeunload` est **natif au navigateur** et ne peut pas être personnalisé (texte fixe)
- Safari peut avoir un comportement différent pour `beforeunload`
- En mode développement, `beforeunload` peut parfois être ignoré (rechargement auto)
