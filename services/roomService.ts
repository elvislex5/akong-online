import { supabase } from './supabase';
import type { GameRoom, GameSpectator, RoomStatus, MatchFormat, MatchGame } from './supabase';
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
 * @param tournamentId - Optional tournament UUID; if set, the auto-scoring
 *                      trigger will update tournament_participants when the
 *                      game finishes (see migration 017)
 * @returns Created room or error
 */
export async function createGameRoom(
  hostId: string,
  roomCode: string,
  tournamentId?: string,
): Promise<GameRoom> {

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode.toUpperCase(),
      host_id: hostId,
      status: 'waiting' as RoomStatus,
      ...(tournamentId ? { tournament_id: tournamentId } : {}),
    })
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error) {
    console.error('[roomService] Error creating room:', error);
    throw new Error(`Impossible de créer la partie: ${error.message}`);
  }

  return data;
}

/**
 * Join an existing game room as guest
 * @param roomCode - Room code to join
 * @param guestId - User ID of the guest
 * @returns Updated room or error
 */
export async function joinGameRoom(roomCode: string, guestId: string): Promise<GameRoom> {

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
  // Belt-and-braces: even if the pg_cron job hasn't run yet, hide rooms whose
  // last activity is older than 5 minutes — it would have been auto-abandoned
  // on the next cron tick anyway. Cap the result at 30 to avoid runaway lists.
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY)
    .in('status', ['waiting', 'playing'])
    .gte('updated_at', fiveMinutesAgo)
    .order('updated_at', { ascending: false })
    .limit(30);

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

/**
 * Increment game count and return new count
 * Used for alternating starting player
 * @param roomId - Room UUID
 * @returns New game count
 */
export async function incrementGameCount(roomId: string): Promise<number> {

  const { data, error } = await supabase.rpc('increment_game_count', {
    p_room_id: roomId,
  });

  if (error) {
    console.error('[roomService] Error incrementing game count:', error);
    // Return 0 as fallback (will default to Player.One)
    return 0;
  }

  return data;
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
        callback(payload.new as GameRoom);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
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
    supabase.removeChannel(channel);
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get finished games for a user (most recent first)
 * @param userId - User UUID
 * @param limit - Max number of games to return
 * @returns List of finished rooms with player profiles
 */
export async function getUserGameHistory(userId: string, limit: number = 30): Promise<GameRoom[]> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY)
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .in('status', ['finished', 'abandoned'])
    .order('finished_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[roomService] Error fetching user game history:', error);
    return [];
  }

  return data || [];
}

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

// ============================================
// MATCH SYSTEM (4 FORMATS)
// ============================================

/**
 * Create a game room with match format
 * @param hostId - User ID of the host
 * @param roomCode - 6-character room code
 * @param matchFormat - Format: infinite, traditional_6, traditional_2, first_to_x
 * @param matchTarget - For first_to_x: number of wins needed (2, 3, 5, 7, etc.)
 * @returns Created room
 */
export async function createGameRoomWithFormat(
  hostId: string,
  roomCode: string,
  matchFormat: MatchFormat = 'infinite',
  matchTarget?: number,
  tournamentId?: string,
): Promise<GameRoom> {

  // Validation
  if (matchFormat === 'first_to_x' && (!matchTarget || matchTarget < 1)) {
    throw new Error('Le format "Premier à X" nécessite un nombre de victoires cible');
  }

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode.toUpperCase(),
      host_id: hostId,
      status: 'waiting' as RoomStatus,
      match_format: matchFormat,
      match_target: matchTarget || null,
      match_score_host: 0,
      match_score_guest: 0,
      match_status: 'in_progress',
      ...(tournamentId ? { tournament_id: tournamentId } : {}),
    })
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error) {
    console.error('[roomService] Error creating room:', error);
    throw new Error(`Impossible de créer la partie: ${error.message}`);
  }

  return data;
}

/**
 * List finished/abandoned games across all players. Powers the public
 * /games browser (CDC §10 MUST: "Base de données de toutes les parties").
 *
 * Filters are optional and additive. `playerId` matches if the user is
 * either host or guest. Pagination is offset-based — fine for V1, swap
 * to keyset pagination if the table grows past ~100k rows.
 */
export interface FinishedGamesFilters {
  playerId?: string;
  matchFormat?: MatchFormat;
  result?: 'win' | 'loss' | 'draw';   // requires playerId to be meaningful
  limit?: number;
  offset?: number;
}

