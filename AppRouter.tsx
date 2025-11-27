import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import UnifiedNavbar from './components/layout/UnifiedNavbar';
import type { Profile } from './services/supabase';

// Lazy load heavy components for better performance
const LandingPageRevolutionary = lazy(() => import('./pages/LandingPageRevolutionary'));
const RulesPageImmersive = lazy(() => import('./pages/RulesPageImmersive'));
const LobbyComingSoon = lazy(() => import('./pages/LobbyComingSoon'));
const App = lazy(() => import('./App')); // The game page
const AuthScreen = lazy(() => import('./components/auth/AuthScreen'));
const ProfilePage = lazy(() => import('./components/auth/ProfilePage'));
const InvitationSystem = lazy(() => import('./components/InvitationSystem'));
const MusicPlayer = lazy(() => import('./components/effects/MusicPlayer'));
const CustomCursor = lazy(() => import('./components/effects/CustomCursor'));
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-gray-400">Chargement...</p>
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
        {/* Landing Page - Revolutionary Version */}
        <Route
          path="/"
          element={
            <AnimatedPage>
              <LandingPageRevolutionary />
            </AnimatedPage>
          }
        />

        {/* Rules Page - Immersive Version */}
        <Route
          path="/rules"
          element={
            <AnimatedPage>
              <RulesPageImmersive />
            </AnimatedPage>
          }
        />

        {/* Lobby Page - Coming Soon */}
        <Route
          path="/lobby"
          element={
            <AnimatedPage>
              <LobbyComingSoon />
            </AnimatedPage>
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
              // Redirect to auth if not authenticated
              <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <AuthScreen />
              </div>
            )
          }
        />

        {/* Catch-all: redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppRouter: React.FC = () => {
  const { user, authUser, profile, loading, isAuthenticated } = useAuth();
  const [userProfile, setUserProfile] = useState<Profile | null>(profile);

  // Initialize presence and socket connection for authenticated users (Phase 3)
  usePresence(user?.id || null, isAuthenticated);

  // Update profile when auth profile changes
  React.useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        {/* Global Fixed Background - Akong Pattern */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/akong.png)',
              filter: 'brightness(0.3) blur(2px)',
            }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />
        </div>

        {/* Global Effects */}
        <CustomCursor />
        <MusicPlayer autoplay={false} />

        {/* Unified Navbar - Always Visible */}
        <UnifiedNavbar
          isAuthenticated={isAuthenticated}
        />

        {/* Animated Routes */}
        <AnimatedRoutes
          isAuthenticated={isAuthenticated}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
        />

        {/* Global Invitation System (Phase 3) */}
        {isAuthenticated && <InvitationSystem />}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
