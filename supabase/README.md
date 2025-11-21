# Supabase Database Setup

## Running Migrations

### Option 1: Via Supabase Dashboard (Recommandé)

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Dans le menu latéral, cliquez sur **SQL Editor**
4. Cliquez sur **New query**
5. Copiez-collez le contenu de `migrations/001_initial_schema.sql`
6. Cliquez sur **Run** (ou Ctrl+Enter)

### Option 2: Via Supabase CLI

```bash
# Installer la CLI Supabase (si pas déjà fait)
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref YOUR_PROJECT_REF

# Appliquer les migrations
supabase db push
```

## Migrations Disponibles

### 001_initial_schema.sql (Phase 1)
- Table `profiles` avec auto-création à l'inscription
- Statistiques de base (games_played, wins, losses, draws)
- ELO rating (pour Phase 4)
- Row Level Security (RLS) configuré
- Fonctions utilitaires (update_player_stats, get_profile_by_username)

## Vérification

Après avoir exécuté la migration, vérifiez que tout fonctionne :

```sql
-- Vérifier que la table existe
SELECT * FROM public.profiles LIMIT 1;

-- Tester la fonction de recherche
SELECT * FROM public.get_profile_by_username('test_user');

-- Vérifier les policies RLS
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## Structure de la Base de Données

```
public.profiles
├── id (UUID, PK, ref: auth.users.id)
├── username (TEXT, UNIQUE)
├── display_name (TEXT)
├── avatar_url (TEXT)
├── bio (TEXT)
├── games_played (INTEGER)
├── games_won (INTEGER)
├── games_lost (INTEGER)
├── games_drawn (INTEGER)
├── elo_rating (INTEGER) -- Phase 4
├── peak_elo (INTEGER) -- Phase 4
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Prochaines Migrations

- `002_game_rooms.sql` (Phase 2) - Tables pour les parties en ligne
- `003_social_features.sql` (Phase 3) - Invitations, chat, présence
- `004_ranking_system.sql` (Phase 4) - ELO, achievements, historique
- `005_tournaments.sql` (Phase 5) - Système de tournois
