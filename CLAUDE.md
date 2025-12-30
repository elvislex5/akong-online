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
- Backend Phase 2 (Robust Online Multiplayer): ✅ Complete (November 2025)
- Backend Phase 3 (Social & Matchmaking): 📅 Next
- Frontend Phase 1 (Landing Page): ✅ Complete
- Frontend Phase 2 (Navigation & Routing): ✅ Complete
- Frontend Phase 3 (Mobile Responsivity): ✅ Complete
- Frontend Phase 4 (Animations): ✅ Complete
- Frontend Phase 5-7: 📅 Planned
- See ROADMAP.md, FRONTEND_ROADMAP.md, and PHASE2_IMPLEMENTATION.md for details.

## Quick Start (First Time Setup)

**New to this codebase? Start here:**

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd akong-online
   npm install
   ```

2. **Set up Supabase** (required for auth & online play)
   - Create account at https://supabase.com
   - Create new project
   - Run migrations in order from `supabase/migrations/`
   - Copy credentials to `.env.local` (see Environment Setup below)

3. **Run locally**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend (for online multiplayer)
   node server.js
   ```

4. **Access the game**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3002

**Quick test:** Try Local Multiplayer mode first (no setup needed), then test authentication before trying online multiplayer.

## Development Commands

### Running the Application

```bash
npm install              # Install dependencies
npm run dev             # Start frontend dev server (http://localhost:3000)
node server.js          # Start Socket.io server (http://localhost:3002) - separate terminal
npm run build           # Build for production
npm run preview         # Preview production build
```

**Critical:** For online multiplayer, run BOTH `npm run dev` AND `node server.js` in separate terminals.

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
   - `supabase/migrations/004_board_skins.sql` - Board skin customization system
   - `supabase/migrations/005_fix_new_user_board_skin.sql` - Auto-assign Classic Wood skin to new users
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

Note: Server runs without Supabase credentials, but Phase 2 features (persistent rooms, reconnection, spectators) will be disabled.

### Deployment

The application is designed for a split deployment:
- **Frontend**: Vercel (or similar static host)
- **Backend**: Fly.io (or any Node.js host)
- **Database/Auth**: Supabase (managed PostgreSQL + Auth)

See DEPLOYMENT.md for complete deployment instructions and DEPLOYMENT_CHECKLIST.md for step-by-step verification, including:
- Fly.io setup with `fly.toml` configuration
- Vercel environment variable configuration
- CORS and production considerations
- Post-deployment testing procedures

### Dependencies & Package Management

**When to run `npm install`:**
- After cloning the repository
- After pulling changes if `package.json` or `package-lock.json` changed
- After switching branches that modify dependencies
- If you encounter "module not found" errors

**Checking for updates:**
```bash
npm outdated  # See which packages have updates available
```

**Key dependencies:**
- React 19.2.0 (UI framework)
- Vite 6.2.0 (build tool & dev server)
- Socket.io 4.8.1 (realtime communication)
- Supabase 2.84.0 (authentication & database)
- Framer Motion 12.23.24 (animations)
- React Router 7.9.6 (routing)
- Tailwind CSS (via PostCSS, styling)

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
- `profiles` table: Extends `auth.users` with username, display_name, avatar, stats (games played/won/lost/drawn), ELO rating, selected_board_skin
- `game_rooms` table (Phase 2): Persistent online game rooms with status tracking (waiting/playing/finished/abandoned)
- `game_spectators` table (Phase 2): Users watching games in progress
- `board_skins` table: Available board skin themes with pricing and unlock status
- `user_board_skins` table: Tracks which skins each user has unlocked
- Row Level Security (RLS) enabled on all tables
- Automatic profile creation trigger on user signup
- Automatic "Classic Wood" board skin assignment to new users

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

