import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { addSpectator, removeSpectator, getSpectators } from '../services/roomService';

interface Args {
  roomId: string | null;
  userId: string | null;
}

/**
 * Track the live count of spectators for a single room.
 * - Inserts a row in `game_spectators` while the user is on this room
 * - Removes it on cleanup / room change / unmount
 * - Subscribes to INSERT/DELETE for live count updates
 *
 * Falls back to anonymous mode (no insert, only listen) when userId is null.
 */
export function useSpectatorPresence({ roomId, userId }: Args): { count: number } {
  const [count, setCount] = useState(0);

  // Track join/leave for this user
  useEffect(() => {
    if (!roomId || !userId) return;

    let cancelled = false;
    let didInsert = false;

    (async () => {
      try {
        await addSpectator(roomId, userId);
        if (!cancelled) didInsert = true;
      } catch (err) {
        // Already a spectator (UNIQUE constraint) → ignore
        console.warn('[useSpectatorPresence] addSpectator skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
      // Best-effort removal; we don't await
      if (didInsert) {
        removeSpectator(roomId, userId).catch((err) =>
          console.warn('[useSpectatorPresence] removeSpectator:', err)
        );
      }
    };
  }, [roomId, userId]);

  // Initial count + subscribe to changes
  useEffect(() => {
    if (!roomId) {
      setCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const list = await getSpectators(roomId);
        if (!cancelled) setCount(list.length);
      } catch (err) {
        console.error('[useSpectatorPresence] initial count:', err);
      }
    })();

    const channel = supabase
      .channel(`spectators:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_spectators', filter: `room_id=eq.${roomId}` },
        async () => {
          // Refetch count (cheap, small table)
          try {
            const list = await getSpectators(roomId);
            if (!cancelled) setCount(list.length);
          } catch (err) {
            console.error('[useSpectatorPresence] refetch count:', err);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { count };
}
