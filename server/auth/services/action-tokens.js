import crypto from 'crypto';
import { supabaseAdmin } from './db.js';

/**
 * Single-use action tokens for email-driven flows (verify, reset, claim).
 * Stored hashed (SHA-256). Only the most-recent unused token per
 * (user_id, kind) is honored — a new issuance auto-invalidates older ones
 * for the same purpose, so a user requesting "resend verification" three
 * times can't combine them.
 */

const TTL_MS = {
  email_verify:   24 * 60 * 60 * 1000,    // 24h
  password_reset:  1 * 60 * 60 * 1000,    //  1h
  account_claim:   7 * 24 * 60 * 60 * 1000, // 7d
};

function generatePlainToken() {
  return crypto.randomBytes(32).toString('base64url');  // 43 chars
}

function hashToken(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

/**
 * Issue a new token for the given user/kind. Returns the PLAIN token
 * (which the caller embeds in the email link) — only the hash is stored.
 *
 * Side effect: invalidates all earlier unused tokens of the same kind for
 * this user, so re-requesting "send me a new email" cleanly replaces the
 * previous one.
 */
export async function issueActionToken({ userId, kind, emailLower }) {
  if (!supabaseAdmin) throw new Error('Database not configured');
  const ttl = TTL_MS[kind];
  if (!ttl) throw new Error(`Unknown token kind: ${kind}`);

  // Invalidate previous unused tokens of this kind
  await supabaseAdmin
    .from('auth_action_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('kind', kind)
    .is('used_at', null);

  const plain = generatePlainToken();
  const token_hash = hashToken(plain);
  const expires_at = new Date(Date.now() + ttl).toISOString();

  const { error } = await supabaseAdmin
    .from('auth_action_tokens')
    .insert({ user_id: userId, kind, token_hash, email_lower: emailLower || null, expires_at });

  if (error) throw new Error(error.message);

  return plain;
}

/**
 * Look up a token by plaintext, validate (kind + not used + not expired),
 * and return the row. Does NOT consume — caller decides when (call
 * markTokenUsed after the action succeeds).
 */
export async function findValidToken({ plainToken, kind }) {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('auth_action_tokens')
    .select('*')
    .eq('token_hash', hashToken(plainToken))
    .eq('kind', kind)
    .is('used_at', null)
    .maybeSingle();

  if (error) {
    console.error('[auth/action-tokens] findValidToken error:', error.message);
    return null;
  }
  if (!data) return null;
  if (new Date(data.expires_at) <= new Date()) return null;
  return data;
}

export async function markTokenUsed(id) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('auth_action_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
    .is('used_at', null);
}

/**
 * Returns true if there's already an unused, unexpired token of the given
 * kind for this user that was issued within `windowMs`. Used to throttle
 * re-issuance: when a user retries a login that triggers a claim email,
 * we don't want the new email to invalidate the link from the previous
 * email they may already be acting on.
 */
export async function hasRecentActiveToken({ userId, kind, windowMs }) {
  if (!supabaseAdmin) return false;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data } = await supabaseAdmin
    .from('auth_action_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .is('used_at', null)
    .gte('created_at', since)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return !!data;
}