- **Time-boxed search**: Configurable time limit (500ms to 8000ms depending on difficulty)
- **Iterative deepening**: Starts at depth 1, increases until time runs out or max depth reached
- **Move ordering**: Prioritizes moves that immediately increase score for better pruning
- **Transposition table**: 100k entries cache for position evaluation
- **Zobrist hashing**: Fast position hashing for cache lookups
- **Killer moves & History heuristic**: Advanced move ordering optimization

**Difficulty levels** (5 levels available):

| Level | Max Depth | Time Limit | Target Audience |
|-------|-----------|------------|-----------------|
| **Facile** | 4 | 500ms | Débutants |
| **Moyen** | 10 | 1500ms | Intermédiaires |
| **Difficile** | 18 | 3000ms | Avancés |
| **Expert** | 25 | 8000ms | Très forts joueurs - Vision stratégique long terme |
| **Légende** | 35 | 15000ms | Quasi-imbattable - Planification approfondie |

**Enhanced evaluation function** (14 strategic factors):

1. **Score differential** (1000x weight) - Primary winning objective
2. **Endgame bonus** (5000x) - Aggressive play when close to winning
3. **Seed control** (5-15x) - Dynamically weighted by game phase
4. **Pit distribution** (35x) - More active pits = more strategic options
5. **Concentration penalty** (15x) - Avoid over-concentration in single pit
6. **Capture opportunities** (25x per seed) - Immediate capture potential
7. **Multi-capture bonus** (40x per chain) - Chain captures heavily rewarded
8. **Vulnerability penalty** (15x) - Defensive awareness of opponent threats
9. **Critical threat penalty** (25x) - Severe penalty for dangerous chain threats
10. **Mobility bonus** (20x) - Number of available moves
11. **Mobility penalty** (100x) - Severe penalty when limited to ≤2 moves
12. **Positional bonus** - Middle pits (5x), last pit with 14+ seeds (20x)
13. **Setup bonus** (10x) - Detect and reward strategic positioning for future captures
14. **Tempo bonus** (30x) - Reward initiative and forcing opponent into bad positions

The AI now has sophisticated strategic understanding including game phase awareness (early/mid/late), chain capture detection, threat assessment, and multi-move planning capabilities.

### Reinforcement Learning System (`training/` directory) 🆕

**AlphaZero-style RL training** for creating superhuman AI:

**Architecture:**
```
training/
├── songo_env.py        # Python port of game logic
├── songo_net.py        # Neural network (Policy + Value heads)
├── mcts.py             # Monte Carlo Tree Search
├── self_play.py        # Self-play engine
├── train.py            # Training script
├── export_model.py     # Export for browser integration
├── requirements.txt    # Python dependencies
└── README.md           # Complete training guide
```

**Quick Start:**
```bash
cd training
pip install -r requirements.txt
python quick_start.bat  # Windows
# OR
bash quick_start.sh     # Linux/Mac
```

**Full Training:**
```bash
python train.py --num-iterations 100 --mcts-simulations 100
```

**Expected Results:**
- After 10 iterations (1-2h): ~70-80% vs random
- After 50 iterations (6-8h): ~95%+ vs random
- After 100 iterations (12-24h): Near-optimal play, ready for production

**Export to Browser:**
```bash
python export_model.py --checkpoint checkpoints/songo_latest.pt
```

Creates:
- `songo_model.json` - Weights for custom inference
- `songo_model.onnx` - For ONNX Runtime Web (recommended)
- `inference_example.ts` - TypeScript integration example

**Why RL?**
- **Discovers strategies** beyond human knowledge
- **No expert data needed** - learns from self-play
- **Continuously improves** - can retrain with more compute
- **Proven effective** - AlphaGo/AlphaZero dominated their domains

The RL system can potentially surpass even the strongest human players by exploring the full game tree space.

