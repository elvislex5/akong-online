# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Akông** is a web-based implementation of the traditional African strategy board game **Songo** (MPEM variant). This is a React + TypeScript application built with Vite, featuring:

- **Authentication system** via Supabase (Phase 1: ✅ Complete)
- **Landing Page & Navigation** with React Router (Frontend Phase 1-2: ✅ Complete)
- Local multiplayer (2 players on same device)
- AI opponent with multiple difficulty levels
- Online multiplayer via Socket.io
- Simulation/Laboratory mode for testing game positions
- Rich animations and audio feedback
- User profiles with stats tracking
- Mobile-responsive design

The game involves capturing seeds by strategic distribution around a 14-pit board, with complex rules including solidarity (feeding), capture mechanics, and stalemate resolution.

**Current Status:**
- Backend Phase 1 (Authentication & Profiles): ✅ Complete
- Backend Phase 2 (Robust Online Multiplayer): ✅ Complete (23 Nov 2025)
- Backend Phase 3 (Social & Matchmaking): 📅 Next
- Frontend Phase 1 (Landing Page): ✅ Complete
- Frontend Phase 2 (Navigation & Routing): ✅ Complete
- Frontend Phase 3 (Mobile Responsivity): ✅ Complete
- Frontend Phase 4 (Animations): ✅ Complete
- Frontend Phase 5-7: 📅 Planned
- See ROADMAP.md, FRONTEND_ROADMAP.md, and PHASE2_IMPLEMENTATION.md for details.

## Development Commands

### Running the Application

```bash
npm install              # Install dependencies
npm run dev             # Start development server (http://localhost:3000)
npm run build           # Build for production
npm run preview         # Preview production build
```

### Environment Setup

Create a `.env.local` file in the root directory (copy from `.env.example`):

```bash
# Required for authentication (Phase 1)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Required for online multiplayer
VITE_SOCKET_SERVER_URL=http://localhost:3002  # or your Fly.io URL in production

# Optional (not currently used)
GEMINI_API_KEY=your_api_key_here
```

**Supabase Setup:**
1. Create a Supabase project at https://supabase.com
2. Run the SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql` - User profiles and auth
   - `supabase/migrations/002_game_rooms.sql` - Game rooms and spectators (Phase 2)
   - `supabase/migrations/003_fix_room_join_policy.sql` - Room joining policy fix
   - `supabase/migrations/003_social_features.sql` - Social features (Phase 3)
3. Get your URL and anon key from Project Settings → API
4. Row Level Security (RLS) policies are already configured in the migrations

### Online Multiplayer Server

The Socket.io server for online play is in `server.js`.

**Important:** For online multiplayer to work, you need to run BOTH the frontend dev server (`npm run dev`) AND the backend server (`node server.js`) simultaneously in separate terminals.

**Server Environment Setup:**
Create a `.env` file in the root directory (copy from `.env.example.server`):

```bash
PORT=3002

