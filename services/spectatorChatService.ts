import { supabase } from './supabase';

export interface SpectatorMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

const HISTORY_LIMIT = 100;

/**
 * Fetch the last N messages for a room (oldest → newest).
 */
export async function getSpectatorMessages(roomId: string): Promise<SpectatorMessage[]> {
  const { data, error } = await supabase
    .from('spectator_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    console.error('[spectatorChatService] fetch error:', error);
    return [];
  }
  // Reverse to oldest-first for display
  return (data || []).reverse();
}

/**
 * Post a new spectator message. Returns the row created (server-stamped).
 */
export async function sendSpectatorMessage(
  roomId: string,
  userId: string,
  username: string,
  message: string
): Promise<SpectatorMessage> {
  const trimmed = message.trim().slice(0, 280);
  if (!trimmed) throw new Error('Message vide.');

  const { data, error } = await supabase
    .from('spectator_messages')
    .insert({ room_id: roomId, user_id: userId, username, message: trimmed })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[spectatorChatService] send error:', error);
    throw new Error(error?.message || 'Envoi impossible.');
  }
  return data as SpectatorMessage;
}

/**
 * Subscribe to new spectator messages for a room (INSERT only).
 * Returns an unsubscribe function.
 */
export function subscribeToSpectatorMessages(
  roomId: string,
  onMessage: (msg: SpectatorMessage) => void
): () => void {
  const channel = supabase
    .channel(`spectator-chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'spectator_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onMessage(payload.new as SpectatorMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
