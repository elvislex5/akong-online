# Project Overview

This project is a web-based implementation of the traditional African strategy game "Songo". It is built with React, TypeScript, and Vite for the frontend, and uses Node.js with Socket.io for real-time multiplayer functionality. The application also includes an AI opponent using the Minimax algorithm with alpha-beta pruning.

The application is structured as a single-page application (SPA) with client-side routing. It features different game modes, including local multiplayer, vs. AI, and online multiplayer. User authentication is handled using Supabase.

## Building and Running

### Prerequisites

- Node.js (v20 or higher)
- npm (or a compatible package manager)

### Frontend

To run the frontend development server:

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:3000`.

### Backend

The backend server is required for online multiplayer. To run the backend server:

1.  In a separate terminal, start the server:
    ```bash
    node server.js
    ```

The server will run on `http://localhost:3002`.

## Development Conventions

-   **Styling**: The project uses Tailwind CSS for styling.
-   **State Management**: The main application state is managed within the `App.tsx` component using React hooks.
-   **Routing**: Client-side routing is handled by `react-router-dom`.
-   **Authentication**: Authentication is implemented using Supabase. The `useAuth` hook provides authentication state and user information to the components.
-   **AI**: The AI logic is located in `services/ai.ts` and uses the Minimax algorithm with alpha-beta pruning.
-   **Game Logic**: The core game logic is implemented in `services/songoLogic.ts`.
-   **Multiplayer**: Real-time multiplayer is handled by a Node.js server with Socket.io. The client-side multiplayer logic is in `services/onlineManager.ts`.