# Required for Phase 2 (persistent rooms, reconnection, spectator mode)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here  # NOT the anon key!
```

**Important:** The service role key should NEVER be exposed to clients. Only use it on the server.

**Run the server:**
```bash
node server.js          # Runs on port 3002 by default
```

**Expected output:**
```
╔════════════════════════════════════════╗
║   Akông Socket.io Server               ║
║   Port: 3002                           ║
║   Database: Connected ✓                ║
╚════════════════════════════════════════╝
```

**Phase 2 Features (requires Supabase connection):**
- ✅ JWT authentication validation
- ✅ Persistent game rooms in database
- ✅ Automatic reconnection with state restoration
- ✅ Spectator mode support
- ✅ Heartbeat/keep-alive

Note: The server will run without Supabase credentials, but Phase 2 features will be disabled.

### Deployment

The application is designed for a split deployment:
- **Frontend**: Vercel (or similar static host)
- **Backend**: Fly.io (or any Node.js host)
- **Database/Auth**: Supabase (managed PostgreSQL + Auth)

See DEPLOYMENT.md for complete deployment instructions including:
- Fly.io setup with `fly.toml` configuration
- Vercel environment variable configuration
- CORS and production considerations

## Architecture

### Authentication System (Phase 1 - Complete)

**Supabase Integration:**
- `services/supabase.ts`: Supabase client initialization and TypeScript types
- `services/authService.ts`: Authentication operations (signUp, signIn, signOut, profile management)
- `hooks/useAuth.ts`: React hook for auth state management with automatic session refresh
- `components/auth/AuthScreen.tsx`: Login/Register UI
- `components/auth/ProfilePage.tsx`: User profile modal with stats (rendered from AppRouter.tsx)

**Authentication Flow:**
1. App loads → `useAuth` hook checks for existing session
2. No session → Shows `AuthScreen` (login/register)
3. User signs up/in → Supabase Auth returns JWT token
4. Profile automatically created via database trigger (`handle_new_user()`)
5. Session persisted in localStorage, auto-refreshed by Supabase
6. All game modes now require authentication

**Database Schema (Supabase):**
- `profiles` table: Extends `auth.users` with username, display_name, avatar, stats (games played/won/lost/drawn), ELO rating
- `game_rooms` table (Phase 2): Persistent online game rooms with status tracking (waiting/playing/finished/abandoned)
- `game_spectators` table (Phase 2): Users watching games in progress
- Row Level Security (RLS) enabled on all tables
- Automatic profile creation trigger on user signup

**Protected Routes:**
The game is only accessible after authentication. The `useAuth` hook manages loading states to prevent flashing between auth/game screens.

### Core Game Logic (`services/songoLogic.ts`)

The heart of the game. Contains:

- **Game state management**: Board representation (14 pits), scores, current player, game status
- **Move validation**: Complex rule enforcement including solidarity (feeding starved opponent), capture restrictions, and empty-pit checks
- **Move execution**: Seed distribution with wraparound, capture logic, and special cases (auto-capture on complete laps)
- **Animation step generation**: Produces step-by-step animation sequences for UI rendering
- **Stalemate resolution**: Handles endgame when no moves available

**Key constants:**
- `PITS_PER_PLAYER = 7` (indices 0-6 for Player One, 7-13 for Player Two)
- `INITIAL_SEEDS = 5` (35 seeds per player at start)
- `WINNING_SCORE = 36` (need >35 to win)

**Critical rules implemented:**
- **Solidarity (Le Un)**: When a player has only 1 seed in their last pit, they auto-capture it. Opponent MUST feed them on next turn (if possible)
- **Capture**: If last seed lands on opponent's side making that pit 2, 3, or 4 seeds total, capture those seeds (and chain backwards if prior pits qualify)
- **Drought prevention**: Cannot capture ALL opponent seeds if it leaves them with no moves (unless unavoidable)

### AI Implementation (`services/ai.ts`)

Minimax algorithm with alpha-beta pruning and iterative deepening:

- **Time-boxed search**: 500ms limit per move
- **Iterative deepening**: Starts at depth 1, increases until time runs out or max depth reached
- **Move ordering**: Prioritizes moves that immediately increase score for better pruning
- **Difficulty levels**: Controlled by max depth (Easy: 2, Medium: 4, Hard: 12)

The AI evaluates positions primarily on score differential (1000x weight) with game-over states valued at ±1,000,000.

### State Management Pattern (`App.tsx`)

Uses React hooks with a critical **ref pattern** to avoid stale closures:

- `gameStateRef`: Always holds latest state for async callbacks (AI, online events)
- `latestHandlersRef`: Updated with current handler versions for event listeners
- This prevents bugs where event handlers capture old state/props

**Game flow:**
1. User selects mode → `startGame(mode)` initializes state
2. User/AI clicks pit → `handlePitClick()` validates → `playMove()` sends to appropriate handler
3. Local/AI: `playMoveAnimation()` renders step-by-step
4. Online Host: Sends authoritative state to guest
5. Online Guest: Sends move intent to host, receives animated result

### Component Structure

```
index.tsx                        # Entry point, renders AppRouter
AppRouter.tsx                    # Main router: routes, auth protection, layout management
├── App.tsx                      # Game orchestrator: menus, game modes, state management
├── hooks/
│   └── useAuth.ts               # Authentication state hook
├── pages/
│   ├── LandingPage.tsx          # Home page: Hero, Features, How to Play, CTA
│   └── RulesPage.tsx            # Game rules explanation page
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           # Top navigation with burger menu (responsive)
│   │   ├── Footer.tsx           # Footer with branding and links
│   │   └── Layout.tsx           # Page wrapper (Navbar + content + Footer)
│   ├── auth/
│   │   ├── AuthScreen.tsx       # Login/Register forms
│   │   └── ProfilePage.tsx      # User profile with stats
│   ├── Board.tsx                # Visual board layout, score displays, pit rendering
│   ├── Pit.tsx                  # Individual pit with seeds, click handlers, hover effects
│   └── Hand.tsx                 # Animated floating hand showing seeds during moves
├── services/
│   ├── supabase.ts              # Supabase client + types (Profile, GameRoom, GameSpectator)
│   ├── authService.ts           # Auth operations
│   ├── roomService.ts           # Game room persistence (Phase 2)
│   ├── songoLogic.ts            # Core game logic
│   ├── ai.ts                    # Minimax AI
│   ├── audioService.ts          # Sound effects
│   └── onlineManager.ts         # Socket.io client with reconnection
```

### Animation System

Moves are broken into discrete steps (`AnimationStep[]`):
- `PICKUP`: Remove seeds from source pit
- `MOVE`: Transition hand between pits
- `DROP`: Place seed in target pit
- `CAPTURE_PHASE`: Visual indicator before capture
- `SCORE`: Update score counter

Animation speed adjusts based on move complexity (more seeds = faster per-step) and simulation mode settings.

### Audio Service (`services/audioService.ts`)

Web Audio API implementation:
- Generates tones for pickup/drop/capture/win events
- Lazy initialization on first user interaction (browser requirement)
- Mute toggle persists across moves

### Online Multiplayer Architecture

**Phase 2 Implementation (✅ Complete - 23 Nov 2025):**

**Client (`services/onlineManager.ts`):**
- Socket.io client with JWT authentication
- Automatic reconnection with state restoration
- Heartbeat/keep-alive every 30 seconds
- Methods: `init(userId)`, `createRoom(userId)`, `joinRoom(roomCode, userId)`, `spectateRoom()`, `leaveSpectating()`
- Configured via `VITE_SOCKET_SERVER_URL` environment variable

**Server (`server.js`):**
- Express + Socket.io backend with Supabase integration
- JWT token validation on connection (`socket.handshake.auth.token`)
- Persistent game state saved to database after each move
- Reconnection support with state restoration from DB
- Events: `create_room`, `join_room`, `spectate_room`, `game_event`, `reconnect_to_room`, `heartbeat`
- Socket-to-user mapping for reconnection handling

**Game Room Service (`services/roomService.ts`):**
- Database operations for persistent rooms
- Functions: `createGameRoom()`, `joinGameRoom()`, `getRoomByCode()`, `getActiveRooms()`
- State persistence: `updateGameState()`, `finishGame()`, `abandonGame()`
- Spectator management: `addSpectator()`, `removeSpectator()`, `getSpectators()`
- Realtime subscriptions: `subscribeToRoom()`, `subscribeToSpectators()`

**UI Integration (`hooks/useOnlineGame.ts`):**
- Custom React hook encapsulating all Phase 2 logic
- Handles room creation/joining with DB persistence
- Automatic state saving after each move
- Reconnection handling with toast notifications
- Spectator mode UI (badge, disabled controls)
- Abandon game functionality with confirmation modal

**Game Flow:**
1. Host creates room → Saved to `game_rooms` table (status: 'waiting')
2. Guest joins → Room status updated to 'playing'
3. Each move → Host saves `game_state` JSONB to database via `useOnlineGame.saveGameStateToDB()`
4. Disconnect → Room persists in DB
5. Reconnect → State restored from `game_rooms.game_state` automatically
6. Game ends → Room status set to 'finished' or 'abandoned' via `finishGameInDB()`
7. 3rd+ player → Joins as spectator automatically

**Phase 2 Status:** ✅ Fully complete with UI integration (see PHASE2_IMPLEMENTATION.md for details)

## Game Modes

1. **LocalMultiplayer**: Two players alternate on same device
2. **VsAI**: Human vs computer with difficulty selection
3. **Simulation**: Laboratory mode - manually edit board/scores, toggle auto-play, adjust speed
4. **OnlineHost**: Creates room, authoritative game state
5. **OnlineGuest**: Joins room, sends move requests

## Important Patterns & Conventions

### Player Representation

```typescript
enum Player {
  One = 0,  // Bottom player, pits 0-6, moves right-to-left visually
  Two = 1   // Top player, pits 7-13, moves left-to-right visually
}
```

Board indices are linear (0-13) but visual representation inverts for Player Two.

### Move Execution is Pure

`executeMove(state, pitIndex)` always returns a NEW `GameState` object - never mutates. This ensures React state updates correctly and enables move simulation for AI.

### Animation & User Input Blocking

`isAnimating` state prevents clicks during animations. AI moves are also blocked during animations via the useEffect dependency.

### Simulation Mode Setup Flow

1. Start in `GameStatus.Setup`
2. User edits pits/scores via modal
3. Click "LANCER SIMULATION" → saves snapshot to `simulationInitialState`
4. Switches to `GameStatus.Playing`
5. "RECOMMENCER" restores from snapshot

### TypeScript Path Alias

`@/*` maps to project root (configured in vite.config.ts and tsconfig.json). Use for imports if needed.

## Testing Game Logic

To test specific game scenarios, use **Simulation Mode**:

1. Start game → Select "Simulation / Labo"
2. Click pits or scores to edit values
3. Toggle starting player (BAS/HAUT buttons)
4. Set AI difficulty and speed
5. Launch simulation to see AI play out the position

This is invaluable for debugging edge cases like solidarity feeding, capture chains, or endgame stalemates.

## Frontend Architecture & Routing

### React Router Setup

**Routes:**
- `/` - Landing Page (public)
- `/rules` - Rules Page (public)
- `/game` - Game Page (protected, requires authentication)
- `*` - Catch-all redirects to `/`

**Layout System:**
- `Layout.tsx` wraps pages with `Navbar` + content + `Footer`
- Game page (`App.tsx`) doesn't use Layout (fullscreen experience)
- `AppRouter.tsx` manages authentication checks and route protection

**Navigation:**
- `Navbar.tsx` includes:
  - Logo with "AKÔNG" branding
  - Desktop nav links (Accueil, Jouer, Règles)
  - Mobile burger menu (responsive)
  - Profile button (when authenticated)
  - Active route highlighting

**Pages:**
- `LandingPage.tsx`: Hero section, Features grid, How to Play steps, Final CTA
- `RulesPage.tsx`: Comprehensive game rules with icons and sections

### Responsive Design

**Breakpoints (Tailwind):**
- Mobile: < 640px (base styles)
- sm: 640px+ (small tablets)
- md: 768px+ (tablets)
- lg: 1024px+ (desktop)
- xl: 1280px+ (large desktop)

**Mobile Optimizations:**
- Board: `max-w-[98vw]` prevents overflow on small screens
- Pits: Increased from 72px to 80px width for better touch targets (44px+ recommended)
- Navbar: Burger menu auto-collapses on mobile
- All text uses responsive sizing (text-base sm:text-lg, etc.)
- Modals: `max-h-[90vh]` with `overflow-y-auto` for proper scrolling

### Animations & Feedback

**Libraries Used:**
- **Framer Motion**: Page transitions and animations
- **React Hot Toast**: Elegant notification system
- **Canvas Confetti**: Victory celebrations

**Implemented Effects:**
- **Page Transitions**: Smooth fade + slide animations between routes using AnimatePresence
- **Toast Notifications**: Global ToastProvider with styled notifications (success, error, loading)
- **Victory Confetti**: Explosive celebration effect when a player wins (triggered in `App.tsx`)

**Files:**
- `components/ToastProvider.tsx`: Toast notification wrapper with custom styling (wraps entire app in index.tsx)
- `utils/confetti.ts`: Confetti utility functions (victoryConfetti, simpleConfetti, etc.)
- `AppRouter.tsx`: Animated routes with Framer Motion, manages profile modal state
- `index.tsx`: App entry point wrapped with ToastProvider for global notifications

**Usage Examples:**
```typescript
// Toast notifications
import toast from 'react-hot-toast';
toast.success('Partie créée !');
toast.error('Erreur de connexion');
toast.loading('Connexion en cours...');

// Confetti
import { victoryConfetti } from './utils/confetti';
victoryConfetti(); // Fires on victory
```

## Known Quirks & Inconsistencies

- **Gemini API**: Mentioned in .env.example and vite.config.ts but not actively used in game logic
- **Online guest view**: The `invertView` prop affects visual rendering only, not game logic indices
- **Audio initialization**: Requires user interaction (browser requirement) - first click enables sound
- **Profile stats**: Database schema includes games_played/won/lost/drawn and ELO fields, but these aren't auto-updated yet (Phase 3+)
- **Game name**: Official name is "AKÔNG" (with circumflex) - ensure consistency across all UI

## Working with Phase 2 (Robust Online Multiplayer) ✅ Complete

**Quick Reference:** See `PHASE2_IMPLEMENTATION.md` for complete documentation.

### Key Files
- `hooks/useOnlineGame.ts` - Main Phase 2 logic (custom hook)
- `services/roomService.ts` - Database operations for persistent rooms
- `supabase/migrations/002_game_rooms.sql` - Database schema
- `.env.example.server` - Server environment template
- `server.js` - JWT auth + DB persistence
- `services/onlineManager.ts` - Socket.io client with reconnection

### Using the Online Game Hook

The Phase 2 functionality is accessed via the `useOnlineGame` custom hook:

```typescript
import { useOnlineGame } from './hooks/useOnlineGame';

// In a component (see App.tsx for full example)
const onlineGame = useOnlineGame({
  user,
  profile,
  gameMode,
  gameStateRef,
  latestHandlersRef,
  onGameStateUpdate: (state) => setGameState(state),
  onGameModeUpdate: (mode) => setGameMode(mode),
  onGameEnded: (state) => handleGameEnd(state),
});

// Create room
const { roomCode } = await onlineGame.handleCreateRoom();

// Join room
await onlineGame.handleJoinRoom();

// Save state after each move (automatic)
onlineGame.saveGameStateToDB(gameState);

// Finish game
await onlineGame.finishGameInDB(winnerId);
```

### Integration Complete ✅
- ✅ Room creation with DB persistence (`handleCreateRoom`)
- ✅ Room joining with DB persistence (`handleJoinRoom`)
- ✅ Automatic state saving after each move
- ✅ Reconnection UI with toast notifications
- ✅ Spectator mode fully functional
- ✅ Abandon detection with modal confirmation

## Working with Authentication

### Adding New Profile Fields
1. Update the `Profile` interface in `services/supabase.ts`
2. Add the column to the `profiles` table via Supabase SQL editor or migration
3. Update RLS policies if needed
4. Modify `ProfilePage.tsx` to display/edit the new field

### Protecting New Features
Use the `useAuth` hook in components that need authentication:
```typescript
const { user, profile, loading, isAuthenticated } = useAuth();

if (loading) return <div>Loading...</div>;
if (!isAuthenticated) return <div>Please log in</div>;
```

### Accessing User Data in Game Logic
The `user` and `profile` objects from `useAuth` are available in `App.tsx`. Pass them down to components as props or use the hook directly in child components.

## Development Roadmap

This project follows a phased development approach with two parallel tracks:

### Backend Roadmap (ROADMAP.md)
- **Phase 1** ✅: Authentication & User Profiles (COMPLETE)
- **Phase 2** ✅: Robust online multiplayer (persistent rooms, reconnection, spectator mode) (COMPLETE)
- **Phase 3** 📅: Social features (lobby, invitations, chat)
- **Phase 4** 📅: Gamification (ELO, leaderboards, ranked matchmaking, achievements)
- **Phase 5** 📅: Advanced features (tournaments, friends system, replays)

### Frontend Roadmap (FRONTEND_ROADMAP.md)
- **Phase 1** ✅: Landing Page (COMPLETE)
- **Phase 2** ✅: Navigation & Routing (COMPLETE)
- **Phase 3** ✅: Mobile Responsivity (COMPLETE)
- **Phase 4** ✅: Animations & Micro-interactions (COMPLETE)
- **Phase 5** 📅: Accessibility (a11y)
- **Phase 6** 📅: Performance Optimization
- **Phase 7** 📅: PWA (Progressive Web App)

**Progress:** 4/7 frontend phases complete (57%)

When implementing new features, refer to ROADMAP.md for database schemas and FRONTEND_ROADMAP.md for UI/UX details.

## Code Style Notes

- French language used for UI messages (game is "Akong", messages like "Joueur 1", "Nouvelle partie")
- Tailwind CSS for all styling (dark theme: gray-900 background, amber accents)
- Heavy use of TypeScript enums for type safety (Player, GameStatus, GameMode)
- Functional components with hooks throughout (no class components)
- Console logs use `[ServiceName]` prefix for debugging (e.g., `[useAuth]`, `[onlineManager]`)
