# 🎯 Système de Match Multi-Format - Guide d'Implémentation

## ✅ CE QUI A ÉTÉ IMPLÉMENTÉ

### 1. **Base de Données** (Migration 007)
📄 `supabase/migrations/007_match_formats.sql`

**Nouvelles colonnes dans `game_rooms`:**
- `match_format` - Type de match (infinite, traditional_6, traditional_2, first_to_x)
- `match_target` - Cible pour "premier à X" (2, 3, 5, 7, etc.)
- `match_score_host` - Score du host dans le match
- `match_score_guest` - Score du guest dans le match
- `match_status` - État du match (in_progress, completed, abandoned)
- `match_winner_id` - Gagnant du match

**Nouvelle table `match_games`:**
- Historique de toutes les parties jouées dans un match
- Permet de revoir le déroulement complet d'un match

**Nouvelles colonnes dans `profiles`:**
- `matches_played` - Nombre de matchs joués (≠ parties)
- `matches_won` - Matchs gagnés
- `matches_lost` - Matchs perdus
- `matches_drawn` - Matchs nuls (traditionnel seulement)

**Fonctions SQL:**
- `record_match_game()` - Enregistre une partie et vérifie si le match est terminé
- `abandon_match()` - Abandonne le match entier
- `get_match_history()` - Récupère l'historique d'un match
- Trigger `on_match_completed` - Met à jour automatiquement les stats de profil

### 2. **Types TypeScript**
📄 `services/supabase.ts`

- `MatchFormat` - 'infinite' | 'traditional_6' | 'traditional_2' | 'first_to_x'
- `MatchStatus` - 'in_progress' | 'completed' | 'abandoned'
- `GameRoom` (mis à jour) - Inclut tous les champs de match
- `MatchGame` - Interface pour l'historique des parties
- `Profile` (mis à jour) - Inclut stats de matchs

### 3. **Services Backend**
📄 `services/roomService.ts`

**Nouvelles fonctions:**
```typescript
createGameRoomWithFormat(hostId, roomCode, matchFormat, matchTarget?)
recordMatchGame(roomId, winnerId, scoreHost, scoreGuest, duration?, gameState?)
abandonMatch(roomId, abandonerId)
getMatchHistory(roomId)
getMatchFormatLabel(format, target?)
isMatchComplete(room, gameNumber)
```

### 4. **Composants UI**
📄 `components/modals/MatchConfigModal.tsx` - ✅ Créé
- Modal de configuration du format avant de créer une room
- 4 formats avec descriptions et icônes
- Sélection de la cible pour "Premier à X"
- Design moderne avec Framer Motion

📄 `components/MatchScoreDisplay.tsx` - ✅ Créé
- Affichage du score du match sur le plateau
- Étoiles pour visualiser les victoires
- Indicateur de progression (Partie X/6, etc.)
- S'affiche uniquement pour les formats avec match (pas infini)

📄 `components/modals/SurrenderModal.tsx` - ✅ Mis à jour
- Double choix : Abandonner partie OU match
- Interface claire avec icônes distinctes
- Validation en 2 étapes pour match entier

---

## 🔧 INTÉGRATION DANS APP.TSX

Voici les modifications à faire dans `App.tsx` et `useOnlineGame.ts` pour tout connecter :

### Étape 1 : Importer les nouveaux composants

```typescript
// Dans App.tsx, ajouter :
import { MatchConfigModal } from './components/modals/MatchConfigModal';
import { MatchScoreDisplay } from './components/MatchScoreDisplay';
import { recordMatchGame, createGameRoomWithFormat } from './services/roomService';
import type { MatchFormat } from './services/supabase';
```

### Étape 2 : Ajouter l'état pour le format de match

```typescript
// Dans App.tsx, ajouter au state :
const [showMatchConfigModal, setShowMatchConfigModal] = useState(false);
const [selectedMatchFormat, setSelectedMatchFormat] = useState<MatchFormat>('infinite');
const [selectedMatchTarget, setSelectedMatchTarget] = useState<number | undefined>();
```

### Étape 3 : Modifier la création de room

**AVANT :**
```typescript
const handleCreateRoom = async () => {
  // ... auth checks ...
  await onlineGame.handleCreateRoom();
};
```

