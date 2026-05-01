import { useCallback, useEffect, useState } from 'react';
import {
  getSpectatorMessages,
  sendSpectatorMessage,
  subscribeToSpectatorMessages,
  type SpectatorMessage,
} from '../services/spectatorChatService';

interface Args {
  roomId: string | null;
  userId: string | null;
  username: string | null;
}

/**
 * Live spectator chat for a single room.
 * - Fetches the message history once on room change
 * - Subscribes to new INSERTs via Supabase Realtime
 * - Exposes send() that posts a new message
 */
export function useSpectatorChat({ roomId, userId, username }: Args) {
  const [messages, setMessages] = useState<SpectatorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset + load history whenever the room changes
  useEffect(() => {
    setMessages([]);
    setError(null);
    if (!roomId) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const list = await getSpectatorMessages(roomId);
        if (!cancelled) setMessages(list);
      } catch (err) {
        console.error('[useSpectatorChat] load:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Subscribe to live messages
  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToSpectatorMessages(roomId, (msg) => {
      setMessages((prev) => {
        // Guard against duplicates if the message was inserted by THIS client
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => unsub();
  }, [roomId]);

  const send = useCallback(
    async (text: string) => {
      if (!roomId || !userId || !username) {
        setError('Connectez-vous pour participer au chat.');
        return;
      }
      const trimmed = text.trim();
      if (!trimmed) return;
      setSending(true);
      setError(null);
      try {
        const msg = await sendSpectatorMessage(roomId, userId, username, trimmed);
        // Optimistic local insert (the realtime echo will be deduped)
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      } catch (err: any) {
        setError(err?.message || 'Envoi impossible.');
      } finally {
        setSending(false);
      }
    },
    [roomId, userId, username]
  );

  const canPost = !!roomId && !!userId && !!username;

  return { messages, loading, sending, error, send, canPost };
}
