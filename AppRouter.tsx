import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './contexts/AuthContext';
import { usePresence } from './hooks/usePresence';
import { GameProvider, useGameContext } from './contexts/GameContext';
import { Navbar } from './components/shell/Navbar';
import { Footer } from './components/shell/Footer';
import { EmailVerificationBanner } from './components/auth/EmailVerificationBanner';
import { SkipLink } from './components/accessibility/SkipLink';
import ErrorBoundary from './components/ErrorBoundary';
import type { Profile } from './services/supabase';

// Lazy load heavy components for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage'));
const TournamentDetailPage = lazy(() => import('./pages/TournamentDetailPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ClaimAccountPage = lazy(() => import('./pages/ClaimAccountPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const PuzzlePage = lazy(() => import('./pages/PuzzlePage'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const GameHistoryPage = lazy(() => import('./pages/GameHistoryPage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const App = lazy(() => import('./App')); // The game page
const AuthScreen = lazy(() => import('./components/auth/AuthScreen'));
const ProfilePage = lazy(() => import('./components/auth/ProfilePage'));
const InvitationSystem = lazy(() => import('./components/InvitationSystem'));
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'));

// Loading component — minimal, just a quiet hairline spinner
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-canvas flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-6 h-6 border-2 border-rule-strong border-t-accent rounded-full animate-spin" />
      <p className="text-ink-subtle text-xs tracking-[0.16em] uppercase">Chargement</p>
    </div>
  </div>
);

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
} as const;

// Animated page wrapper
const AnimatedPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="flex-1 flex flex-col outline-none"
    >
      {children}
    </motion.div>
  );
};

// Routes component (needs to be inside Router for useLocation)
const AnimatedRoutes: React.FC<{
  isAuthenticated: boolean;
  userProfile: Profile | null;
  setUserProfile: (profile: Profile) => void;
}> = ({ isAuthenticated, userProfile, setUserProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing Page */}
        <Route
          path="/"
          element={
            <AnimatedPage>
              <LandingPage />
            </AnimatedPage>
          }
        />

        {/* Rules Page */}
        <Route
          path="/rules"
          element={
            <AnimatedPage>
              <RulesPage />
            </AnimatedPage>
          }
        />

        {/* Lobby Page */}
        <Route
          path="/lobby"
          element={
            <AnimatedPage>
              <LobbyPage />
            </AnimatedPage>
          }
        />

        {/* Leaderboard Page */}
        <Route
          path="/leaderboard"
          element={
            <AnimatedPage>
              <LeaderboardPage />
            </AnimatedPage>
          }
        />

        {/* Tournaments */}
        <Route
          path="/tournaments"
          element={
            <AnimatedPage>
              <TournamentsPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/tournaments/:id"
          element={
            <AnimatedPage>
              <TournamentDetailPage />
            </AnimatedPage>
          }
        />

        {/* Learn Page */}
        <Route
          path="/learn"
          element={
            <AnimatedPage>
              <LearnPage />
            </AnimatedPage>
          }
        />

        {/* Puzzles Page */}
        <Route
          path="/puzzles"
          element={
            <AnimatedPage>
              <PuzzlePage />
            </AnimatedPage>
          }
        />

        {/* Watch Live Games (Spectator) */}
        <Route
          path="/watch"
          element={
            <AnimatedPage>
              <WatchPage />
            </AnimatedPage>
          }
        />

        {/* Games archive — public browser of all finished games */}
        <Route
          path="/games"
          element={
            <AnimatedPage>
              <GamesPage />
            </AnimatedPage>
          }
        />

        {/* Game History Page */}
        <Route
          path="/history"
          element={
            isAuthenticated ? (
              <AnimatedPage>
                <GameHistoryPage />
              </AnimatedPage>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Friends Page - Requires Authentication */}
        <Route
          path="/friends"
          element={
            isAuthenticated ? (
              <AnimatedPage>
                <FriendsPage />
              </AnimatedPage>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Profile Page - Full Page Version */}
        <Route
          path="/profile"
          element={
            isAuthenticated && userProfile ? (
              <AnimatedPage>
                <ProfilePage
                  profile={userProfile}
                  onClose={() => navigate(-1)}
                  onProfileUpdated={(updatedProfile) => setUserProfile(updatedProfile)}
                />
              </AnimatedPage>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Game Page - Requires Authentication */}
        <Route
          path="/game"
          element={
            isAuthenticated ? (
              // Game doesn't need Layout (Navbar/Footer) because it's fullscreen
              <AnimatedPage>
                <App />
              </AnimatedPage>
            ) : (
              <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
                <AuthScreen />
              </div>
            )
          }
        />

        {/* Auth flows (verify email + password reset) — public */}
        <Route
          path="/auth/verify-email"
          element={
            <AnimatedPage>
              <VerifyEmailPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <AnimatedPage>
              <ForgotPasswordPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/auth/reset-password"
          element={
            <AnimatedPage>
              <ResetPasswordPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/auth/claim"
          element={
            <AnimatedPage>
              <ClaimAccountPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/auth/oauth/callback"
          element={
            <AnimatedPage>
              <OAuthCallbackPage />
            </AnimatedPage>
          }
        />

        {/* Catch-all: redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

// Wrapper component to access GameContext inside Router
const AppRouterContent: React.FC<{
  isAuthenticated: boolean;
  userProfile: Profile | null;
  setUserProfile: (profile: Profile) => void;
}> = ({ isAuthenticated, userProfile, setUserProfile }) => {
  const { isGameInProgress } = useGameContext();

  return (
    <ErrorBoundary>
      <SkipLink />
      <Suspense fallback={<PageLoader />}>
        <div className="min-h-screen flex flex-col">
          {!isGameInProgress && <EmailVerificationBanner />}
          {!isGameInProgress && <Navbar isAuthenticated={isAuthenticated} />}

          <main id="main-content" className="flex-1 flex flex-col">
            <AnimatedRoutes
              isAuthenticated={isAuthenticated}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
            />
          </main>

          {!isGameInProgress && <Footer />}
        </div>

        {isAuthenticated && <InvitationSystem />}
        <PWAInstallPrompt />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Inner component — runs INSIDE AuthProvider so it can call useAuth().
 * Owns presence wiring + the local userProfile mirror that legacy code
 * still expects to be passed via prop.
 */
const AppShell: React.FC = () => {
  const { user, profile, loading, isAuthenticated } = useAuth();
  const [userProfile, setUserProfile] = useState<Profile | null>(profile);

  // Initialize presence and socket connection for authenticated users
  usePresence(user?.id || null, isAuthenticated);

  // Mirror context profile into local state (legacy ProfilePage prop API)
  React.useEffect(() => {
    setUserProfile(profile);
  }, [profile]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <GameProvider>
      <AppRouterContent
        isAuthenticated={isAuthenticated}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
      />
    </GameProvider>
  );
};

const AppRouter: React.FC = () => {
  // Order matters: BrowserRouter must wrap AuthProvider so AuthScreen's
  // <Link> ("Mot de passe oublié ?") can render. AuthProvider must wrap
  // GameProvider so the in-game UI can react to logout.
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