**Integration Status:**
- ✅ Training pipeline fully functional (standalone Python)
- ⏳ Browser integration pending - exported models can be loaded via ONNX Runtime Web
- 📝 See `training/README.md` and `training/GETTING_STARTED.md` for complete training workflow
- 🎯 Current AI uses minimax (not RL) - RL models will replace it in future versions

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
│   ├── useAuth.ts               # Authentication state hook
│   └── useBoardSkin.ts          # Board skin selection hook
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
│   ├── profile/
│   │   └── BoardSkinSelector.tsx # Board skin selection UI
│   ├── Board.tsx                # Visual board layout, score displays, pit rendering
│   ├── Pit.tsx                  # Individual pit with seeds, click handlers, hover effects
│   └── Hand.tsx                 # Animated floating hand showing seeds during moves
├── services/
│   ├── supabase.ts              # Supabase client + types (Profile, GameRoom, GameSpectator, BoardSkin)
│   ├── authService.ts           # Auth operations
│   ├── roomService.ts           # Game room persistence (Phase 2)
│   ├── boardSkinService.ts      # Board skin management
│   ├── songoLogic.ts            # Core game logic
│   ├── ai.ts                    # Minimax AI
│   ├── audioService.ts          # Sound effects
│   └── onlineManager.ts         # Socket.io client with reconnection
├── config/
│   └── boardSkinConfigs.ts      # Board skin position calibrations
```

### Animation & Audio

**Animation System:** Moves are broken into discrete steps (`AnimationStep[]`) - PICKUP, MOVE, DROP, CAPTURE_PHASE, SCORE. Animation speed adjusts based on move complexity.

**Audio Service:** Web Audio API generates tones for game events. Lazy initialization on first user interaction (browser requirement). See `services/audioService.ts`.

### Online Multiplayer Architecture (Phase 2 ✅ Complete)

**Architecture:** Custom hook pattern for separation of concerns
```
useOnlineGame.ts ─┬─→ roomService.ts → Supabase (DB persistence)
                  └─→ onlineManager.ts → server.js (Socket.io realtime)
```

**Key Components:**
- **`hooks/useOnlineGame.ts`**: Main integration point, manages all online game logic
- **`services/roomService.ts`**: Supabase operations (CRUD for game_rooms, spectators)
- **`services/onlineManager.ts`**: Socket.io client (JWT auth, reconnection, heartbeat)
- **`server.js`**: Socket.io server (JWT validation, state persistence, broadcast)

**Game Flow:**
1. Host creates → DB row (status: 'waiting') + Socket.io room
2. Guest joins → DB update (status: 'playing') + Socket connection
3. Each move → Host saves to DB (`game_state` JSONB) + broadcasts via Socket
4. Disconnect → Room persists in DB
5. Reconnect → State restored from DB automatically
6. Game ends → DB update (status: 'finished'/'abandoned')
7. 3rd+ player → Auto-joins as spectator

See PHASE2_IMPLEMENTATION.md for complete details.

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

**Tailwind Breakpoints:** sm: 640px | md: 768px | lg: 1024px | xl: 1280px

**Mobile Optimizations:**
- Board: `max-w-[98vw]`, pits 80px width (44px+ touch targets)
- Navbar: Burger menu on mobile
- Modals: `max-h-[90vh] overflow-y-auto`
- Responsive base font sizing: 14px mobile → 15px tablet → 16px desktop (index.html)
- Viewport: `user-scalable=yes, maximum-scale=5.0` for accessibility
- Landscape mode optimizations: Compact spacing, reduced text sizes to prevent scrolling
- Touch optimization: `touch-action: manipulation` to prevent zoom on double-tap

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

## Known Quirks & Constraints

- **Gemini API**: Mentioned in .env.example but not actively used
- **Online guest view**: `invertView` prop affects visual rendering only, not game logic indices
- **Audio initialization**: Requires user interaction (browser requirement)
- **Profile stats**: ELO and game counts exist in DB but aren't auto-updated yet (Phase 3+)
- **Game name**: Official name is "AKÔNG" (with circumflex)
- **Fly.io free tier**: Server auto-stops when inactive, ~2s cold start on reconnection
- **Mobile landscape**: Design optimized to fit entire board without scrolling on devices ≥360px width
- **AI Légende level**: Takes 10-15 seconds per move, shows "thinking" indicator during computation, explores up to 35 plies deep
- **AI Expert level**: Takes 5-8 seconds per move, explores up to 25 plies deep
- **AI time limits**: Expert and Légende levels use significantly more computation time for deep strategic analysis
- **Transposition table**: Increased to 500k entries for better position caching at high depths

## Working with Phase 2 (Robust Online Multiplayer) ✅ Complete

**Quick Reference:** See `PHASE2_IMPLEMENTATION.md` for complete documentation.

The Phase 2 functionality uses a **custom hook pattern** for better separation of concerns:

```
App.tsx → useOnlineGame.ts → roomService.ts → Supabase
                          ↘ onlineManager.ts → server.js
