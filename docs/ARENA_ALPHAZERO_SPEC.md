# Cahier des Charges : Arena AlphaZero

## 1. Vision

Un espace evenementiel dans Akong ou AlphaZero joue en direct, visible par tous. Les joueurs assistent a des exhibitions spectaculaires, et les plus courageux peuvent defier l'IA — contre paiement.

Le premier match public sera un evenement de lancement : un grand joueur de Songo invite affronte AlphaZero devant toute la communaute.

---

## 2. Analyse de l'existant

### 2.1 Composants reutilisables directement

| Composant | Fichier(s) | Usage Arena |
|-----------|-----------|-------------|
| Rooms Socket.io | `server.js` | create/join/spectate room, broadcast game_event |
| Systeme spectateur | `server.js`, `onlineManager.ts`, `useOnlineGame.ts` | `spectateRoom()`, canal spectateurs |
| IA neuronale | `services/neuralAI.ts` | `getNeuralMCTSMove()` via ONNX |
| Chat | `hooks/useChat.ts`, `components/chat/` | Chat spectateur |
| Invitations | `components/InvitationSystem.tsx` | Invitation du challenger VIP |
| Match system | `hooks/useOnlineGame.ts`, `services/roomService.ts` | Format de match (Best of 3, etc.) |
| Score display | `components/MatchScoreDisplay.tsx` | Score en direct |
| Enregistrement de parties | `services/gameRecorder.ts` | Base du replay |
| Admin flag | `profiles.is_admin` (migration 008) | Acces admin |
| Profils/stats | `services/supabase.ts` | Profils challenger + classement |
| Presence | `services/presenceService.ts` | Compteur spectateurs |
| Plateau de jeu | `components/BoardRevolutionary.tsx` | Vue spectateur |

### 2.2 Elements a creer

| Brique | Effort |
|--------|--------|
| Execution IA cote serveur | Eleve |
| Systeme d'evenements/exhibition | Moyen |
| Interface spectateur enrichie (reactions, compteur) | Moyen |
| Systeme de paiement/tickets | Eleve |
| Replay de parties | Moyen |
| Page Arena (frontend) | Moyen |
| Administration evenements | Faible |
| Notifications push (PWA) | Faible |

---

## 3. Architecture technique

### 3.1 IA en mode exhibition

**Option A -- IA cote serveur (recommande pour la production)** :
- Microservice Python avec `training/mcts.py` + `training/neural_network.py`
- Ou `onnxruntime-node` directement dans `server.js`
- Le serveur est le "host" de la room : recoit les `MOVE_INTENT`, calcule le coup IA, broadcast
- Avantages : performances controlees, integrite garantie, pas de dependance hardware client

**Option B -- IA cote client du host (MVP rapide)** :
- Le navigateur admin execute `getNeuralMCTSMove()` comme aujourd'hui
- Le challenger envoie ses `MOVE_INTENT` au host admin
- Le host joue le coup de l'IA puis broadcast a tous
- Avantage : zero changement backend IA, reutilise 100% de l'existant
- Inconvenient : dependant du hardware de la machine admin

**Recommandation** : demarrer avec Option B pour le premier evenement, migrer vers Option A pour la production.

### 3.2 Architecture des rooms exhibition

```
               +------------------+
               |  Admin Dashboard |
               |  (creer event)   |
               +--------+---------+
                        |
                   create_exhibition_room
                        |
               +--------v---------+
               |   server.js      |
               | (Socket.io)      |
               |                  |
               | Room Exhibition:  |
               | - host: admin/IA |
               | - guest: challgr |
               | - type: exhibition|
               +---+---------+----+
                   |         |
          broadcast|         |broadcast
                   |         |
          +--------v--+  +---v--------+
          | Spectateurs|  | Challenger  |
          | (N joueurs)|  | (1 joueur)  |
          +------------+  +-------------+
```

### 3.3 Nouvelles tables Supabase

