import crypto from 'crypto';
import { supabaseAdmin } from './db.js';

/**
 * DB ops backing the OAuth flow:
 *   - oauth_states         (anti-CSRF + PKCE verifier — 10 min TTL)
 *   - oauth_exchange_codes (one-shot codes for frontend pickup — 60s TTL)
 *   - oauth_identities     (provider linking)
 */

const STATE_TTL_MS = 10 * 60 * 1000;     // 10 min
const EXCHANGE_TTL_MS = 60 * 1000;       // 60 sec

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/* ---------- oauth_states ---------- */

export async function createOAuthState({ provider, redirectTo, codeVerifier }) {
  if (!supabaseAdmin) throw new Error('Database not configured');
  const state = randomToken();
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('oauth_states').insert({
    state,
    provider,
    redirect_to: redirectTo || null,
    code_verifier: codeVerifier,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  return state;
}

export async function consumeOAuthState({ state, provider }) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .eq('provider', provider)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at) <= new Date()) return null;

  // Single-use: delete after read
  await supabaseAdmin.from('oauth_states').delete().eq('state', state);
  return data;
}

/* ---------- oauth_exchange_codes ---------- */

export async function createExchangeCode({ userId, emailLower }) {
  if (!supabaseAdmin) throw new Error('Database not configured');
  const code = randomToken();
  const expiresAt = new Date(Date.now() + EXCHANGE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('oauth_exchange_codes').insert({
    code,
    user_id: userId,
    email_lower: emailLower,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  return code;
}

export async function consumeExchangeCode(code) {
  if (!supabaseAdmin) return null;

  // Atomic-ish: read + mark consumed in one pass. We accept a tiny TOCTOU
  // window because the row is single-use and 60s-TTL anyway.
  const { data } = await supabaseAdmin
    .from('oauth_exchange_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at) <= new Date()) return null;

  await supabaseAdmin
    .from('oauth_exchange_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('code', code)
    .is('consumed_at', null);

  return data;
}

/* ---------- oauth_identities ---------- */

export async function findIdentity({ provider, providerUserId }) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('oauth_identities')
    .select('*')
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId)
    .maybeSingle();
  return data;
}

export async function linkIdentity({ userId, provider, providerUserId, emailLower }) {
  if (!supabaseAdmin) throw new Error('Database not configured');
  const { error } = await supabaseAdmin
    .from('oauth_identities')
    .upsert(
      {
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
        email_lower: emailLower || null,
      },
      { onConflict: 'provider,provider_user_id' },
    );
  if (error) throw new Error(error.message);
}
