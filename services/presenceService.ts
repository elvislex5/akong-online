/**
 * presenceService.ts
 * Manages user presence tracking (online, in_game, offline)
 * Phase 3a - Social Features
 */

import { supabase } from './supabase';
import type { UserPresence, OnlineUser, PresenceStatus } from './supabase';

/**
 * Set user status to online
 */
export async function setUserOnline(userId: string): Promise<void> {

  const { error } = await supabase.rpc('set_user_online', {
    p_user_id: userId
  });

  if (error) {
    console.error('[presenceService] Error setting user online:', error);
    throw error;
  }
}

/**
 * Set user status to offline
 */
export async function setUserOffline(userId: string): Promise<void> {

  const { error } = await supabase.rpc('set_user_offline', {
    p_user_id: userId
  });

  if (error) {
    console.error('[presenceService] Error setting user offline:', error);
    throw error;
  }
}

/**
 * Set user status to in_game
 */
export async function setUserInGame(userId: string, roomId: string): Promise<void> {

  const { error } = await supabase.rpc('set_user_in_game', {
    p_user_id: userId,
    p_room_id: roomId
  });

  if (error) {
    console.error('[presenceService] Error setting user in game:', error);
    throw error;
  }
}

/**
 * Get user's current presence status
 */
export async function getUserPresence(userId: string): Promise<UserPresence | null> {
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No presence record yet - user is offline
      return null;
    }
    console.error('[presenceService] Error getting user presence:', error);
    throw error;
  }

  return data as UserPresence;
}

/**
 * Get all online users (excluding current user)
 */
export async function getOnlineUsers(excludeUserId?: string): Promise<OnlineUser[]> {
  const { data, error } = await supabase.rpc('get_online_users', {
    p_exclude_user_id: excludeUserId || null
  });

  if (error) {
    console.error('[presenceService] Error getting online users:', error);
    throw error;
  }

  return (data || []) as OnlineUser[];
}

/**
 * Subscribe to presence changes for a specific user
 */
export function subscribeToUserPresence(
  userId: string,
  callback: (presence: UserPresence | null) => void
) {

  const channel = supabase
    .channel(`presence:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
        } else {
          callback(payload.new as UserPresence);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all online users changes
 */
export function subscribeToOnlineUsers(
  callback: (users: OnlineUser[]) => void
) {

  const channel = supabase
    .channel('online_users')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      },
      async () => {
        // When presence changes, refetch online users
        try {
          const users = await getOnlineUsers();
          callback(users);
        } catch (error) {
          console.error('[presenceService] Error refetching online users:', error);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Aggregate count of currently online users by status. Used by the navbar
 * "247 en ligne · 18 en partie" indicator.
 */
export interface PresenceCounts {
  online: number;   // status = 'online' (idle on the platform)
  inGame: number;   // status = 'in_game'
  total: number;    // online + inGame
}

export async function getPresenceCounts(): Promise<PresenceCounts> {
  const { data, error } = await supabase
    .from('user_presence')
    .select('status')
    .in('status', ['online', 'in_game']);

  if (error) {
    console.error('[presenceService] getPresenceCounts error:', error);
    return { online: 0, inGame: 0, total: 0 };
  }
  const rows = (data as { status: PresenceStatus }[]) || [];
  const online = rows.filter((r) => r.status === 'online').length;
  const inGame = rows.filter((r) => r.status === 'in_game').length;
  return { online, inGame, total: online + inGame };
}

/**
 * Update last_seen timestamp (heartbeat)
 */
export async function updateLastSeen(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_presence')
    .update({ last_seen: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('[presenceService] Error updating last seen:', error);
    // Don't throw - this is just a heartbeat
  }
}

/**
 * Clean up stale presence (users offline > 5 minutes)
 * Should be called periodically by the server
 */
export async function cleanupStalePresence(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_stale_presence');

  if (error) {
    console.error('[presenceService] Error cleaning up stale presence:', error);
    throw error;
  }

  return data || 0;
}