**APRÈS :**
```typescript
const handleCreateRoom = async () => {
  // Afficher le modal de config d'abord
  setShowMatchConfigModal(true);
};

const handleMatchConfigConfirm = async (format: MatchFormat, target?: number) => {
  setSelectedMatchFormat(format);
  setSelectedMatchTarget(target);
  setShowMatchConfigModal(false);

  // Créer la room avec le format choisi
  await onlineGame.handleCreateRoom(format, target);
};
```

### Étape 4 : Modifier `useOnlineGame.ts`

Dans `hooks/useOnlineGame.ts`, modifier `handleCreateRoom` :

**AVANT :**
```typescript
const handleCreateRoom = async () => {
  const roomCode = onlineManager.createRoom(user.id);
  const dbRoom = await createGameRoom(user.id, roomCode);
  // ...
};
```

**APRÈS :**
```typescript
const handleCreateRoom = async (
  matchFormat: MatchFormat = 'infinite',
  matchTarget?: number
) => {
  const roomCode = onlineManager.createRoom(user.id);
  const dbRoom = await createGameRoomWithFormat(
    user.id,
    roomCode,
    matchFormat,
    matchTarget
  );
  // ...
};
```

### Étape 5 : Enregistrer les parties terminées

Dans `App.tsx`, quand une partie se termine (dans la gestion du winner) :

```typescript
// Après qu'un gagnant soit déterminé
if (gameMode === GameMode.OnlineHost && onlineGame.roomDbId && onlineGame.room) {
  try {
    // Déterminer qui a gagné (host ou guest)
    const winnerId = gameState.winner === Player.One
      ? onlineGame.room.host_id
      : onlineGame.room.guest_id;

    // Enregistrer la partie
    const result = await recordMatchGame(
      onlineGame.roomDbId,
      winnerId,
      gameState.scores[Player.One],
      gameState.scores[Player.Two],
      undefined, // duration (à implémenter si besoin)
      gameState
    );

    console.log('[App] Match game recorded:', result);

    // Vérifier si le match est terminé
    if (result.matchComplete) {
      // Le match est fini !
      toast.success(`Match terminé ! Gagnant: ${result.matchWinnerId ? 'Joueur' : 'Match nul'}`);
      // Afficher modal de fin de MATCH (pas juste partie)
    } else {
      // Match continue, afficher score
      toast(`Score du match: ${result.matchScoreHost} - ${result.matchScoreGuest}`);
    }
  } catch (err) {
    console.error('[App] Error recording match game:', err);
  }
}
```

### Étape 6 : Afficher le score de match

Dans `App.tsx`, dans le JSX où se trouve le plateau :

```typescript
{/* Affichage du score de match (si format avec match) */}
{(gameMode === GameMode.OnlineHost || gameMode === GameMode.OnlineGuest) &&
 onlineGame.room && (
  <MatchScoreDisplay
    room={onlineGame.room}
    hostName={playerProfiles[Player.One]?.display_name || "Joueur 1"}
    guestName={playerProfiles[Player.Two]?.display_name || "Joueur 2"}
  />
)}

{/* Plateau de jeu */}
<BoardRevolutionary ... />
```

### Étape 7 : Gérer l'abandon à double niveau

Modifier l'appel à `SurrenderModal` :

```typescript
<SurrenderModal
  isOpen={surrenderModalOpen}
  gameMode={gameMode}
  matchFormat={onlineGame.room?.match_format}
  onClose={() => setSurrenderModalOpen(false)}
  onSurrender={handleSurrender}
  onSurrenderMatch={async () => {
    if (user?.id && onlineGame.roomDbId) {
      await abandonMatch(onlineGame.roomDbId, user.id);
      toast.error('Match abandonné');
      exitToMenu();
    }
  }}
/>
```

### Étape 8 : Ajouter le modal de config dans le JSX

```typescript
<MatchConfigModal
  isOpen={showMatchConfigModal}
  onClose={() => setShowMatchConfigModal(false)}
  onConfirm={handleMatchConfigConfirm}
/>
```

---

## 🎨 MODAL DE FIN DE MATCH

