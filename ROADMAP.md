# Roadmap - Transformation d'Akong en Plateforme Complète

## 🎯 Vision

Transformer Akong d'un jeu multijoueur basique en une **plateforme de jeu en ligne professionnelle** avec :
- Système d'authentification et profils utilisateurs complets
- Matchmaking avancé (invitations, lobby, ranked, tournois)
- Chat intégré en temps réel
- Mode spectateur fonctionnel
- Synchronisation robuste et fiable

## 🛠️ Stack Technique

### Frontend
- **React 19** + TypeScript + Vite
- **Tailwind CSS** pour le styling
- **Supabase Client** pour l'authentification et la base de données
- **Socket.io Client** pour le temps réel (jeu + chat)

### Backend
- **Node.js** + Express
- **Socket.io Server** (temps réel : jeu, chat, présence)
- **Supabase** (PostgreSQL + Auth + Storage)

### Hébergement (Tier Gratuit)
- **Frontend** : Vercel (gratuit)
- **Backend Socket.io** : Fly.io (gratuit, 3 machines)
- **Base de données** : Supabase (500MB gratuit)
- **Assets/Avatars** : Supabase Storage (1GB gratuit)

### Limites du Tier Gratuit
- Supabase : 500MB DB, 50k auth users/mois, 2GB bandwidth/mois
- Fly.io : 3 machines, 160GB bandwidth/mois
- Vercel : 100GB bandwidth/mois

**Capacité estimée** : 1000-2000 utilisateurs actifs/mois

---

## 📋 Plan d'Implémentation par Phases

### **Phase 1 : Fondations** ✅ **TERMINÉE** (21 Nov 2025)

**Objectif** : Mettre en place l'authentification et les profils utilisateurs de base

**Statut** : ✅ Complétée et fonctionnelle

#### 1.1 Configuration Supabase
- [x] Créer un projet Supabase
- [x] Configurer les variables d'environnement
- [x] Installer les dépendances Supabase
- [x] Créer le schéma de base de données

#### 1.2 Schéma de Base de Données (v1)

```sql
-- Table des profils utilisateurs (étend auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour créer automatiquement un profil à l'inscription
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, NEW.email, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Index pour la recherche rapide
CREATE INDEX profiles_username_idx ON profiles(username);
```

#### 1.3 Authentification Frontend
- [x] Créer les composants Auth (Login, Register, Profile)
- [x] Intégrer Supabase Auth dans App.tsx
- [x] Gérer l'état de session utilisateur
- [x] Protéger les routes/modes de jeu

#### 1.4 Refactorisation du Serveur Socket.io
- [ ] Ajouter validation des tokens JWT Supabase (Reporté à Phase 2)
- [ ] Associer socket.id aux user_id authentifiés (Reporté à Phase 2)
- [ ] Persister l'état de présence (qui est en ligne) (Reporté à Phase 2)

#### 1.5 UI/UX de Base
- [x] Écran de connexion/inscription
- [x] Navigation avec profil utilisateur (navbar)
- [x] Page de profil basique
- [x] Déconnexion

#### 🎉 Résultat Phase 1
- ✅ Authentification complète fonctionnelle
- ✅ Création automatique de profils
- ✅ Protection du jeu (accessible uniquement si connecté)
- ✅ Interface de profil avec stats basiques
- ✅ Base de données structurée et sécurisée (RLS)

---

### **Phase 2 : Jeu en Ligne Robuste** ✅ **TERMINÉE** (23 Nov 2025)

**Objectif** : Améliorer la synchronisation et l'expérience multijoueur

**Statut** : ✅ Complétée et fonctionnelle

#### 2.1 Système de Rooms Persistantes

```sql
-- Table des parties (rooms)
CREATE TABLE public.game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id) NOT NULL,
  guest_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('waiting', 'playing', 'finished')) DEFAULT 'waiting',
  game_state JSONB, -- État complet du jeu
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Table des spectateurs
CREATE TABLE public.game_spectators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX game_rooms_status_idx ON game_rooms(status);
CREATE INDEX game_rooms_host_idx ON game_rooms(host_id);
```