```sql
-- Evenements arena
CREATE TABLE public.arena_exhibitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenger_id UUID REFERENCES public.profiles(id),
  room_id UUID REFERENCES public.game_rooms(id),
  status TEXT CHECK (status IN ('scheduled','live','completed','cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ai_version TEXT DEFAULT 'v1',
  ai_time_limit_ms INTEGER DEFAULT 5000,
  match_format TEXT DEFAULT 'traditional_6',
  max_spectators INTEGER DEFAULT 1000,
  spectator_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  move_history JSONB, -- Pour le replay
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Defis payants (Phase 4)
CREATE TABLE public.arena_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID REFERENCES public.profiles(id) NOT NULL,
  room_id UUID REFERENCES public.game_rooms(id),
  status TEXT CHECK (status IN ('pending','active','completed','expired')),
  ticket_type TEXT, -- 'single', 'pack_3', 'subscription'
  payment_id TEXT, -- Reference Stripe
  result TEXT, -- 'win', 'loss', 'draw'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions spectateurs
CREATE TABLE public.arena_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exhibition_id UUID REFERENCES public.arena_exhibitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  reaction_type TEXT NOT NULL, -- 'fire','wow','clap','think','gg'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonne room_type sur game_rooms
ALTER TABLE game_rooms ADD COLUMN room_type TEXT DEFAULT 'standard'
  CHECK (room_type IN ('standard', 'exhibition', 'arena_challenge'));
```

### 3.4 Flux d'un coup pendant une exhibition

1. **Coup du challenger** : envoie `MOVE_INTENT` via Socket.io
2. **Host (admin ou serveur)** : recoit le move, calcule l'etat suivant, broadcast `REMOTE_MOVE` + `SYNC_STATE` a toute la room (spectateurs inclus)
3. **Tour de l'IA** : le host appelle `getNeuralMCTSMove()`, joue le coup, broadcast `REMOTE_MOVE`
4. **Spectateurs** : recoivent chaque coup en temps reel via le canal `game_event` existant

---

## 4. Experience utilisateur

### 4.1 Parcours du spectateur

1. **Decouverte** : bandeau sur la page lobby "LIVE -- Exhibition AlphaZero vs [Challenger]"
2. **Entree** : clic -> page `/arena/:exhibitionId`
3. **Vue spectateur** :
   - Plateau de jeu (BoardRevolutionary en mode spectateur)
   - Profils des deux joueurs (challenger + AlphaZero avec avatar et branding special)
   - Compteur de spectateurs en temps reel
   - Chat spectateur (canal dedie)
   - Barre de reactions (emojis cliquables, affichage en cascade style Twitch)
   - Score du match en cours (MatchScoreDisplay)
   - Timer du coup en cours
4. **Notifications** : si pas en direct, countdown vers le prochain evenement + bouton "Me rappeler"
5. **Replay** : apres l'evenement, relecture coup par coup

### 4.2 Parcours du challenger

1. **Invitation** : recoit une invitation speciale (InvitationSystem avec flag `is_exhibition`)
2. **Acceptation** : rejoint la room exhibition comme un guest online
3. **Jeu** : joue normalement, le format de match est pre-defini par l'admin
4. **Fin** : ecran de resultats special + classement des challengers

### 4.3 Parcours de l'admin

1. **Page** `/admin/arena` (accessible si `profile.is_admin`)
2. **Planification** : formulaire (titre, date/heure, challenger invite, format, time limit IA)
3. **Dashboard** : liste des evenements, statut, boutons "Demarrer" / "Annuler"
4. **Monitoring live** : nombre de spectateurs, etat du match, bouton pause/arret d'urgence
5. **Post-evenement** : stats et export replay

---

## 5. Modele economique

### Phase 1 -- Gratuit (lancement)
- Regarder les exhibitions : **gratuit** (attirer la communaute)
- Premier match exhibition : **gratuit** (evenement promotionnel)

### Phase 2 -- Defis payants
- **Ticket unitaire** : 1 defi contre AlphaZero (~2-3 EUR)
- **Pack 3 defis** : prix reduit (~5 EUR)
- **Pack 10 defis** : prix encore plus reduit (~12 EUR)
- Implementation : Stripe Checkout

### Phase 3 -- Abonnement "Arena Pass"
- Acces illimite aux defis AlphaZero (~9.99 EUR/mois)
- Acces prioritaire aux evenements
- Badge special sur le profil
- Replay illimite

