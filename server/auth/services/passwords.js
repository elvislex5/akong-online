import argon2 from 'argon2';

/**
 * Password hashing using argon2id — current OWASP recommended algorithm.
 * The default parameters (m=64MB, t=3, p=4) are tuned for ~50ms on a
 * modern server CPU, which is the current sweet spot per OWASP cheat sheet.
 */

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,    // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain) {
  if (!plain || typeof plain !== 'string' || plain.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return argon2.hash(plain, HASH_OPTIONS);
}

/**
 * Verifies plain password against stored hash. Returns true/false.
 * If the hash is older params and verification succeeds, you can
 * call argon2.needsRehash(hash, HASH_OPTIONS) to decide whether
 * to upgrade. We don't do that yet — wire it later if params change.
 */
export async function verifyPassword(hash, plain) {
  if (!hash || !plain) return false;
  try {
    return await argon2.verify(hash, plain);
  } catch (err) {
    console.error('[auth/passwords] verifyPassword error:', err.message);
    return false;
  }
}

/**
 * Lightweight strength check — runs at signup before we even hash.
 * Real heavy lifting (breach lookup via HIBP) is V2.
 */
export function checkPasswordStrength(plain) {
  if (!plain || typeof plain !== 'string') return { ok: false, reason: 'Mot de passe requis' };
  if (plain.length < 8) return { ok: false, reason: 'Au moins 8 caractères' };
  if (plain.length > 128) return { ok: false, reason: 'Maximum 128 caractères' };
  // Basic complexity: at least one letter and one digit
  if (!/[a-zA-Z]/.test(plain) || !/\d/.test(plain)) {
    return { ok: false, reason: 'Doit contenir au moins une lettre et un chiffre' };
  }
  return { ok: true };
}