export async function listFinishedGames(filters: FinishedGamesFilters = {}): Promise<{
  games: GameRoom[];
  total: number;
}> {
  const limit = Math.min(filters.limit ?? 30, 100);
  const offset = filters.offset ?? 0;

  let q = supabase
    .from('game_rooms')
    .select(ROOM_SELECT_QUERY, { count: 'exact' })
    .in('status', ['finished', 'abandoned'])
    .order('finished_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.matchFormat) q = q.eq('match_format', filters.matchFormat);
  if (filters.playerId) q = q.or(`host_id.eq.${filters.playerId},guest_id.eq.${filters.playerId}`);
  if (filters.playerId && filters.result === 'win') q = q.eq('winner_id', filters.playerId);
  if (filters.playerId && filters.result === 'loss')
    q = q.not('winner_id', 'is', null).neq('winner_id', filters.playerId);
  if (filters.result === 'draw') q = q.is('winner_id', null);

  const { data, error, count } = await q;
  if (error) {
    console.error('[roomService] listFinishedGames error:', error);
    return { games: [], total: 0 };
  }
  return { games: (data as GameRoom[]) || [], total: count ?? 0 };
}

/**
 * Record a finished game in the match
 * Calls the database function record_match_game
 * @param roomId - Room UUID
 * @param winnerId - Winner user ID (null for draw)
 * @param scoreHost - Final score of host player
 * @param scoreGuest - Final score of guest player
 * @param durationSeconds - Duration of the game in seconds
 * @param gameState - Final game state (optional)
 * @returns Match info with completion status
 */
export async function recordMatchGame(
  roomId: string,
  winnerId: string | null,
  scoreHost: number,
  scoreGuest: number,
  durationSeconds?: number,
  gameState?: GameState
): Promise<{
  gameNumber: number;
  matchScoreHost: number;
  matchScoreGuest: number;
  matchComplete: boolean;
  matchWinnerId: string | null;
}> {

  const { data, error } = await supabase.rpc('record_match_game', {
    p_room_id: roomId,
    p_winner_id: winnerId,
    p_score_host: scoreHost,
    p_score_guest: scoreGuest,
    p_duration_seconds: durationSeconds || null,
    p_game_state: gameState ? JSON.stringify(gameState) : null,
  });

  if (error) {
    console.error('[roomService] Error recording match game:', error);
    throw new Error('Impossible d\'enregistrer la partie');
  }

  return {
    gameNumber: data.game_number,
    matchScoreHost: data.match_score_host,
    matchScoreGuest: data.match_score_guest,
    matchComplete: data.match_complete,
    matchWinnerId: data.match_winner_id,
  };
}

/**
 * Abandon the entire match (not just current game)
 * @param roomId - Room UUID
 * @param abandonerId - User ID of player who abandons
 */
export async function abandonMatch(roomId: string, abandonerId: string): Promise<void> {

  const { error } = await supabase.rpc('abandon_match', {
    p_room_id: roomId,
    p_abandoner_id: abandonerId,
  });

  if (error) {
    console.error('[roomService] Error abandoning match:', error);
    throw new Error('Impossible d\'abandonner le match');
  }

}

/**
 * Get match history (all games played in this match)
 * @param roomId - Room UUID
 * @returns Array of match games
 */
export async function getMatchHistory(roomId: string): Promise<MatchGame[]> {

  const { data, error } = await supabase
    .from('match_games')
    .select('*')
    .eq('room_id', roomId)
    .order('game_number', { ascending: true });

  if (error) {
    console.error('[roomService] Error fetching match history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get match format label for display
 * @param format - Match format
 * @param target - Match target (for first_to_x)
 * @returns Human-readable label
 */
export function getMatchFormatLabel(format: MatchFormat, target?: number | null): string {
  switch (format) {
    case 'infinite':
      return 'Parties libres';
    case 'traditional_6':
      return 'Traditionnel 6 parties';
    case 'traditional_2':
      return 'Traditionnel 2 parties (Aller-retour)';
    case 'first_to_x':
      return `Premier à ${target || '?'} victoires`;
    default:
      return 'Format inconnu';
  }
}

/**
 * Check if match is complete based on format
 * @param room - Game room
 * @param gameNumber - Current game number
 * @returns True if match should end after this game
 */
export function isMatchComplete(room: GameRoom, gameNumber: number): boolean {
  switch (room.match_format) {
    case 'infinite':
      return false; // Never ends

    case 'traditional_6':
      return gameNumber >= 6;

    case 'traditional_2':
      return gameNumber >= 2;

    case 'first_to_x':
      if (!room.match_target) return false;
      return (
        room.match_score_host >= room.match_target ||
        room.match_score_guest >= room.match_target
      );

    default:
      return false;
  }
}
