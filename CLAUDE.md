# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Akong** is a web-based implementation of the traditional African strategy board game **Songo** (MPEM variant). This is a React + TypeScript application built with Vite, featuring:

- Local multiplayer (2 players on same device)
- AI opponent with multiple difficulty levels
- Online multiplayer via Socket.io
- Simulation/Laboratory mode for testing game positions
- Rich animations and audio feedback

The game involves capturing seeds by strategic distribution around a 14-pit board, with complex rules including solidarity (feeding), capture mechanics, and stalemate resolution.

## Development Commands

### Running the Application

```bash
npm install              # Install dependencies
npm run dev             # Start development server (default: http://localhost:3000)
npm run build           # Build for production
npm run preview         # Preview production build
```

### Environment Setup

Create a `.env.local` file in the root directory and add your Gemini API key (referenced in README but not actively used in current code):

```
GEMINI_API_KEY=your_api_key_here
```

### Online Multiplayer Server

The Socket.io server for online play is in `server.js`. To run it:

```bash
node server.js          # Runs on port 3002 by default (configurable via PORT env var)
```

Note: The required packages (`express`, `socket.io`, `cors`) are now included in package.json.

## Architecture

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
App.tsx                 # Main orchestrator: menus, game modes, state management
├── Board.tsx           # Visual board layout, score displays, pit rendering
│   ├── Pit.tsx         # Individual pit with seeds, click handlers, hover effects
│   └── Hand.tsx        # Animated floating hand showing seeds during moves
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

### Online Multiplayer (`services/onlineManager.ts`)

Uses Socket.io client connecting to a separate Socket.io server (server.js):
- **Host-authoritative**: Host executes moves and broadcasts results
- **Guest sends intents**: Guest sends `MOVE_INTENT`, receives `REMOTE_MOVE` with new state + animation steps
- **Synchronization**: Full state sync on connection via `SYNC_STATE`
- Room IDs generated client-side (6-char random strings)
- Configured via `VITE_SOCKET_SERVER_URL` environment variable (defaults to localhost in development)

**Message types:** `SYNC_STATE`, `MOVE_INTENT`, `REMOTE_MOVE`, `RESTART`, `PLAYER_JOINED`

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

## Known Quirks

- README mentions Gemini API in .env setup but it's not actively integrated in the game logic
- The inversion logic for online guest view (`invertView` prop) affects visual rendering only, not game logic indices
- Audio initialization requires user interaction - first click enables sound
- Vite dev server runs on port 3000 (vite.config.ts:9), but README.md incorrectly states 3001
- Socket.io server defaults to port 3002 (server.js:56) unless PORT env var is set

## Code Style Notes

- French language used for UI messages (game is "Akong", messages like "Joueur 1", "Nouvelle partie")
- Tailwind CSS for all styling (dark theme: gray-900 background, amber accents)
- Heavy use of TypeScript enums for type safety (Player, GameStatus, GameMode)
- Functional components with hooks throughout (no class components)
