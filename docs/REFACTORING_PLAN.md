# Plan de Refactoring - App.tsx

## Problème Actuel
`App.tsx` contient **1085 lignes** et gère trop de responsabilités :
- État du jeu + animation + AI + online + simulation + modals + menus
- Viole le principe de responsabilité unique (SRP)
- Difficile à maintenir et tester

## Objectif
Réduire App.tsx à **~300 lignes** en extrayant la logique dans des hooks et composants.

---

## Phase 1 : Hooks Personnalisés (Priorité: HAUTE)

### 1.1 `hooks/useOnlineGame.ts` ⭐⭐⭐
**Extraire :** Toute la logique online (lignes 74-82, 488-605)

```typescript
export function useOnlineGame(gameState, user) {
  const [roomId, setRoomId] = useState('');
  const [roomDbId, setRoomDbId] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [hasPlayer2, setHasPlayer2] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  const createRoom = async () => { /* ... */ };
  const joinRoom = async (roomCode) => { /* ... */ };
  const handlePlayerJoined = (connectionId) => { /* ... */ };

  return {
    roomId, roomDbId, isGuest, hasPlayer2,
    onlineStatus, isConnected,
    createRoom, joinRoom
  };
}
```

**Impact :** -150 lignes dans App.tsx

---

### 1.2 `hooks/useGameAnimation.ts` ⭐⭐⭐
**Extraire :** Logique d'animation (lignes 70-72, 190-296)

```typescript
export function useGameAnimation(gameMode, simSpeed) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animHand, setAnimHand] = useState({ pitIndex: null, seedCount: 0 });

  const playMoveAnimation = async (pitIndex, targetState?, explicitSteps?) => {
    // Tout le code d'animation ici
  };

  return { isAnimating, animHand, playMoveAnimation };
}
```

**Impact :** -100 lignes dans App.tsx

---

### 1.3 `hooks/useSimulation.ts` ⭐⭐
**Extraire :** Configuration et logique simulation (lignes 58-67, 473-485)

```typescript
export function useSimulation(gameState, setGameState) {
  const [simSpeed, setSimSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [simDifficulty, setSimDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isSimAuto, setIsSimAuto] = useState(true);
  const [simulationInitialState, setSimulationInitialState] = useState<GameState | null>(null);

  const startSimulation = () => { /* ... */ };
  const restartSimulation = () => { /* ... */ };
  const clearBoard = () => { /* ... */ };
  const resetBoard = () => { /* ... */ };

  return {
    simSpeed, setSimSpeed,
    simDifficulty, setSimDifficulty,
    isSimAuto, setIsSimAuto,
    startSimulation, restartSimulation,
    clearBoard, resetBoard
  };
}
```

**Impact :** -80 lignes dans App.tsx

---

### 1.4 `hooks/useAIPlayer.ts` ⭐⭐
**Extraire :** Configuration AI et effet AI turn (lignes 53-56, 129-187)

```typescript
export function useAIPlayer(gameState, gameMode, isAnimating, playMove) {
  const [aiPlayer, setAiPlayer] = useState<Player | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiStartsFirst, setAiStartsFirst] = useState(false);

  // useEffect pour gérer le tour de l'IA
  useEffect(() => { /* logique AI */ }, [gameState, isAnimating]);

  return { aiPlayer, setAiPlayer, aiDifficulty, setAiDifficulty, aiStartsFirst, setAiStartsFirst };
}
```

**Impact :** -70 lignes dans App.tsx

---

## Phase 2 : Composants UI (Priorité: MOYENNE)

### 2.1 `components/menus/MainMenu.tsx` ⭐⭐
**Extraire :** Tous les menus (lignes 727-835)

```typescript
export function MainMenu({
  menuStep, setMenuStep,
  startGame,
  handleCreateRoom,
  onlineStatus
}) {
  return (
    <div className="w-full max-w-md p-6">
      {menuStep === 'main' && <MainMenuContent />}
      {menuStep === 'ai_select' && <AISelectMenu />}
      {menuStep === 'ai_difficulty' && <AIDifficultyMenu />}
      {menuStep === 'online_menu' && <OnlineMenu />}
      {/* etc. */}
    </div>
  );
}
```

**Impact :** -110 lignes dans App.tsx

---

### 2.2 `components/modals/` ⭐⭐
**Extraire :** Tous les modals dans des fichiers séparés

- `RulesModal.tsx` (lignes 966-997)
- `GameOverModal.tsx` (lignes 1000-1036)
- `SurrenderModal.tsx` (lignes 1039-1066)
- `EditSimulationModal.tsx` (lignes 946-963)

**Impact :** -150 lignes dans App.tsx

---

### 2.3 `components/game/SimulationControls.tsx` ⭐
**Extraire :** Barre de contrôles simulation (lignes 868-939)

**Impact :** -70 lignes dans App.tsx

---

### 2.4 `components/game/GameHeader.tsx` ⭐
**Extraire :** Header avec navigation (lignes 664-720)

**Impact :** -60 lignes dans App.tsx

---

## Phase 3 : State Management Avancé (Priorité: BASSE)

### 3.1 Considérer un Reducer pour l'état du jeu
Si le projet grandit encore, envisager :
- `useReducer` pour gameState au lieu de useState
- Context API pour partager l'état global
- Zustand ou Redux pour un state management plus robuste

---

## Résultat Final Estimé

| Avant | Après | Réduction |
|-------|-------|-----------|
| 1085 lignes | ~250-300 lignes | **-70%** |

**App.tsx après refactoring contiendrait uniquement :**
- Orchestration des hooks
- Rendu principal (header + content)
- Handlers principaux (playMove, handlePitClick)
- Gestion des refs (gameStateRef, latestHandlersRef)

---

## Ordre d'Exécution Recommandé

1. ✅ **useOnlineGame** (plus gros impact, logique isolée)
2. ✅ **useGameAnimation** (logique complexe, bon candidat)
3. ✅ **Modals** (facile, amélioration immédiate de lisibilité)
4. ✅ **useSimulation** (logique métier séparée)
5. ✅ **MainMenu** (gros composant UI)
6. ⚠️ **useAIPlayer** (dépend de playMove, plus délicat)
7. ⚠️ **GameHeader, SimulationControls** (petites optimisations)

---

## Bénéfices Attendus

✅ **Maintenabilité** : Code plus facile à lire et modifier
✅ **Testabilité** : Hooks et composants testables isolément
✅ **Réutilisabilité** : Hooks réutilisables dans d'autres contextes
✅ **Performance** : Moins de re-renders inutiles
✅ **Collaboration** : Moins de conflits Git
✅ **Debugging** : Plus facile de localiser les bugs

---

## Note Importante

⚠️ Ce refactoring doit être fait **progressivement** et **testé à chaque étape**.
Ne pas tout refactoriser d'un coup pour éviter les régressions.

**Suggestion :** Commencer par Phase 1.1 (useOnlineGame) comme preuve de concept.
