import { supabase } from './supabase';
import type { GameRoom, GameSpectator, RoomStatus } from './supabase';
import type { GameState } from '../types';

/**
 * Service for managing game rooms (persistent online games)
 */

// ============================================
// ROOM MANAGEMENT
// ============================================

const ROOM_SELECT_QUERY = '*, host:host_id(*), guest:guest_id(*)';

/**
 * Create a new game room
 * @param hostId - User ID of the host
 * @param roomCode - 6-character room code (uppercase)
 * @returns Created room or error
 */
export async function createGameRoom(hostId: string, roomCode: string): Promise<GameRoom> {
  console.log('[roomService] Creating room:', roomCode, 'for host:', hostId);

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode.toUpperCase(),
      host_id: hostId,
      status: 'waiting' as RoomStatus,
    })
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error) {
    console.error('[roomService] Error creating room:', error);
    throw new Error(`Impossible de créer la partie: ${error.message}`);
  }

  console.log('[roomService] Room created:', data);
  return data;
}

/**
 * Join an existing game room as guest
 * @param roomCode - Room code to join
 * @param guestId - User ID of the guest
 * @returns Updated room or error
 */
export async function joinGameRoom(roomCode: string, guestId: string): Promise<GameRoom> {
  console.log('[roomService] Joining room:', roomCode, 'as guest:', guestId);

  // First, check if room exists and is available
  const { data: room, error: fetchError } = await supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY)
    .eq('room_code', roomCode.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (fetchError || !room) {
    console.error('[roomService] Room not found or not available:', fetchError);
    throw new Error('Partie introuvable ou déjà commencée');
  }

  // Update room with guest
  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      guest_id: guestId,
      status: 'playing' as RoomStatus,
      started_at: new Date().toISOString(),
    })
    .eq('id', room.id)
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error) {
    console.error('[roomService] Error joining room:', error);
    throw new Error(`Impossible de rejoindre la partie: ${error.message}`);
  }

  console.log('[roomService] Joined room:', data);
  return data;
}

/**
 * Get room by code
 * @param roomCode - Room code to find
 * @returns Room or null
 */
export async function getRoomByCode(roomCode: string): Promise<GameRoom | null> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY)
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) {
    console.error('[roomService] Error fetching room:', error);
    return null;
  }

  return data;
}

/**
 * Get room by ID
 * @param roomId - Room UUID
 * @returns Room or null
 */
export async function getRoomById(roomId: string): Promise<GameRoom | null> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY)
    .eq('id', roomId)
    .single();

  if (error) {
    console.error('[roomService] Error fetching room by ID:', error);
    return null;
  }

  return data;
}

/**
 * Get all active rooms (waiting or playing)
 * @returns List of active rooms
 */
export async function getActiveRooms(): Promise<GameRoom[]> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY)
    .in('status', ['waiting', 'playing'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[roomService] Error fetching active rooms:', error);
    return [];
  }

  return data || [];
}

// ============================================
// GAME STATE PERSISTENCE
// ============================================

/**
 * Update game state in database
 * @param roomId - Room UUID
 * @param gameState - Current game state
 */
export async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
  console.log('[roomService] Updating game state for room:', roomId);

  const { error } = await supabase
    .from('game_rooms')
    .update({
      game_state: gameState as any, // JSONB
    })
    .eq('id', roomId);

  if (error) {
    console.error('[roomService] Error updating game state:', error);
    throw new Error('Impossible de sauvegarder l\'état du jeu');
  }
}

/**
 * Finish a game and set winner
 * @param roomId - Room UUID
 * @param winnerId - Winner's user ID (null for draw)
 */