Il faudra créer un nouveau modal `MatchOverModal.tsx` pour différencier fin de partie vs fin de match :

```typescript
// Idée de structure
<MatchOverModal
  matchWinner={...}
  finalScore={{ host: 4, guest: 2 }}
  matchFormat="traditional_6"
  matchHistory={...} // Liste des 6 parties
  onNewMatch={() => {}}
  onExit={() => {}}
/>
```

---

## 📋 CHECKLIST D'INTÉGRATION

- [ ] Exécuter la migration SQL dans Supabase
- [ ] Ajouter les imports dans App.tsx
- [ ] Ajouter les states pour match config
- [ ] Modifier handleCreateRoom pour afficher le modal
- [ ] Implémenter handleMatchConfigConfirm
- [ ] Modifier useOnlineGame.handleCreateRoom
- [ ] Ajouter recordMatchGame dans la logique de fin de partie
- [ ] Intégrer MatchScoreDisplay dans le JSX
- [ ] Mettre à jour SurrenderModal avec matchFormat et onSurrenderMatch
- [ ] Ajouter MatchConfigModal dans le JSX
- [ ] Créer MatchOverModal (optionnel mais recommandé)
- [ ] Tester les 4 formats
- [ ] Vérifier les stats de profil

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Mode Infini
1. Créer une room avec format "Parties libres"
2. Jouer plusieurs parties
3. Vérifier que le score s'affiche mais qu'il n'y a pas de fin de match
4. Vérifier qu'on peut "Rejouer" indéfiniment

### Test 2 : Traditionnel 6 Parties
1. Créer une room avec format "Traditionnel 6 parties"
2. Jouer 6 parties (faire varier les gagnants)
3. Vérifier que le match se termine automatiquement après la 6ème partie
4. Vérifier que le gagnant est celui qui a le plus de victoires
5. Vérifier les stats de profil (matches_won / matches_lost)
6. Tester un match nul (3-3)

### Test 3 : Traditionnel 2 Parties
1. Créer une room avec format "Traditionnel 2 parties"
2. Jouer 2 parties
3. Vérifier que le match se termine après 2 parties

### Test 4 : Premier à X
1. Créer une room avec "Premier à 3 victoires"
2. Jouer jusqu'à ce qu'un joueur ait 3 victoires
3. Vérifier que le match s'arrête automatiquement (même si score 3-1, pas besoin de jouer plus)
4. Tester avec différentes cibles (2, 5, 7)

### Test 5 : Abandon
1. Créer un match (format non-infini)
2. Abandonner UNE partie → Vérifier que le match continue
3. Abandonner LE MATCH → Vérifier que tout se termine

### Test 6 : Reconnexion
1. Créer un match
2. Jouer 2 parties
3. Se déconnecter et reconnecter
4. Vérifier que le score du match est restauré

---

## 📝 NOTES IMPORTANTES

1. **Rétrocompatibilité** : Les rooms existantes (sans match_format) seront traitées comme 'infinite' par défaut.

2. **Stats séparées** : Les stats de PARTIES (games_won) et de MATCHS (matches_won) sont séparées. C'est intentionnel !

3. **Performance** : La table `match_games` peut grandir. Prévoir un nettoyage des matchs de >30 jours si besoin.

4. **UI/UX** : Le bouton "REJOUER" devrait être remplacé par "PARTIE SUIVANTE" quand le match continue.

5. **ELO** : Pour l'instant, l'ELO change à chaque partie. Vous pourriez modifier pour qu'il change seulement à la fin du MATCH.

---

## 🚀 PROCHAINES ÉTAPES RECOMMANDÉES

1. **Modal de fin de match** avec recap complet
2. **Historique de match** dans le profil (voir toutes les parties d'un match)
3. **Achievements** liés aux matchs ("Victoire 6-0", "Comeback 4-2", etc.)
4. **Classement basé sur les matchs** plutôt que les parties
5. **Replay de match** - revoir toutes les parties d'un match

---

**Temps estimé d'intégration** : 2-3 heures
**Difficulté** : Moyenne (principalement de la plomberie, pas de logique complexe)
**Impact** : MAJEUR - Transforme complètement l'expérience de jeu en ligne !
