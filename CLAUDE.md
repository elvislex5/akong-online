# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Akông** is a web-based implementation of the traditional African strategy board game **Songo** (MPEM variant). React 19 + TypeScript + Vite, deployed as a PWA with fullscreen game experience.

**Current Status:**
- Backend Phase 1 (Authentication & Profiles): ✅ Complete
- Backend Phase 2 (Robust Online Multiplayer): ✅ Complete
- Backend Phase 2.5 (Match System): ✅ Complete (integrated into App.tsx/useOnlineGame.ts)
- Sprint 2 (Matchmaking & Glicko-2): ✅ Complete
- Sprint 3 (Spectator & Profile): ✅ Complete
- Sprint 4 (Lessons & Puzzles): ✅ Complete
- Sprint 5 (Sound, Polish): ✅ Complete
- Backend Phase 3 (Social & Matchmaking): 📅 Next
- Frontend Phases 1-4 (Landing, Navigation, Mobile, Animations): ✅ Complete
- Frontend Phase 5 (Accessibility): ✅ Complete
- Frontend Phase 6 (PWA): ✅ Complete
- See ROADMAP.md, FRONTEND_ROADMAP.md, PHASE2_IMPLEMENTATION.md, and MATCH_SYSTEM_IMPLEMENTATION.md for details.

## Development Commands

```bash
npm run dev             # Frontend dev server → http://localhost:3000
node server.js          # Socket.io backend → http://localhost:3002 (separate terminal)
npm run build           # Production build
npm run preview         # Preview production build
```

**For online multiplayer:** both `npm run dev` AND `node server.js` must run simultaneously.

No test runner is configured.

### Environment Variables

**`.env.local`** (frontend):
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SOCKET_SERVER_URL=http://localhost:3002
```

**`.env`** (server only — service key must never reach the client):
```bash
PORT=3002
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Supabase Migrations (run in order)

```
001_initial_schema.sql       — profiles table + auth trigger
002_game_rooms.sql           — game_rooms, game_spectators
003_fix_room_join_policy.sql — RLS fix for room joining
003_social_features.sql      — social features (Phase 3)
004_board_skins.sql          — board skin system
005_fix_new_user_board_skin.sql — auto-assign Classic Wood to new users
007_match_formats.sql        — match_games table + match columns (Phase 2.5)
009_glicko2_ratings.sql       — Glicko-2 multi-system ratings table
010_profile_alias_songo.sql   — alias_songo column on profiles
```

### Deployment

- **Frontend**: Vercel
- **Backend**: Fly.io (`fly.toml` configured)
- **Database/Auth**: Supabase

See DEPLOYMENT.md and DEPLOYMENT_CHECKLIST.md.

## Architecture

### Routing (`AppRouter.tsx`)

All heavy components are **lazy-loaded** for performance. Routes:
- `/` → `LandingPageRevolutionary` (public)
- `/rules` → `RulesPageImmersive` (public)
- `/learn` → `LearnPage` (public — interactive lessons)
- `/lobby` → `LobbyComingSoon` (public)
- `/watch` → `WatchPage` (public — live games spectator discovery)
- `/history` → `GameHistoryPage` (requires auth — past games)
- `/profile` → `ProfilePage` (requires auth, full-page route)
- `/game` → `App` (requires auth, fullscreen — no Navbar/Footer)
- `*` → redirect to `/`

`UnifiedNavbar` is the single navbar used across all pages. It's hidden during active games via `GameContext`.

### State Management Pattern (`App.tsx`)

Critical **ref pattern** to avoid stale closures in async callbacks (AI, Socket.io events):

```typescript
gameStateRef.current   // Always latest state for async callbacks
latestHandlersRef.current  // Current handler versions for event listeners
```

Always use the ref values inside Socket.io event handlers and AI callbacks, never captured state.

### Core Game Logic (`services/songoLogic.ts`)

- `executeMove(state, pitIndex)` is **pure** — always returns a new `GameState`, never mutates.
- Board: 14 pits (indices 0-6 = Player One, 7-13 = Player Two)
- `INITIAL_SEEDS = 5` (35 per player), `WINNING_SCORE = 36`
- Animation steps are generated separately from state transitions — `AnimationStep[]` drives the UI