#### 2.2 Synchronisation Améliorée
- [x] Sauvegarder l'état du jeu dans la DB à chaque coup
- [x] Implémenter la reconnexion automatique (restauration d'état)
- [x] Gérer les déconnexions/abandons gracieusement
- [x] Ajouter un système de heartbeat

#### 2.3 Mode Spectateur
- [x] Permettre de rejoindre une room en tant que spectateur
- [x] Diffuser l'état du jeu aux spectateurs en temps réel
- [x] Afficher la liste des spectateurs
- [x] Interface spectateur (pas de contrôles, juste vue)

#### 2.4 Gestion des Abandons
- [x] Détection de déconnexion (timeout)
- [x] Modal de confirmation d'abandon
- [x] Victoire automatique pour l'adversaire en cas d'abandon

#### 🎉 Résultat Phase 2
- ✅ Persistance complète des parties en base de données
- ✅ Reconnexion automatique avec restauration d'état
- ✅ Mode spectateur entièrement fonctionnel
- ✅ Gestion robuste des déconnexions et abandons
- ✅ Heartbeat pour maintenir les connexions actives
- ✅ Architecture hook personnalisé (`useOnlineGame.ts`)
- ✅ JWT authentication côté serveur
- ✅ Synchronisation temps réel via Socket.io + Supabase

---

### **Phase 3 : Social & Matchmaking** 👥

**Objectif** : Créer l'aspect social et le matchmaking de base

#### 3.1 Schéma DB - Social

```sql
-- Table de présence (qui est en ligne)
CREATE TABLE public.user_presence (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  status TEXT CHECK (status IN ('online', 'in_game', 'offline')) DEFAULT 'offline',
  current_room_id UUID REFERENCES game_rooms(id),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Table des invitations
CREATE TABLE public.game_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) NOT NULL,
  to_user_id UUID REFERENCES profiles(id) NOT NULL,
  room_id UUID REFERENCES game_rooms(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX invitations_to_user_idx ON game_invitations(to_user_id, status);
```

#### 3.2 Lobby Public
- [ ] Page lobby : liste des joueurs en ligne
- [ ] Filtrer par statut (disponible, en partie)
- [ ] Envoyer une invitation à un joueur
- [ ] Recevoir et accepter/refuser les invitations

#### 3.3 Invitations Directes
- [ ] Rechercher un joueur par pseudo
- [ ] Envoyer invitation par pseudo
- [ ] Notifications en temps réel des invitations
- [ ] Expiration automatique des invitations (5min)

#### 3.4 Chat en Jeu
- [ ] Interface de chat pendant les parties
- [ ] Messages privés entre les 2 joueurs
- [ ] Historique limité (derniers 50 messages)
- [ ] Modération basique (limite de caractères, rate limiting)

```sql
-- Table des messages de chat (optionnel, peut être en mémoire)
CREATE TABLE public.game_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX messages_room_idx ON game_messages(room_id, created_at DESC);
```

#### 3.5 Statistiques de Base
- [ ] Compteurs : victoires, défaites, parties jouées
- [ ] Ratio W/L
- [ ] Affichage sur le profil

```sql
-- Ajouter colonnes de stats à profiles
ALTER TABLE profiles ADD COLUMN games_played INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN games_won INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN games_lost INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN games_drawn INTEGER DEFAULT 0;
```

---

### **Phase 4 : Gamification** 🏆

**Objectif** : Système de ranking et matchmaking automatique

#### 4.1 Système ELO

```sql
-- Ajouter ELO aux profils
ALTER TABLE profiles ADD COLUMN elo_rating INTEGER DEFAULT 1200;
ALTER TABLE profiles ADD COLUMN peak_elo INTEGER DEFAULT 1200;

-- Historique ELO
CREATE TABLE public.elo_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  room_id UUID REFERENCES game_rooms(id),
  old_elo INTEGER,
  new_elo INTEGER,
  elo_change INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX elo_history_user_idx ON elo_history(user_id, created_at DESC);
```

#### 4.2 Classement (Leaderboard)
- [ ] Page de classement global
- [ ] Filtres : journalier, hebdomadaire, mensuel, all-time
- [ ] Top 100 joueurs
- [ ] Recherche de sa position

#### 4.3 File d'Attente Ranked
- [ ] Bouton "Jouer en Ranked"
- [ ] Matchmaking automatique (ELO ±100)
- [ ] Notification quand un match est trouvé
- [ ] Calcul et mise à jour de l'ELO après chaque partie

```sql
-- Table de la file d'attente
CREATE TABLE public.ranked_queue (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  elo_rating INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX queue_elo_idx ON ranked_queue(elo_rating);
```

#### 4.4 Achievements & Badges

```sql
-- Définitions des achievements
CREATE TABLE public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- Achievements débloqués par utilisateur
CREATE TABLE public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX user_achievements_user_idx ON user_achievements(user_id);
```

- [ ] Créer 10-15 achievements de base
- [ ] Système de déblocage automatique
- [ ] Notifications de déblocage
- [ ] Affichage sur le profil

**Exemples d'achievements** :
- "Première victoire"
- "10 victoires"
- "Victoire parfaite" (sans que l'adversaire ne marque)
- "Comeback" (gagner après avoir été mené)
- "Série de 5 victoires"
- "Maître du Songo" (100 victoires)

#### 4.5 Historique Détaillé des Parties

```sql
-- Historique complet (avec replay)
CREATE TABLE public.game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id),
  player_one_id UUID REFERENCES profiles(id),
  player_two_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  moves JSONB, -- Array de tous les coups joués
  duration INTEGER, -- Durée en secondes
  final_scores JSONB,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX game_history_player_idx ON game_history(player_one_id, played_at DESC);
CREATE INDEX game_history_player2_idx ON game_history(player_two_id, played_at DESC);
```

- [ ] Enregistrer tous les coups de chaque partie
- [ ] Page "Mes parties"
- [ ] Système de replay (rejouer une partie coup par coup)
- [ ] Statistiques avancées par partie

---

### **Phase 5 : Fonctionnalités Avancées** 🚀

**Objectif** : Fonctionnalités premium pour engagement long terme

#### 5.1 Système de Tournois

```sql
-- Tournois
CREATE TABLE public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES profiles(id),
  format TEXT CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin')),
  max_players INTEGER,
  status TEXT CHECK (status IN ('registration', 'in_progress', 'completed')) DEFAULT 'registration',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  prize_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants
CREATE TABLE public.tournament_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  seed INTEGER,
  eliminated BOOLEAN DEFAULT FALSE,
  final_rank INTEGER,
  UNIQUE(tournament_id, user_id)
);

-- Matches de tournoi
CREATE TABLE public.tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER,
  match_number INTEGER,
  player_one_id UUID REFERENCES profiles(id),
  player_two_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  room_id UUID REFERENCES game_rooms(id),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending'
);
```

- [ ] Créer un tournoi
- [ ] S'inscrire à un tournoi
- [ ] Génération automatique du bracket
- [ ] Suivi du tournoi en temps réel
- [ ] Page de résultats du tournoi

#### 5.2 Système d'Amis

```sql
CREATE TABLE public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX friendships_user_idx ON friendships(user_id, status);
```

- [ ] Envoyer une demande d'ami
- [ ] Accepter/refuser
- [ ] Liste d'amis
- [ ] Voir quand les amis sont en ligne
- [ ] Inviter directement un ami

#### 5.3 Graphiques de Progression
- [ ] Graphique d'évolution de l'ELO (Chart.js)
- [ ] Statistiques par période (jour/semaine/mois)
- [ ] Heatmap des heures de jeu
- [ ] Taux de victoire par adversaire

#### 5.4 Replay System
- [ ] Player de replay avec contrôles (play, pause, vitesse)
- [ ] Partage de replays
- [ ] Replays vedettes (meilleures parties)
- [ ] Analyse de partie (suggestions de l'IA)

#### 5.5 Cosmétiques (Optionnel)
- [ ] Thèmes de plateau personnalisables
- [ ] Avatars premium
- [ ] Emojis/réactions en jeu
- [ ] Titres/badges à afficher

---

## 🏗️ Architecture Technique Détaillée

### Structure des Dossiers

```
akong-online/
├── services/
│   ├── ai.ts                    # Existant
│   ├── songoLogic.ts            # Existant
│   ├── audioService.ts          # Existant
│   ├── onlineManager.ts         # Existant - À refactoriser
│   ├── supabase.ts              # NOUVEAU - Client Supabase
│   ├── authService.ts           # NOUVEAU - Gestion auth
│   ├── profileService.ts        # NOUVEAU - Gestion profils
│   ├── matchmakingService.ts    # NOUVEAU - Matchmaking
│   ├── eloService.ts            # NOUVEAU - Calcul ELO
│   └── achievementService.ts    # NOUVEAU - Achievements
├── components/
│   ├── Board.tsx                # Existant
│   ├── Pit.tsx                  # Existant
│   ├── Hand.tsx                 # Existant
│   ├── auth/
│   │   ├── LoginForm.tsx        # NOUVEAU
│   │   ├── RegisterForm.tsx     # NOUVEAU
│   │   └── ProfilePage.tsx      # NOUVEAU
│   ├── lobby/
│   │   ├── Lobby.tsx            # NOUVEAU - Lobby principal
│   │   ├── PlayerList.tsx       # NOUVEAU
│   │   ├── InvitationModal.tsx  # NOUVEAU
│   │   └── RoomCard.tsx         # NOUVEAU
│   ├── game/
│   │   ├── GameRoom.tsx         # NOUVEAU - Wrapper de partie
│   │   ├── ChatPanel.tsx        # NOUVEAU
│   │   ├── SpectatorView.tsx    # NOUVEAU
│   │   └── GameHeader.tsx       # NOUVEAU
│   ├── leaderboard/
│   │   ├── Leaderboard.tsx      # NOUVEAU
│   │   └── RankCard.tsx         # NOUVEAU
│   └── tournament/
│       ├── TournamentBracket.tsx # NOUVEAU
│       └── TournamentCard.tsx   # NOUVEAU
├── hooks/
│   ├── useAuth.ts               # NOUVEAU - Auth state
│   ├── useProfile.ts            # NOUVEAU - Profile state
│   ├── usePresence.ts           # NOUVEAU - Online presence
│   └── useRealtime.ts           # NOUVEAU - Supabase realtime
├── types.ts                     # Existant - À étendre
├── App.tsx                      # Existant - Refactoriser
├── server.js                    # Existant - Étendre
└── supabase/
    ├── migrations/              # NOUVEAU - Migrations SQL
    └── seed.sql                 # NOUVEAU - Données de test
```

### Flux d'Authentification

```
1. User ouvre l'app
   ↓
2. App.tsx vérifie session Supabase
   ↓
3a. Session valide → Charge profil → Affiche lobby
3b. Pas de session → Affiche écran login/register
   ↓
4. User se connecte/inscrit
   ↓
5. Supabase Auth retourne session + JWT
   ↓
6. Frontend stocke session
   ↓
7. Connexion Socket.io avec JWT dans handshake
   ↓
8. Serveur valide JWT et associe socket.id ↔ user_id
   ↓
9. User rejoint le lobby (présence "online")
```

### Flux de Partie (avec DB)

```
1. Host crée une partie
   ↓
2. Frontend → POST /api/rooms → Supabase
   ↓
3. DB crée row dans game_rooms (status: 'waiting')
   ↓
4. Host rejoint la Socket.io room
   ↓
5. Guest rejoint via room_code
   ↓
6. DB met à jour game_rooms (guest_id, status: 'playing')
   ↓
7. Partie commence
   ↓
8. Chaque coup :
   - Frontend → Socket.io → Serveur
   - Serveur valide et exécute
   - Serveur → DB update game_state (JSONB)
   - Serveur broadcast nouveau state
   ↓
9. Fin de partie :
   - DB update game_rooms (status: 'finished', winner_id)
   - DB insert game_history (moves, duration, etc.)
   - DB update profiles (stats, ELO)
   - DB check & insert achievements débloqués
```

### Gestion de la Synchronisation

**Problème actuel** : Pas de source de vérité, états peuvent diverger

**Solution** :
1. **Source de vérité unique** : Base de données Supabase
2. **Host authoritative** : Le host exécute les coups et envoie l'état complet
3. **Validation serveur** : Le serveur Socket.io valide chaque coup avant broadcast
4. **Snapshots périodiques** : Sauvegarde DB tous les 3 coups
5. **Reconnexion** : Restauration depuis DB si déconnexion

**Optimisations pour rester gratuit** :
- Utiliser Supabase Realtime pour la présence (léger)
- Socket.io pour le jeu en temps réel (plus rapide)
- Sauvegarder en DB seulement les états importants (pas chaque seed)
- Compresser game_state en JSONB
- Nettoyer les vieilles parties (>30 jours)

---

## 📊 Stratégies d'Optimisation (Budget Gratuit)

### Base de Données (500MB)
- Utiliser JSONB pour game_state (compressé)
- Indexes uniquement sur colonnes critiques
- Archiver/supprimer les parties >30 jours
- Limiter l'historique de chat à 50 messages/room

**Estimation** :
- 1 profil ≈ 2KB
- 1 partie ≈ 10KB (avec historique)
- Capacité : ~25,000 profils + 25,000 parties

### Bande Passante Supabase (2GB/mois)
- Utiliser Socket.io pour le temps réel (bypass Supabase)
- Requêtes DB optimisées (SELECT uniquement les colonnes nécessaires)
- Avatars hébergés sur Supabase Storage (1GB gratuit)
- Pagination sur toutes les listes

### Socket.io / Fly.io (160GB/mois)
- Compression WebSocket activée
- Messages compacts (pas de données inutiles)
- Déconnexion automatique après 30min d'inactivité

---

## 🧪 Plan de Tests

### Tests Phase 1
- [ ] Inscription/connexion fonctionne
- [ ] Profil créé automatiquement
- [ ] Session persiste après refresh
- [ ] Déconnexion fonctionne

### Tests Phase 2
- [ ] Création de room persiste en DB
- [ ] Reconnexion restaure l'état
- [ ] Spectateur reçoit les updates
- [ ] Abandon est géré correctement

### Tests Phase 3
- [ ] Lobby affiche les joueurs en ligne
- [ ] Invitations envoyées et reçues
- [ ] Chat fonctionne en temps réel
- [ ] Stats se mettent à jour après partie

### Tests Phase 4
- [ ] ELO calculé correctement
- [ ] Ranked matchmaking trouve des adversaires
- [ ] Leaderboard affiche bon classement
- [ ] Achievements se débloquent

### Tests Phase 5
- [ ] Tournois se créent et fonctionnent
- [ ] Bracket généré correctement
- [ ] Replays rejouent la partie exactement
- [ ] Graphiques affichent vraies données

---

## 📅 Timeline Estimée

- **Phase 1** : 2-3 jours
- **Phase 2** : 2-3 jours
- **Phase 3** : 3-4 jours
- **Phase 4** : 3-4 jours
- **Phase 5** : 4-5 jours

**Total** : ~14-19 jours de développement

---

## 🚀 Déploiement et Monitoring

### Variables d'Environnement

```env
# Frontend (.env.local)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SOCKET_SERVER_URL=https://akong-server.fly.dev

# Backend (Fly.io secrets)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
PORT=3002
```

### Monitoring (Gratuit)

- **Supabase Dashboard** : Métriques DB, Auth, Storage
- **Fly.io Metrics** : CPU, mémoire, requêtes
- **Vercel Analytics** : Trafic frontend
- **Logs** : `flyctl logs` pour debug

### Alertes

- Configurer Supabase alerts (email) si :
  - DB > 400MB (80% de la limite)
  - Bandwidth > 1.6GB/mois (80%)

---

## 📚 Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [ELO Rating System](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Tournament Bracket Algorithms](https://en.wikipedia.org/wiki/Bracket_(tournament))

---

## ✅ Checklist de Démarrage (Phase 1)

Avant de commencer :
- [ ] Créer un compte Supabase
- [ ] Créer un nouveau projet Supabase
- [ ] Noter les credentials (URL, anon key, service key)
- [ ] Installer les dépendances : `npm install @supabase/supabase-js`
- [ ] Créer `.env.local` avec les variables
- [ ] Faire un commit avant les changements : `git commit -am "Pre-Phase 1 checkpoint"`

---

**Prêt à démarrer la Phase 1 !** 🚀
