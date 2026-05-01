import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client (service_role key).
 * Bypasses RLS — used by all auth routes for credential ops.
 *
 * Importing this module will throw if credentials are missing, so callers
 * can fail fast on startup rather than at the first auth request.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[auth/db] WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY missing — auth will not work');
}

export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/**
 * Look up credentials by email (case-insensitive). Returns null if not found.
 */
export async function getCredentialsByEmail(email) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('app_credentials')
    .select('*')
    .eq('email_lower', email.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('[auth/db] getCredentialsByEmail error:', error.message);
    return null;
  }
  return data;
}

/**
 * Provision a brand-new identity. Creates the auth.users row via the
 * Supabase admin API (we generate a strong unguessable throwaway password
 * since we never use Supabase's signin path), then inserts our credentials
 * row. Throws on conflict or DB error — caller decides how to surface.
 */
export async function createUser({ email, passwordHash }) {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const lower = email.toLowerCase();

  // Throwaway password for the auth.users row — required by the Supabase
  // admin API but never used for login. We use a 32-byte random string.
  const throwaway = (await import('crypto')).default.randomBytes(32).toString('base64url');

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: lower,
    password: throwaway,
    email_confirm: false,
    user_metadata: {},
  });

  if (error || !data?.user) {
    // Supabase auth admin returns various wordings for duplicate email
    // ("User already registered", "already been registered", "email_exists",
    // "duplicate key") and even an HTTP 422 in some versions. Match broadly.
    const msg = (error?.message || '').toLowerCase();
    const code = error?.code || error?.status;
    if (
      msg.includes('already') ||
      msg.includes('duplicate') ||
      msg.includes('exists') ||
      msg.includes('taken') ||
      code === 'email_exists' ||
      code === 422
    ) {
      const e = new Error('email_taken');
      e.code = 'email_taken';
      throw e;
    }
    // Re-throw with the original message so signup.js can log it
    console.error('[auth/db] createUser unexpected error:', error);
    throw new Error(error?.message || 'Failed to create user');
  }

  const userId = data.user.id;

  const { error: credErr } = await supabaseAdmin.from('app_credentials').insert({
    user_id: userId,
    email_lower: lower,
    password_hash: passwordHash,
  });

  if (credErr) {
    // Best effort cleanup — delete the orphan auth.users row
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    if (credErr.code === '23505') {
      const e = new Error('email_taken');
      e.code = 'email_taken';
      throw e;
    }
    throw new Error(credErr.message);
  }

  return { userId, email: lower };
}

/**
 * Provision a user via an OAuth provider — no password, email already
 * verified by the provider. Returns the existing user_id if email is
 * already in app_credentials (auto-link), or creates a fresh row.
 *
 * Idempotent: caller can run this on every OAuth login without checking.
 */
export async function findOrCreateOAuthUser({ email, displayName, avatarUrl }) {
  if (!supabaseAdmin) throw new Error('Database not configured');
  const lower = email.toLowerCase();

  // 1. Already in app_credentials? → auto-link (just return the existing id).
  const existing = await getCredentialsByEmail(lower);
  if (existing) {
    // Mark email_verified_at if it wasn't already (Google attests it).
    if (!existing.email_verified_at) {
      await supabaseAdmin
        .from('app_credentials')
        .update({ email_verified_at: new Date().toISOString() })
        .eq('user_id', existing.user_id);
    }
    return { userId: existing.user_id, email: lower, isNew: false };
  }

  // 2. Not in app_credentials, but might be a legacy auth.users row.
  //    We treat that the same as "create new row in app_credentials" — this
  //    auto-claims the legacy account via OAuth (proven email control).
  const crypto = (await import('crypto')).default;

  // Look for an existing auth.users row with this email
  let existingAuthUserId = null;
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === lower);
    if (hit) { existingAuthUserId = hit.id; break; }
    if (data.users.length < 200) break;
    page++;
  }

  let userId = existingAuthUserId;
  let isNew = false;

  if (!userId) {
    // Genuine new signup — create the auth.users row. We still set a
    // throwaway password (admin API requires one) but app_credentials
    // gets password_hash = NULL so login.js redirects them to OAuth.
    const throwaway = crypto.randomBytes(32).toString('base64url');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: lower,
      password: throwaway,
      email_confirm: true,                    // OAuth provider already verified
      user_metadata: {
        full_name: displayName || null,
        avatar_url: avatarUrl || null,
      },
    });
    if (error || !data?.user) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
        const e = new Error('email_taken');
        e.code = 'email_taken';
        throw e;
      }
      throw new Error(error?.message || 'Failed to create OAuth user');
    }
    userId = data.user.id;
    isNew = true;
  }

  // Insert app_credentials with NULL password_hash (OAuth-only for now)
  const { error: credErr } = await supabaseAdmin.from('app_credentials').insert({
    user_id: userId,
    email_lower: lower,
    password_hash: null,
    email_verified_at: new Date().toISOString(),
  });

  if (credErr && credErr.code !== '23505') {
    throw new Error(credErr.message);
  }

  // Best-effort: fill display_name + avatar_url on the profile row if
  // it's still defaults (don't overwrite anything the user customized).
  if (displayName || avatarUrl) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      const updates = {};
      if (displayName && (!profile?.display_name || profile.display_name === lower.split('@')[0])) {
        updates.display_name = displayName;
      }
      if (avatarUrl && !profile?.avatar_url) {
        updates.avatar_url = avatarUrl;
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('profiles').update(updates).eq('id', userId);
      }
    } catch (err) {
      console.warn('[auth/db] profile patch (non-fatal):', err.message);
    }
  }

  return { userId, email: lower, isNew };
}

/**
 * Atomically increment failed_login_count. Locks the account for 15 minutes
 * once we hit 5 consecutive failures.
 */
export async function recordFailedLogin(userId) {
  if (!supabaseAdmin) return;
  const { data: cred } = await supabaseAdmin
    .from('app_credentials')
    .select('failed_login_count')
    .eq('user_id', userId)
    .single();

  const next = (cred?.failed_login_count || 0) + 1;
  const updates = { failed_login_count: next };
  if (next >= 5) {
    updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }

  await supabaseAdmin.from('app_credentials').update(updates).eq('user_id', userId);
  return updates;
}

export async function resetFailedLogins(userId) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('app_credentials')
    .update({ failed_login_count: 0, locked_until: null })
    .eq('user_id', userId);
}

/**
 * Auth sessions / refresh tokens
 */
export async function createSession({ userId, refreshHash, familyId, ip, userAgent, expiresAt }) {
  if (!supabaseAdmin) throw new Error('Database not configured');
  const { data, error } = await supabaseAdmin
    .from('auth_sessions')
    .insert({
      user_id: userId,
      family_id: familyId,
      refresh_token_hash: refreshHash,
      ip: ip || null,
      user_agent: userAgent || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function findSessionByHash(refreshHash) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('auth_sessions')
    .select('*')
    .eq('refresh_token_hash', refreshHash)
    .maybeSingle();
  return data;
}

export async function revokeSession(sessionId) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('revoked_at', null);
}

/**
 * On suspected token reuse: kill every session in the family. The user
 * has to log in again from scratch — small friction but it stops a
 * compromised refresh token cold.
 */
export async function revokeFamily(familyId) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('family_id', familyId)
    .is('revoked_at', null);
}

export async function touchSession(sessionId) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('auth_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', sessionId);
}
