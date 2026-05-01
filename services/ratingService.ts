import { supabase } from './supabase';
import { updateRating, getEkangTitle, DEFAULT_RATING, type Glicko2Rating, type Cadence, type GameResult } from './glicko2';
import type { GameSystem } from '../types';

export interface RatingRecord {
  id: string;
  user_id: string;
  game_system: GameSystem;
  cadence: Cadence;
  rating: number;
  rd: number;
  volatility: number;
  peak_rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  updated_at: string;
}

export async function getUserRating(
  userId: string,
  gameSystem: GameSystem,
  cadence: Cadence
): Promise<Glicko2Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .select('rating, rd, volatility')
    .eq('user_id', userId)
    .eq('game_system', gameSystem)
    .eq('cadence', cadence)
    .single();

  if (error || !data) {
    return { ...DEFAULT_RATING };
  }

  return {
    rating: data.rating,
    rd: data.rd,
    volatility: data.volatility,
  };
}

export async function updateRatingAfterGame(
  winnerId: string | null,
  hostId: string,
  guestId: string,
  gameSystem: GameSystem,
  cadence: Cadence
): Promise<{ deltaHost: number; deltaGuest: number } | null> {
  const [hostRating, guestRating] = await Promise.all([
    getUserRating(hostId, gameSystem, cadence),
    getUserRating(guestId, gameSystem, cadence),
  ]);

  let hostScore: number;
  if (winnerId === null) hostScore = 0.5;
  else if (winnerId === hostId) hostScore = 1;
  else hostScore = 0;

  const newHostRating = updateRating(hostRating, [
    { opponentRating: guestRating, score: hostScore },
  ]);
  const newGuestRating = updateRating(guestRating, [
    { opponentRating: hostRating, score: 1 - hostScore },
  ]);

  const deltaHost = newHostRating.rating - hostRating.rating;
  const deltaGuest = newGuestRating.rating - guestRating.rating;

  await Promise.all([
    upsertRating(hostId, gameSystem, cadence, newHostRating, hostScore),
    upsertRating(guestId, gameSystem, cadence, newGuestRating, 1 - hostScore),
  ]);

  // Update legacy elo_rating on profiles for backward compatibility
  await Promise.all([
    supabase.from('profiles').update({
      elo_rating: newHostRating.rating,
      peak_elo: Math.max(hostRating.rating, newHostRating.rating),
    }).eq('id', hostId),
    supabase.from('profiles').update({
      elo_rating: newGuestRating.rating,
      peak_elo: Math.max(guestRating.rating, newGuestRating.rating),
    }).eq('id', guestId),
  ]);

  return { deltaHost, deltaGuest };
}

async function upsertRating(
  userId: string,
  gameSystem: GameSystem,
  cadence: Cadence,
  newRating: Glicko2Rating,
  score: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('ratings')
    .select('id, peak_rating, games_played, wins, losses, draws')
    .eq('user_id', userId)
    .eq('game_system', gameSystem)
    .eq('cadence', cadence)
    .single();

  if (existing) {
    await supabase.from('ratings').update({
      rating: newRating.rating,
      rd: newRating.rd,
      volatility: newRating.volatility,
      peak_rating: Math.max(existing.peak_rating, newRating.rating),
      games_played: existing.games_played + 1,
      wins: existing.wins + (score === 1 ? 1 : 0),
      losses: existing.losses + (score === 0 ? 1 : 0),
      draws: existing.draws + (score === 0.5 ? 1 : 0),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
  } else {
    await supabase.from('ratings').insert({
      user_id: userId,
      game_system: gameSystem,
      cadence,
      rating: newRating.rating,
      rd: newRating.rd,
      volatility: newRating.volatility,
      peak_rating: newRating.rating,
      games_played: 1,
      wins: score === 1 ? 1 : 0,
      losses: score === 0 ? 1 : 0,
      draws: score === 0.5 ? 1 : 0,
    });
  }
}

export type LeaderboardScope =
  | 'world'   // no country filter
  | 'home'    // CM, GA, GQ, CG (Songo home countries)
  | 'rest'    // any country except the four home ones (NULL excluded)
  | string;   // specific ISO 3166-1 alpha-2 code

const SONGO_HOME_CODES = ['CM', 'GA', 'GQ', 'CG'];

export interface LeaderboardEntry extends RatingRecord {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  alias_songo?: string | null;
}

export async function getRatingsLeaderboard(
  gameSystem: GameSystem,
  cadence: Cadence,
  scope: LeaderboardScope = 'world',
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  // INNER JOIN profiles so we can filter on profiles.country (Supabase
  // requires an inner join — '!inner' — for cross-table filtering).
  let query = supabase
    .from('ratings')
    .select(
      '*, profiles!inner(username, display_name, avatar_url, country, alias_songo)'
    )
    .eq('game_system', gameSystem)
    .eq('cadence', cadence)
    .gt('games_played', 0)
    .order('rating', { ascending: false })
    .limit(limit);

  if (scope === 'home') {
    query = query.in('profiles.country', SONGO_HOME_CODES);
  } else if (scope === 'rest') {
    query = query
      .not('profiles.country', 'is', null)
      .not('profiles.country', 'in', `(${SONGO_HOME_CODES.join(',')})`);
  } else if (scope !== 'world') {
    // Specific country code
    query = query.eq('profiles.country', scope.toUpperCase());
  }
  // scope === 'world' → no extra filter

  const { data, error } = await query;
  if (error) {
    console.error('[ratingService] Leaderboard error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    username: row.profiles?.username,
    display_name: row.profiles?.display_name,
    avatar_url: row.profiles?.avatar_url,
    country: row.profiles?.country,
    alias_songo: row.profiles?.alias_songo,
    profiles: undefined,
  }));
}

export async function getUserAllRatings(userId: string): Promise<RatingRecord[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('user_id', userId)
    .order('game_system', { ascending: true });

  if (error) {
    console.error('[ratingService] getUserAllRatings error:', error);
    return [];
  }

  return data || [];
}

export interface RatingHistoryPoint {
  recorded_at: string;
  rating: number;
  games_played: number;
}

/**
 * Time-ordered rating snapshots for one (user × system × cadence). Powers
 * the evolution chart on the profile page (CDC §9.1 MUST). Capped at the
 * last `limit` points to keep the SVG snappy.
 */
export async function getRatingHistory(
  userId: string,
  gameSystem: GameSystem,
  cadence: Cadence,
  limit = 200,
): Promise<RatingHistoryPoint[]> {
  const { data, error } = await supabase
    .from('rating_history')
    .select('recorded_at, rating, games_played')
    .eq('user_id', userId)
    .eq('game_system', gameSystem)
    .eq('cadence', cadence)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ratingService] getRatingHistory error:', error);
    return [];
  }
  // Reverse so the chart reads left-to-right oldest-to-newest
  return ((data as RatingHistoryPoint[]) || []).reverse();
}
