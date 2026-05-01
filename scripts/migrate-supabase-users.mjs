#!/usr/bin/env node
/**
 * One-shot bulk migration of legacy Supabase Auth users.
 *
 *   node scripts/migrate-supabase-users.mjs            # dry run (no emails sent)
 *   node scripts/migrate-supabase-users.mjs --execute  # send claim emails
 *
 * Iterates auth.users, skips anyone who already has app_credentials,
 * and emails the rest a claim link valid 7 days. Idempotent — safe to
 * re-run; previously-sent unused tokens get auto-invalidated by the
 * action-tokens issuer.
 *
 * Reads the same env as the server (SUPABASE_URL, SUPABASE_SERVICE_KEY,
 * BREVO_API_KEY, APP_URL). Run from the repo root so .env loads.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { sendAccountClaimEmail } from '../server/auth/services/email.js';
import { issueActionToken } from '../server/auth/services/action-tokens.js';

const DRY_RUN = !process.argv.includes('--execute');
const PAGE_SIZE = 200;

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env');
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  log(DRY_RUN ? 'DRY RUN — no emails will be sent' : 'EXECUTE — sending claim emails');

  // Pull every user, page by page
  const allUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      console.error('listUsers error:', error.message);
      process.exit(1);
    }
    if (!data?.users?.length) break;
    allUsers.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
    page++;
  }
  log(`auth.users total: ${allUsers.length}`);

  // Find which already have app_credentials (1 query, all at once)
  const { data: creds, error: credErr } = await sb
    .from('app_credentials')
    .select('user_id');
  if (credErr) {
    console.error('app_credentials query error:', credErr.message);
    process.exit(1);
  }
  const claimed = new Set(creds.map((r) => r.user_id));
  log(`already-claimed: ${claimed.size}`);

  const toClaim = allUsers.filter((u) => u.email && !claimed.has(u.id));
  log(`to-claim (legacy): ${toClaim.length}`);

  if (DRY_RUN) {
    for (const u of toClaim.slice(0, 10)) {
      console.log(`  → would email: ${u.email}`);
    }
    if (toClaim.length > 10) console.log(`  … and ${toClaim.length - 10} more`);
    log('Dry run complete. Re-run with --execute to send emails.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const u of toClaim) {
    const lower = u.email.toLowerCase();
    try {
      const token = await issueActionToken({
        userId: u.id,
        kind: 'account_claim',
        emailLower: lower,
      });
      await sendAccountClaimEmail({ to: lower, token });
      ok++;
      // Brevo free tier: ~300/day. Throttle to be polite.
      await new Promise((r) => setTimeout(r, 250));
      if (ok % 25 === 0) log(`progress: ${ok} sent`);
    } catch (err) {
      fail++;
      console.error(`  ✗ ${lower}: ${err.message}`);
    }
  }

  log(`done — sent: ${ok}, failed: ${fail}`);
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
