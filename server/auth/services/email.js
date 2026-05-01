/**
 * Brevo (ex-SendInBlue) transactional email client.
 *
 * Talks directly to the v3 HTTP API — no SDK, just fetch. This keeps
 * dependencies minimal and avoids the SDK's heavy axios footprint.
 *
 * Required env:
 *   BREVO_API_KEY      — xkeysib-... from app.brevo.com
 *   BREVO_SENDER_EMAIL — e.g. noreply@akong-online.com
 *   BREVO_SENDER_NAME  — e.g. "Songo"
 *   APP_URL            — base URL for the action links (http://localhost:3000 in dev)
 */

const API_URL = 'https://api.brevo.com/v3/smtp/email';

function getConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@akong-online.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Songo';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return { apiKey, senderEmail, senderName, appUrl };
}

async function sendBrevoEmail({ to, subject, html, text }) {
  const { apiKey, senderEmail, senderName } = getConfig();

  if (!apiKey) {
    // Dev mode without Brevo configured: log to console and continue.
    // This keeps signup working locally even before BREVO_API_KEY is set.
    console.warn('[auth/email] BREVO_API_KEY not set — would have sent:');
    console.warn(`  To: ${to}\n  Subject: ${subject}\n  Text:\n${text}`);
    return { ok: true, mocked: true };
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[auth/email] Brevo error:', res.status, body);
    throw new Error(`brevo_failure_${res.status}`);
  }
  return await res.json();
}

/* ----------------------------------------------------------------
   Templates
   ---------------------------------------------------------------- */

const EMAIL_BASE_STYLE = `
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #2a2620; line-height: 1.55; max-width: 560px;
  margin: 40px auto; padding: 0 24px;
`;
const BUTTON_STYLE = `
  display: inline-block; padding: 12px 24px;
  background: #5b4b8a; color: #fcfaf6; text-decoration: none;
  font-weight: 500; border-radius: 6px; margin: 16px 0;
`;

function brand() {
  const { senderName } = getConfig();
  return `<p style="font-family: Georgia, serif; font-size: 22px; letter-spacing: -0.02em; margin: 0 0 24px 0; color: #2a2620;">${senderName}</p>`;
}

function footer() {
  return `
  <hr style="border: none; border-top: 1px solid #e8e3da; margin: 32px 0 16px 0;" />
  <p style="font-size: 12px; color: #968b7a;">
    Vous recevez cet email car une action a été demandée pour votre compte sur akong-online.com.
    Si ce n'était pas vous, ignorez ce message — aucun changement n'a été effectué.
  </p>`;
}

export async function sendVerificationEmail({ to, token }) {
  const { appUrl } = getConfig();
  const link = `${appUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
  <div style="${EMAIL_BASE_STYLE}">
    ${brand()}
    <h1 style="font-family: Georgia, serif; font-size: 28px; letter-spacing: -0.02em; margin: 0 0 16px 0;">
      Confirmez votre adresse
    </h1>
    <p>Bienvenue sur Songo. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.</p>
    <p><a href="${link}" style="${BUTTON_STYLE}">Confirmer mon adresse</a></p>
    <p style="font-size: 13px; color: #6b614d;">Le lien expire dans 24 heures. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
    <p style="font-size: 13px; color: #6b614d; word-break: break-all;">${link}</p>
    ${footer()}
  </div>`;

  const text = `Confirmez votre adresse Songo.\n\nOuvrez ce lien pour activer votre compte :\n${link}\n\nLe lien expire dans 24 heures.\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`;

  return sendBrevoEmail({ to, subject: 'Confirmez votre adresse Songo', html, text });
}

export async function sendPasswordResetEmail({ to, token }) {
  const { appUrl } = getConfig();
  const link = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
  <div style="${EMAIL_BASE_STYLE}">
    ${brand()}
    <h1 style="font-family: Georgia, serif; font-size: 28px; letter-spacing: -0.02em; margin: 0 0 16px 0;">
      Réinitialiser votre mot de passe
    </h1>
    <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    <p><a href="${link}" style="${BUTTON_STYLE}">Choisir un nouveau mot de passe</a></p>
    <p style="font-size: 13px; color: #6b614d;">Le lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez ce message — votre mot de passe actuel reste inchangé.</p>
    <p style="font-size: 13px; color: #6b614d; word-break: break-all;">${link}</p>
    ${footer()}
  </div>`;

  const text = `Réinitialiser votre mot de passe Songo.\n\nOuvrez ce lien pour choisir un nouveau mot de passe :\n${link}\n\nLe lien expire dans 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;

  return sendBrevoEmail({ to, subject: 'Réinitialiser votre mot de passe Songo', html, text });
}

export async function sendAccountClaimEmail({ to, token }) {
  const { appUrl } = getConfig();
  const link = `${appUrl}/auth/claim?token=${encodeURIComponent(token)}`;

  const html = `
  <div style="${EMAIL_BASE_STYLE}">
    ${brand()}
    <h1 style="font-family: Georgia, serif; font-size: 28px; letter-spacing: -0.02em; margin: 0 0 16px 0;">
      Activez votre compte Songo
    </h1>
    <p>Songo a migré son système d'authentification. Pour continuer à jouer avec vos statistiques, classement et amis, définissez un mot de passe maintenant.</p>
    <p><a href="${link}" style="${BUTTON_STYLE}">Définir mon mot de passe</a></p>
    <p style="font-size: 13px; color: #6b614d;">Vos parties, votre rating Glicko-2, vos amis et vos tournois sont préservés.</p>
    <p style="font-size: 13px; color: #6b614d;">Le lien expire dans 7 jours.</p>
    <p style="font-size: 13px; color: #6b614d; word-break: break-all;">${link}</p>
    ${footer()}
  </div>`;

  const text = `Activez votre compte Songo.\n\nNous avons migré l'authentification. Définissez un mot de passe pour conserver l'accès à vos parties et statistiques :\n${link}\n\nLe lien expire dans 7 jours.`;

  return sendBrevoEmail({ to, subject: 'Activez votre compte Songo', html, text });
}