```

### Key Integration Points

**Main Hook:** `hooks/useOnlineGame.ts` encapsulates all Phase 2 logic
- `handleCreateRoom()` - Create + persist room to DB
- `handleJoinRoom()` - Join + update DB
- `saveGameStateToDB()` - Auto-save after each move (called from App.tsx:258)
- `finishGameInDB()` - Mark game as finished
- Automatic reconnection with state restoration

**Database Service:** `services/roomService.ts`
- All Supabase operations (CRUD for game_rooms, game_spectators)
- Realtime subscriptions for room updates

**Socket Client:** `services/onlineManager.ts`
- JWT authentication on connection
- Heartbeat (30s keep-alive)
- Reconnection handling

**Server:** `server.js`
- JWT validation
- State persistence after each move
- Spectator broadcast support

### Debugging Online Multiplayer

**Server logs:**
```bash
node server.js
# Look for: [Auth], [Room], [Game], [DB] prefixes
```

**Client logs:** Check browser console for `[onlineManager]`, `[roomService]` prefixes

**Common issues:**
- CORS errors → Check `server.js` origin configuration
- Reconnection fails → Verify JWT token in `socket.handshake.auth.token`
- State not saving → Check Supabase service key in server `.env`

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

## Board Skin Customization System

### Overview

The board skin system allows users to customize the appearance of the game board. Each skin has:
- **Visual theme**: Different board designs (Classic Wood, Original Dark, Futuriste, etc.)
- **Position calibration**: Precise pit and granary positions for each skin
- **Unlock mechanism**: Free skins (like Classic Wood) or premium skins requiring unlocks

### Default Board Skin

**New users automatically receive:**
- 🎨 **"Classic Wood"** (`/boards/classic.png`) - unlocked and selected by default
- 🎨 **"Original Dark"** (`/akong.png`) - also available as a free alternative

This is handled by the `handle_new_user()` trigger in migration `005_fix_new_user_board_skin.sql`.

### Key Files

**Services:**
- `services/boardSkinService.ts` - CRUD operations for board skins
  - `getAllBoardSkins()` - Get all available skins
  - `getUserUnlockedSkins(userId)` - Get skins unlocked by user
  - `selectBoardSkin(userId, skinId)` - Select a skin for use
  - `unlockBoardSkin(userId, skinId)` - Unlock a new skin

**Configuration:**
- `config/boardSkinConfigs.ts` - Position calibrations for each skin
  - `CLASSIC_CONFIG` - Positions for Classic Wood
  - `FUTURISTE_CONFIG` - Positions for Futuriste skin
  - `ORIGINAL_DARK_CONFIG` - Positions for Original Dark
  - `getBoardConfig(imageUrl)` - Get config for a skin

**Components:**
- `components/profile/BoardSkinSelector.tsx` - UI for selecting skins
- `hooks/useBoardSkin.ts` - React hook for managing board skin state

### Adding New Board Skins

1. **Add image to `/public/boards/`** (e.g., `myskin.png`)
2. **Calibrate positions** using `BoardCalibrationTool.tsx`
3. **Add configuration** to `boardSkinConfigs.ts`:
   ```typescript
   export const MY_SKIN_CONFIG: BoardSkinConfig = {
     skinId: 'myskin',
     skinName: 'My Skin',
     imageUrl: '/boards/myskin.png',
     pitPositions: { /* calibrated positions */ },
     granaryPositions: { /* calibrated positions */ }
   };
   ```
4. **Insert into database**:
   ```sql
   INSERT INTO board_skins (name, description, image_url, price, is_premium)
   VALUES ('My Skin', 'Description here', '/boards/myskin.png', 0, false);
   ```

## Development Roadmap

This project follows a phased development approach with two parallel tracks:

### Backend Roadmap (ROADMAP.md)
- **Phase 1** ✅: Authentication & User Profiles (COMPLETE)
- **Phase 2** ✅: Robust online multiplayer (persistent rooms, reconnection, spectator mode) (COMPLETE)
- **Phase 3** 📅: Social features (lobby, invitations, chat)
- **Phase 4** 📅: Gamification (ELO, leaderboards, ranked matchmaking, achievements)
- **Phase 5** 📅: Advanced features (tournaments, friends system, replays)

### Frontend Roadmap (FRONTEND_ROADMAP.md)
- **Phases 1-4** ✅: Landing Page, Navigation, Mobile Responsivity, Animations (COMPLETE - 57%)
- **Phases 5-7** 📅: Accessibility, Performance, PWA (PLANNED)

When implementing new features, refer to ROADMAP.md for database schemas and FRONTEND_ROADMAP.md for UI/UX details.

## Troubleshooting

### Common Issues

**"Module not found" or import errors after pulling changes**
```bash
npm install  # Always run after pulling if package.json changed
```

**Online multiplayer not working**
1. Verify both terminals are running (`npm run dev` + `node server.js`)
2. Check `.env.local` has `VITE_SOCKET_SERVER_URL=http://localhost:3002`
3. Check browser console for connection errors (look for Socket.io messages)
4. Verify server logs show "Database: Connected ✓"
5. Try clearing browser localStorage and refreshing

