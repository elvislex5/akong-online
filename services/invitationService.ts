/**
 * invitationService.ts
 * Manages game invitations between users
 * Phase 3a - Social Features
 */

import { supabase } from './supabase';
import type { GameInvitation, PendingInvitation } from './supabase';

/**
 * Send a game invitation to another user
 * Creates a room and sends invitation
 */
export async function sendInvitation(
  fromUserId: string,
  toUserId: string,
  roomId: string
): Promise<GameInvitation> {
  console.log('[invitationService] Sending invitation:', { fromUserId, toUserId, roomId });

  const { data, error } = await supabase
    .from('game_invitations')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      room_id: roomId,
      status: 'pending',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
    })
    .select()
    .single();

  if (error) {
    console.error('[invitationService] Error sending invitation:', error);
    throw error;
  }

  return data as GameInvitation;
}

/**
 * Get pending invitations for a user (received)
 */
export async function getPendingInvitations(userId: string): Promise<PendingInvitation[]> {
  const { data, error } = await supabase.rpc('get_pending_invitations', {
    p_user_id: userId
  });

  if (error) {
    console.error('[invitationService] Error getting pending invitations:', error);
    throw error;
  }

  return (data || []) as PendingInvitation[];
}

/**
 * Get sent invitations (for sender to track)
 */
export async function getSentInvitations(userId: string): Promise<GameInvitation[]> {
  const { data, error } = await supabase
    .from('game_invitations')
    .select('*')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[invitationService] Error getting sent invitations:', error);
    throw error;
  }

  return (data || []) as GameInvitation[];
}

/**
 * Accept an invitation
 * Returns room details to join
 */
export async function acceptInvitation(invitationId: string): Promise<{
  room_id: string;
  room_code: string;
} | null> {
  console.log('[invitationService] Accepting invitation:', invitationId);

  const { data, error } = await supabase.rpc('accept_invitation', {
    p_invitation_id: invitationId
  });

  if (error) {
    console.error('[invitationService] Error accepting invitation:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as { room_id: string; room_code: string };
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  console.log('[invitationService] Declining invitation:', invitationId);

  const { error } = await supabase.rpc('decline_invitation', {
    p_invitation_id: invitationId
  });

  if (error) {
    console.error('[invitationService] Error declining invitation:', error);
    throw error;
  }
}

/**
 * Cancel an invitation (sender cancels)
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  console.log('[invitationService] Cancelling invitation:', invitationId);

  const { error } = await supabase.rpc('cancel_invitation', {
    p_invitation_id: invitationId
  });

  if (error) {
    console.error('[invitationService] Error cancelling invitation:', error);
    throw error;
  }
}

/**
 * Get invitation by ID
 */
export async function getInvitation(invitationId: string): Promise<GameInvitation | null> {
  const { data, error } = await supabase
    .from('game_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[invitationService] Error getting invitation:', error);
    throw error;
  }

  return data as GameInvitation;
}

/**
 * Subscribe to invitations for a specific user
 * Notifies when new invitations are received or status changes
 */
export function subscribeToInvitations(
  userId: string,
  callback: (invitation: GameInvitation) => void
) {
  console.log('[invitationService] Subscribing to invitations for user:', userId);

  const channel = supabase
    .channel(`invitations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[invitationService] New invitation received:', payload);
        callback(payload.new as GameInvitation);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[invitationService] Invitation updated:', payload);
        callback(payload.new as GameInvitation);
      }
    )
    .subscribe();

  return () => {
    console.log('[invitationService] Unsubscribing from invitations for user:', userId);
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to sent invitation status changes (for sender)
 */
export function subscribeToSentInvitations(
  userId: string,
  callback: (invitation: GameInvitation) => void
) {
  console.log('[invitationService] Subscribing to sent invitations for user:', userId);

  const channel = supabase
    .channel(`sent_invitations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_invitations',
        filter: `from_user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[invitationService] Sent invitation status changed:', payload);
        callback(payload.new as GameInvitation);
      }
    )
    .subscribe();

  return () => {
    console.log('[invitationService] Unsubscribing from sent invitations for user:', userId);
    supabase.removeChannel(channel);
  };
}

/**
 * Clean up expired invitations
 * Should be called periodically by the server
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_expired_invitations');

  if (error) {
    console.error('[invitationService] Error cleaning up expired invitations:', error);
    throw error;
  }

  return data || 0;
}

/**
 * Check if a user already has a pending invitation to another user
 */
export async function hasPendingInvitation(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('game_invitations')
    .select('id')
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (error) {
    console.error('[invitationService] Error checking pending invitation:', error);
    return false;
  }

  return (data || []).length > 0;
}
