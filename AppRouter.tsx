import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import RulesPage from './pages/RulesPage';
import App from './App'; // The game page
import AuthScreen from './components/auth/AuthScreen';
import ProfilePage from './components/auth/ProfilePage';
import type { Profile } from './services/supabase';

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
};

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
  onShowProfile: () => void;
}> = ({ isAuthenticated, onShowProfile }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing Page with Layout */}
        <Route
          path="/"
          element={
            <Layout
              isAuthenticated={isAuthenticated}
              onShowProfile={onShowProfile}
            >
              <AnimatedPage>
                <LandingPage />
              </AnimatedPage>
            </Layout>
          }
        />

        {/* Rules Page with Layout */}
        <Route
          path="/rules"
          element={
            <Layout
              isAuthenticated={isAuthenticated}
              onShowProfile={onShowProfile}
            >
              <AnimatedPage>
                <RulesPage />
              </AnimatedPage>
            </Layout>
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
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(profile);

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
      {/* Animated Routes */}
      <AnimatedRoutes
        isAuthenticated={isAuthenticated}
        onShowProfile={() => setShowProfile(true)}
      />

      {/* Profile Modal (shown when user clicks profile button) */}
      {showProfile && userProfile && (
        <ProfilePage
          profile={userProfile}
          onClose={() => setShowProfile(false)}
          onProfileUpdated={(updatedProfile) => {
            setUserProfile(updatedProfile);
            setShowProfile(false);
          }}
        />
      )}
    </BrowserRouter>
  );
};

export default AppRouter;