### Recompenses
- Les defis rapportent des points bonus (meme en cas de defaite)
- Points echangeables dans la boutique de skins
- **Skin exclusif "AlphaZero"** pour les joueurs ayant battu l'IA
- Le **premier joueur a battre AlphaZero** recoit un titre permanent sur son profil

---

## 6. Aspects sociaux

### 6.1 Chat spectateur
- Reutilise `hooks/useChat.ts` avec canal `${roomCode}:spectators`
- Moderation : filtrage de mots, slow mode (1 msg / 5 sec)

### 6.2 Reactions en direct
- Boutons : feu, wow, clap, reflexion, GG
- Evenement Socket.io `ARENA_REACTION`, animation cascade
- Compteur agrege par type en temps reel
- Stocke dans `arena_reactions` pour stats post-evenement

### 6.3 Classement des challengers
- "Hall of Fame" sur la page Arena
- Metriques : victoires vs AlphaZero, ratio, meilleure marge
- Le premier vainqueur d'AlphaZero recoit un titre legendaire

---

## 7. Plan de lancement -- Premier evenement

### Pre-evenement
- **J-14** : annonce reseaux sociaux, teaser in-app (bandeau lobby)
- **J-7** : revelation du challenger invite (grand joueur de Songo)
- **J-3** : activation du countdown dans l'app
- **J-1** : notification push + rappel email a tous les inscrits

### Jour J
- **H-1** : page Arena ouverte, countdown final, chat ouvert
- **H-0** : admin demarre l'exhibition, challenger rejoint la room
- **Live** : match en direct (format Best of 3 recommande)
- **Fin** : ecran de resultats, celebration, annonce du prochain evenement

### Post-evenement
- Replay disponible immediatement
- Stats partagees (spectateurs, reactions, coups marquants)
- Publication resultats sur reseaux sociaux
- Ouverture des defis payants : "A votre tour !"

---

## 8. Phases d'implementation

### Phase 1 -- MVP Exhibition (priorite haute)
**Objectif** : premier evenement en direct, spectateurs passifs, IA cote client

1. Migration Supabase : table `arena_exhibitions`, colonne `room_type` sur `game_rooms`
2. Nouveau `GameMode.ArenaExhibition` dans `types.ts`
3. Hook `useArenaGame` : etend `useOnlineGame` pour le mode exhibition
4. Page `/arena` : plateau en mode spectateur, profils, compteur, countdown
5. Admin : page `/admin/arena` pour creer/demarrer un evenement
6. Routes dans `AppRouter.tsx`
7. Bandeau lobby affichant l'evenement en cours/a venir
8. Socket.io : evenement `ARENA_EVENT_STARTED` broadcast a tous

**Dependances** : aucune externe
**Fichiers cles** : `types.ts`, `server.js`, `useOnlineGame.ts`, `AppRouter.tsx`, nouveau `pages/ArenaPage.tsx`

### Phase 2 -- Experience spectateur enrichie
**Objectif** : chat, reactions, replay

1. Chat spectateur (canal dedie)
2. Reactions live (composant + animations cascade)
3. Replay (persister GameRecord en DB + composant ArenaReplay)
4. Notifications PWA pour les evenements

**Dependances** : Phase 1

### Phase 3 -- IA cote serveur
**Objectif** : performances garanties, independance du hardware admin

1. `onnxruntime-node` dans `server.js` ou microservice Python
2. Le serveur devient host de la room exhibition
3. Endpoint `/api/arena/ai-move`

**Dependances** : Phase 1

### Phase 4 -- Defis payants et classement
**Objectif** : monetisation

1. Integration Stripe (Checkout Sessions)
2. Table `arena_challenges` (tickets, paiements, resultats)
3. Classement des challengers + Hall of Fame
4. Queue de defis (file d'attente hors evenements)
5. Skin exclusif pour les vainqueurs

**Dependances** : Phase 3

### Phase 5 -- Polish et scale
**Objectif** : production-ready

1. Rate limiting (reactions, chat)
2. Moderation chat
3. Analytics (engagement, retention)
4. Performance (broadcast optimise pour 500+ spectateurs)
5. Mobile (tester la page Arena sur Capacitor)