**Critical rules:** Solidarity (feeding), capture (2/3/4 seeds on opponent side), drought prevention (cannot leave opponent with zero moves unless unavoidable).

### Online Multiplayer Architecture (`hooks/useOnlineGame.ts`)

```
App.tsx → useOnlineGame.ts ─┬─→ roomService.ts → Supabase (DB persistence)
                             └─→ onlineManager.ts → server.js (Socket.io)
```

Host is authoritative: saves game state to DB after each move, broadcasts via Socket.io. Guest sends move intents to host, receives animated result. Disconnection → state persists in DB → reconnection restores it.

### Match System (Phase 2.5 — needs integration)

Components and services exist but are not yet wired into `App.tsx`/`useOnlineGame.ts`. See `MATCH_SYSTEM_IMPLEMENTATION.md` for the integration checklist.

4 formats: Infinite (parties libres), Traditional 6, Traditional 2, First to X.

### PWA (`vite-plugin-pwa`)

Configured in `vite.config.ts` with Workbox. Service worker auto-updates. Install prompt managed by `hooks/useInstallPrompt.ts`, surfaced via `InstallBanner.tsx` and `PWAInstallPrompt.tsx`.

### Accessibility (`components/accessibility/`)

`SkipLink`, `LiveRegion`, `VisuallyHidden`. Keyboard navigation via `hooks/useKeyboardNavigation.ts`, focus trap via `hooks/useFocusTrap.ts`, screen reader announcements via `hooks/useAnnouncer.ts`.

### Chat System

`hooks/useChat.ts` + `components/chat/` (ChatOverlay, ChatMessage, ChatInput, TypingIndicator) — integrated into online multiplayer.

### AI (`services/ai.ts`)

Minimax with alpha-beta pruning, iterative deepening, transposition table (500k entries), Zobrist hashing. 5 difficulty levels from Facile (500ms, depth 4) to Légende (15s, depth 35). Expert and Légende show a "thinking" indicator — this is intentional, not a bug.

### Board Skin System

`services/boardSkinService.ts` + `config/boardSkinConfigs.ts` + `hooks/useBoardSkin.ts`. Each skin requires position calibration (use `BoardCalibrationTool.tsx`). New users auto-receive "Classic Wood" via database trigger.

## Key Conventions

**Player enum:**
```typescript
enum Player { One = 0, Two = 1 }
// Player One: pits 0-6 (bottom, moves right-to-left visually)
// Player Two: pits 7-13 (top, moves left-to-right visually)
```

**Language:** French for all UI text (`Joueur 1`, `Nouvelle partie`, etc.).

**Styling:** Tailwind CSS, dark theme (gray-900 background, amber accents).

**Console log prefixes:** `[ServiceName]` pattern (e.g., `[useAuth]`, `[onlineManager]`, `[roomService]`).

**TypeScript path alias:** `@/*` maps to project root.

**Build:** Manual code-splitting configured in `vite.config.ts` → `react-vendor`, `game-logic`, `ui-components`, `three-vendor` chunks.

## Key Dependencies

- **three / @react-three/fiber / @react-three/drei** — 3D visual effects
- **@tsparticles/react + @tsparticles/slim** — particle background effects
- **react-parallax-tilt** — tilt effects on cards
- **framer-motion** — page transitions and animations
- **canvas-confetti** — victory celebration
- **socket.io-client + socket.io** — realtime multiplayer
- **@supabase/supabase-js** — auth and database
- **vite-plugin-pwa + workbox-window** — PWA support
- **lucide-react** — icons

## Testing Game Logic

Use **Simulation Mode** (Simulation / Labo from the main menu):
1. Edit pits/scores directly
2. Toggle starting player
3. Set AI difficulty and speed
4. Launch to watch AI play out the position

Invaluable for debugging solidarity feeding, capture chains, and endgame stalemates.

## Common Gotchas

- `invertView` prop on the guest's board affects **visual rendering only** — game logic indices are unchanged.
- Audio initializes lazily on first user interaction (browser requirement).
- Légende AI: 10-15s per move is expected behavior.
- Navigation blocking: `beforeunload` dialog text is browser-native and cannot be customized.
- Migration `003_social_features.sql` and `003_fix_room_join_policy.sql` share the same numeric prefix — run fix first, then social.
- Fly.io free tier: ~2s cold start after inactivity.
