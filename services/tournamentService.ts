import { supabase } from './supabase';
import type { Profile } from './supabase';
import type { GameSystem } from '../types';
import type { Cadence } from './glicko2';

export type TournamentFormat = 'arena' | 'swiss' | 'knockout' | 'round_robin' | 'custom';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'finished' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  game_system: GameSystem;
  cadence: Cadence | 'officiel';
  status: TournamentStatus;
  starts_at: string;
  ends_at: string;
  min_rating: number | null;
  max_rating: number | null;
  country: string | null;
  max_participants: number | null;
  prize_description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

export interface TournamentParticipant {
  tournament_id: string;
  user_id: string;
  joined_at: string;
  score: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  profile?: Profile;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  format?: TournamentFormat;
  game_system?: GameSystem;
  cadence?: Cadence | 'officiel';
  starts_at: string; // ISO
  ends_at: string;   // ISO
  min_rating?: number;
  max_rating?: number;
  country?: string;
  max_participants?: number;
  prize_description?: string;
}

/**
 * List tournaments, optionally filtered by status.
 * Adds a `participant_count` from a subquery.
 */
export async function listTournaments(status?: TournamentStatus): Promise<Tournament[]> {
  let query = supabase
    .from('tournaments')
    .select('*, tournament_participants(count)')
    .order('starts_at', { ascending: status === 'finished' ? false : true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[tournamentService] listTournaments error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    participant_count: row.tournament_participants?.[0]?.count ?? 0,
    tournament_participants: undefined,
  }));
}

/**
 * Fetch one tournament by id.
 */
export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, tournament_participants(count)')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('[tournamentService] getTournament error:', error);
    return null;
  }
  return {
    ...(data as any),
    participant_count: (data as any).tournament_participants?.[0]?.count ?? 0,
    tournament_participants: undefined,
  };
}

/**
 * Admin-only via RLS. Creates a tournament with default arena format.
 */
export async function createTournament(
  userId: string,
  input: CreateTournamentInput
): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name: input.name,
      description: input.description ?? null,
      format: input.format ?? 'arena',
      game_system: input.game_system ?? 'mgpwem',
      cadence: input.cadence ?? 'rapide',
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      min_rating: input.min_rating ?? null,
      max_rating: input.max_rating ?? null,
      country: input.country ?? null,
      max_participants: input.max_participants ?? null,
      prize_description: input.prize_description ?? null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[tournamentService] createTournament error:', error);
    throw new Error(error?.message || 'Création impossible');
  }
  return data as Tournament;
}

/**
 * Update tournament status (admin only via RLS).
 */
export async function updateTournamentStatus(
  id: string,
  status: TournamentStatus
): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', id);
  if (error) {
    console.error('[tournamentService] updateTournamentStatus error:', error);
    throw new Error(error.message);
  }
}

/**
 * Register the current user to a tournament.
 */
export async function joinTournament(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_participants')
    .insert({ tournament_id: tournamentId, user_id: userId });
  if (error) {
    console.error('[tournamentService] joinTournament error:', error);
    throw new Error(error.message);
  }
}

/**
 * Unregister.
 */
export async function leaveTournament(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId);
  if (error) {
    console.error('[tournamentService] leaveTournament error:', error);
    throw new Error(error.message);
  }
}

/**
 * Fetch participants ordered by score descending (the live leaderboard).
 */
export async function getParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select('*, profile:user_id(*)')
    .eq('tournament_id', tournamentId)
    .order('score', { ascending: false })
    .order('wins', { ascending: false })
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[tournamentService] getParticipants error:', error);
    return [];
  }
  return (data || []) as TournamentParticipant[];
}

/**
 * Read the games tied to a tournament. Returns rooms (with both players'
 * profiles) ordered by status (live first), then by created_at desc.
 * Used by the tournament detail page to display the live games stream.
 */
export interface TournamentGame {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  winner_id: string | null;
  created_at: string;
  finished_at: string | null;
  host: Profile | null;
  guest: Profile | null;
}

export async function getTournamentGames(
  tournamentId: string,
  limit = 30,
): Promise<TournamentGame[]> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('id, room_code, status, winner_id, created_at, finished_at, host:host_id(*), guest:guest_id(*)')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[tournamentService] getTournamentGames error:', error);
    return [];
  }
  // Sort: playing first, then waiting, then finished/abandoned (already by created_at within each)
  const order: Record<string, number> = { playing: 0, waiting: 1, finished: 2, abandoned: 3 };
  return ((data as any[]) || []).sort(
    (a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99),
  ) as TournamentGame[];
}

/**
 * Whether the user is registered to a given tournament.
 */
export async function isRegistered(tournamentId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select('user_id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[tournamentService] isRegistered error:', error);
    return false;
  }
  return !!data;
}
