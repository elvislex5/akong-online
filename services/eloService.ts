import { supabase } from './supabase';
import type { Profile } from './supabase';

const K_FACTOR = 32;
const DEFAULT_ELO = 1200;

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number // 1 = win, 0.5 = draw, 0 = loss
): { newRatingA: number; newRatingB: number; deltaA: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const deltaA = Math.round(K_FACTOR * (scoreA - expectedA));
  const newRatingA = Math.max(100, ratingA + deltaA);
  const newRatingB = Math.max(100, ratingB - deltaA);

  return { newRatingA, newRatingB, deltaA };
}

export async function updateEloAfterGame(
  winnerId: string | null,
  hostId: string,
  guestId: string | null,
): Promise<{ deltaHost: number; deltaGuest: number } | null> {
  if (!guestId) return null;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, elo_rating, peak_elo')
    .in('id', [hostId, guestId]);

  if (error || !profiles || profiles.length < 2) return null;

  const host = profiles.find(p => p.id === hostId);
  const guest = profiles.find(p => p.id === guestId);
  if (!host || !guest) return null;

  const hostRating = host.elo_rating ?? DEFAULT_ELO;
  const guestRating = guest.elo_rating ?? DEFAULT_ELO;

  let hostScore: number;
  if (winnerId === null) hostScore = 0.5; // draw
  else if (winnerId === hostId) hostScore = 1;
  else hostScore = 0;

  const { newRatingA, newRatingB, deltaA } = calculateElo(hostRating, guestRating, hostScore);

  const updates = [
    supabase
      .from('profiles')
      .update({
        elo_rating: newRatingA,
        peak_elo: Math.max(host.peak_elo ?? DEFAULT_ELO, newRatingA),
      })
      .eq('id', hostId),
    supabase
      .from('profiles')
      .update({
        elo_rating: newRatingB,
        peak_elo: Math.max(guest.peak_elo ?? DEFAULT_ELO, newRatingB),
      })
      .eq('id', guestId),
  ];

  await Promise.all(updates);

  return { deltaHost: deltaA, deltaGuest: -deltaA };
}

export async function getLeaderboard(limit: number = 50): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .gt('games_played', 0)
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[eloService] Error fetching leaderboard:', error);
    return [];
  }

  return data || [];
}

export function getEloTier(rating: number): { name: string; color: string; minElo: number } {
  if (rating >= 2200) return { name: 'Maître', color: 'text-red-400', minElo: 2200 };
  if (rating >= 2000) return { name: 'Expert', color: 'text-purple-400', minElo: 2000 };
  if (rating >= 1800) return { name: 'Avancé', color: 'text-blue-400', minElo: 1800 };
  if (rating >= 1600) return { name: 'Intermédiaire', color: 'text-green-400', minElo: 1600 };
  if (rating >= 1400) return { name: 'Apprenti', color: 'text-amber-400', minElo: 1400 };
  return { name: 'Débutant', color: 'text-gray-400', minElo: 0 };
}