export async function finishGame(roomId: string, winnerId: string | null): Promise<void> {
  console.log('[roomService] Finishing game:', roomId, 'winner:', winnerId);

  const { error } = await supabase
    .from('game_rooms')
    .update({
      status: 'finished' as RoomStatus,
      winner_id: winnerId,
      finished_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) {
    console.error('[roomService] Error finishing game:', error);
    throw new Error('Impossible de terminer la partie');
  }
}

/**
 * Abandon a game (player disconnects/quits)
 * @param roomId - Room UUID
 * @param abandonerId - User ID of player who abandoned
 */
export async function abandonGame(roomId: string, abandonerId: string): Promise<void> {
  console.log('[roomService] Abandoning game:', roomId, 'abandoner:', abandonerId);

  // Get room to determine winner
  const room = await getRoomById(roomId);
  if (!room) {
    throw new Error('Partie introuvable');
  }

  // Winner is the other player
  const winnerId = room.host_id === abandonerId ? room.guest_id : room.host_id;

  const { error } = await supabase
    .from('game_rooms')
    .update({
      status: 'abandoned' as RoomStatus,
      winner_id: winnerId,
      finished_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) {
    console.error('[roomService] Error abandoning game:', error);
    throw new Error('Impossible d\'abandonner la partie');
  }
}

// ============================================
// SPECTATOR MANAGEMENT
// ============================================

/**
 * Add a spectator to a game room
 * @param roomId - Room UUID
 * @param userId - User ID of spectator
 */
export async function addSpectator(roomId: string, userId: string): Promise<GameSpectator> {
  console.log('[roomService] Adding spectator:', userId, 'to room:', roomId);

  const { data, error } = await supabase
    .from('game_spectators')
    .insert({
      room_id: roomId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[roomService] Error adding spectator:', error);
    throw new Error('Impossible de rejoindre en tant que spectateur');
  }

  return data;
}

/**
 * Remove a spectator from a game room
 * @param roomId - Room UUID
 * @param userId - User ID of spectator
 */
export async function removeSpectator(roomId: string, userId: string): Promise<void> {
  console.log('[roomService] Removing spectator:', userId, 'from room:', roomId);

  const { error } = await supabase
    .from('game_spectators')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) {
    console.error('[roomService] Error removing spectator:', error);
    throw new Error('Impossible de quitter le mode spectateur');
  }
}

/**
 * Get all spectators for a room
 * @param roomId - Room UUID
 * @returns List of spectators with profile info
 */
export async function getSpectators(roomId: string): Promise<GameSpectator[]> {
  const { data, error } = await supabase
    .from('game_spectators')
    .select('*, profiles(*)')
    .eq('room_id', roomId);

  if (error) {
    console.error('[roomService] Error fetching spectators:', error);
    return [];
  }

  return data || [];
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to room updates (for reconnection and live updates)
 * @param roomId - Room UUID
 * @param callback - Function to call when room is updated
 * @returns Unsubscribe function
 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: GameRoom) => void
): () => void {
  console.log('[roomService] Subscribing to room updates:', roomId);

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        console.log('[roomService] Room updated:', payload.new);
        callback(payload.new as GameRoom);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log('[roomService] Unsubscribing from room:', roomId);
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to spectator changes for a room
 * @param roomId - Room UUID
 * @param callback - Function to call when spectators change
 * @returns Unsubscribe function
 */
export function subscribeToSpectators(
  roomId: string,
  callback: (spectators: GameSpectator[]) => void
): () => void {
  console.log('[roomService] Subscribing to spectator updates:', roomId);

  const channel = supabase
    .channel(`spectators:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'game_spectators',
        filter: `room_id=eq.${roomId}`,
      },
      async () => {
        // Fetch updated spectator list
        const spectators = await getSpectators(roomId);
        callback(spectators);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log('[roomService] Unsubscribing from spectators:', roomId);
    supabase.removeChannel(channel);
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a random 6-character room code
 * @returns Uppercase alphanumeric room code
 */
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Check if user is a player in the room
 * @param room - Game room
 * @param userId - User ID to check
 * @returns True if user is host or guest
 */
export function isPlayerInRoom(room: GameRoom, userId: string): boolean {
  return room.host_id === userId || room.guest_id === userId;
}

/**
 * Check if user is host of the room
 * @param room - Game room
 * @param userId - User ID to check
 * @returns True if user is host
 */
export function isHost(room: GameRoom, userId: string): boolean {
  return room.host_id === userId;
}