**Authentication not working / Session lost**
1. Verify Supabase credentials in `.env.local` are correct
2. Check all migrations have been run in Supabase SQL Editor
3. Clear browser localStorage: `localStorage.clear()` in console
4. Check Supabase dashboard for authentication errors
5. Verify RLS policies are enabled on `profiles` table

**AI taking too long on Légende/Expert levels**
This is expected behavior:
- **Légende**: 10-15 seconds per move (explores 35 plies deep)
- **Expert**: 5-8 seconds per move (explores 25 plies deep)
- Use Difficile (3s) or lower for faster games
- "Thinking..." indicator shows AI is computing

**Build fails on Windows**
Try clearing caches:
```bash
# Delete node_modules and lock file
rmdir /s /q node_modules
del package-lock.json

# Clean npm cache
npm cache clean --force

# Reinstall
npm install
```

**Port already in use (EADDRINUSE)**
```bash
# Frontend (port 3000)
netstat -ano | findstr :3000   # Find process ID
taskkill /PID <process-id> /F  # Kill it

# Backend (port 3002)
netstat -ano | findstr :3002
taskkill /PID <process-id> /F
```

**Vite dev server not hot-reloading**
1. Check file paths don't have special characters
2. Try restarting the dev server
3. Clear browser cache (Ctrl+Shift+R)
4. Check `.gitignore` isn't excluding watched files

**Supabase connection timeout**
1. Check internet connection
2. Verify Supabase project is not paused (free tier pauses after inactivity)
3. Check SUPABASE_URL and keys are correct
4. Try regenerating the anon key in Supabase dashboard

## Code Style Notes

- French language used for UI messages (game is "Akong", messages like "Joueur 1", "Nouvelle partie")
- Tailwind CSS for all styling (dark theme: gray-900 background, amber accents)
- Heavy use of TypeScript enums for type safety (Player, GameStatus, GameMode)
- Functional components with hooks throughout (no class components)
- Console logs use `[ServiceName]` prefix for debugging (e.g., `[useAuth]`, `[onlineManager]`)
