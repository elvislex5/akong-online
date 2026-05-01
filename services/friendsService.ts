import { supabase } from './supabase';
import type { Profile } from './supabase';

/**
 * Friendship service — Module Connect §8.2 (MUST V1).
 *
 * Schema: see migrations/018_friendships.sql.
 * One row per relationship, stored from the requester's side. The functional
 * unique index prevents A↔B duplicates regardless of direction.
 */

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type FriendStatus = 'online' | 'in_game' | 'offline';

export interface Friendship {
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

/**
 * A friend (or pending request) joined with the other party's profile and
 * presence. The `direction` tells us which side I'm on, which the UI uses
 * to show "Demande envoyée" vs "Accepter / Refuser".
 */
export interface FriendEntry {
  friendship: Friendship;
  direction: 'sent' | 'received';
  profile: Profile;
  presence: FriendStatus;
}

const FRIENDSHIP_SELECT = `
  requester_id,
  addressee_id,
  status,
  created_at,
  responded_at,
  requester:requester_id(*),
  addressee:addressee_id(*)
`;

/**
 * Send a friend request.
 * Throws on conflict (A→B or B→A already exists).
 */
export async function sendFriendRequest(meId: string, otherId: string): Promise<void> {
  if (meId === otherId) throw new Error('Vous ne pouvez pas vous ajouter vous-même.');

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: meId, addressee_id: otherId });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Une demande existe déjà avec ce joueur.');
    }
    console.error('[friendsService] sendFriendRequest error:', error);
    throw new Error(error.message);
  }
}

/**
 * Accept a pending request (only the addressee can do this — RLS enforced).
 */
export async function acceptFriendRequest(requesterId: string, meId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('requester_id', requesterId)
    .eq('addressee_id', meId);

  if (error) {
    console.error('[friendsService] acceptFriendRequest error:', error);
    throw new Error(error.message);
  }
}

/**
 * Decline a pending request OR unfriend an accepted one OR cancel my own
 * pending request — same operation, just deletes the row.
 */
export async function removeFriendship(otherId: string, meId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),` +
      `and(requester_id.eq.${otherId},addressee_id.eq.${meId})`,
    );

  if (error) {
    console.error('[friendsService] removeFriendship error:', error);
    throw new Error(error.message);
  }
}

/**
 * Lookup the relationship (if any) between me and another user.
 */
export async function getFriendshipWith(meId: string, otherId: string): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status, created_at, responded_at')
    .or(
      `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),` +
      `and(requester_id.eq.${otherId},addressee_id.eq.${meId})`,
    )
    .maybeSingle();

  if (error) {
    console.error('[friendsService] getFriendshipWith error:', error);
    return null;
  }
  return (data as Friendship) || null;
}

/**
 * List all friendships involving me, optionally filtered by status.
 * Performs a single query that joins both profile sides; the caller picks
 * whichever isn't me. Presence status is fetched in a second query and
 * merged in (denormalizing in user_presence would be premature).
 */
export async function listFriendships(
  meId: string,
  status: FriendshipStatus | 'all' = 'all',
): Promise<FriendEntry[]> {
  let q = supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
    .order('created_at', { ascending: false });

  if (status !== 'all') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) {
    console.error('[friendsService] listFriendships error:', error);
    return [];
  }

  const rows = (data as any[]) || [];

  // Resolve presence in a single round-trip
  const otherIds = rows.map((r) => (r.requester_id === meId ? r.addressee_id : r.requester_id));
  const presenceMap: Record<string, FriendStatus> = {};
  if (otherIds.length > 0) {
    const { data: presenceRows } = await supabase
      .from('user_presence')
      .select('user_id, status')
      .in('user_id', otherIds);
    for (const p of (presenceRows as { user_id: string; status: FriendStatus }[]) || []) {
      presenceMap[p.user_id] = p.status;
    }
  }

  return rows.map((row) => {
    const isRequester = row.requester_id === meId;
    const otherProfile: Profile = isRequester ? row.addressee : row.requester;
    return {
      friendship: {
        requester_id: row.requester_id,
        addressee_id: row.addressee_id,
        status: row.status,
        created_at: row.created_at,
        responded_at: row.responded_at,
      },
      direction: isRequester ? 'sent' : 'received',
      profile: otherProfile,
      presence: presenceMap[otherProfile.id] || 'offline',
    } as FriendEntry;
  });
}

/**
 * Search profiles by alias_songo / username for the "add a friend" flow.
 * Excludes me. Returns at most `limit` results.
 */
export async function searchProfiles(query: string, meId: string, limit = 10): Promise<Profile[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`alias_songo.ilike.${pattern},username.ilike.${pattern},display_name.ilike.${pattern}`)
    .neq('id', meId)
    .limit(limit);

  if (error) {
    console.error('[friendsService] searchProfiles error:', error);
    return [];
  }
  return (data as Profile[]) || [];
}
