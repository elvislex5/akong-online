/**
 * usePresence.ts
 * Hook for managing user presence (online, in_game, offline)
 * Phase 3a - Social Features
 */

import { useState, useEffect } from 'react';
import { onlineManager } from '../services/onlineManager';
import { setUserOnline, setUserOffline, subscribeToOnlineUsers } from '../services/presenceService';
import type { OnlineUser } from '../services/supabase';

/**
 * Hook to manage user presence
 * Automatically sets user online when authenticated and offline on unmount
 * Also initializes Socket.io connection for invitations
 */
export function usePresence(userId: string | null, isAuthenticated: boolean) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    console.log('[usePresence] Setting user online:', userId);

    // Initialize Socket.io connection (required for invitations)
    const initSocket = async () => {
      try {
        if (!onlineManager.isConnected()) {
          console.log('[usePresence] Initializing Socket.io connection...');
          await onlineManager.init(userId);
          setSocketConnected(true);
          console.log('[usePresence] Socket.io connected successfully');
        } else {
          setSocketConnected(true);
        }
      } catch (error) {
        console.error('[usePresence] Error initializing socket:', error);
        // Continue anyway - presence will still work via Supabase
      }
    };

    initSocket();

    // Set user online in database
    setUserOnline(userId)
      .then(() => {
        console.log('[usePresence] User set online successfully');
        setLoading(false);
      })
      .catch((error) => {
        console.error('[usePresence] Error setting user online:', error);
        setLoading(false);
      });

    // Subscribe to online users changes
    const unsubscribe = subscribeToOnlineUsers((users) => {
      console.log('[usePresence] Online users updated:', users.length);
      setOnlineUsers(users);
    });

    // Set user offline on unmount
    return () => {
      console.log('[usePresence] Setting user offline:', userId);
      setUserOffline(userId).catch((error) => {
        console.error('[usePresence] Error setting user offline:', error);
      });
      unsubscribe();

      // Disconnect socket
      if (socketConnected && onlineManager.isConnected()) {
        console.log('[usePresence] Disconnecting socket...');
        onlineManager.destroy();
      }
    };
  }, [userId, isAuthenticated]);

  return {
    onlineUsers,
    loading,
    socketConnected
  };
}
