import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook to block navigation when a game is in progress
 * Prevents accidental navigation away from an active game
 *
 * Note: This uses beforeunload for browser navigation and
 * popstate for browser back/forward buttons.
 * Internal React Router links are prevented by hiding the navbar.
 */
export function useNavigationBlocker(
  isGameInProgress: boolean,
  onNavigationAttempt?: () => void
) {
  const location = useLocation();
  const navigate = useNavigate();
  const isGameInProgressRef = useRef(isGameInProgress);
  const onNavigationAttemptRef = useRef(onNavigationAttempt);

  // Keep refs updated
  useEffect(() => {
    isGameInProgressRef.current = isGameInProgress;
    onNavigationAttemptRef.current = onNavigationAttempt;
  }, [isGameInProgress, onNavigationAttempt]);

  // Block browser navigation (refresh/close tab)
  useEffect(() => {
    if (!isGameInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard way to trigger confirmation dialog
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGameInProgress]);

  // Block browser back/forward buttons
  useEffect(() => {
    if (!isGameInProgress || location.pathname !== '/game') return;

    const handlePopState = (e: PopStateEvent) => {
      if (isGameInProgressRef.current) {
        // Prevent navigation by pushing current state back
        window.history.pushState(null, '', location.pathname);

        // Call optional callback
        if (onNavigationAttemptRef.current) {
          onNavigationAttemptRef.current();
        }
      }
    };

    // Add a state to enable popstate blocking
    window.history.pushState(null, '', location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isGameInProgress, location.pathname]);
}
