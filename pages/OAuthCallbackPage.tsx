import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Wordmark } from '../components/ui/Wordmark';
import { exchangeOAuthCode } from '../services/auth/client';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * Lands here after the OAuth provider redirects through our backend.
 * URL contains either:
 *   - ?code=<one-shot>&next=<redirect-target>  (success path)
 *   - ?error=<code>                            (failure path)
 *
 * On success: POSTs the code to /auth/oauth/google/exchange, persists
 * tokens, hydrates the profile, and navigates to `next` (default /game).
 * The exchange code is single-use and 60s-TTL — must complete fast.
 */
const OAuthCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuthContext();

  const [error, setError] = useState<string>('');
  const ranRef = useRef(false);   // StrictMode mounts twice in dev — gate the side effect

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const oauthError = params.get('error');
    if (oauthError) {
      setError(mapErrorCode(oauthError));
      return;
    }

    const code = params.get('code');
    const next = params.get('next') || '/game';
    if (!code) {
      setError("Lien d'authentification incomplet. Réessayez la connexion.");
      return;
    }

    (async () => {
      try {
        await exchangeOAuthCode(code);
        await refreshProfile();
        navigate(next, { replace: true });
      } catch (err: any) {
        const apiCode = err?.body?.error || '';
        if (apiCode === 'invalid_or_expired_code') {
          setError('Lien expiré. Réessayez la connexion.');
        } else {
          console.error('[OAuthCallback] exchange failed:', err);
          setError("Impossible de finaliser la connexion. Réessayez.");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="bg-canvas min-h-[70vh] flex items-center">
        <Container width="narrow" className="py-16">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle size={40} strokeWidth={1.5} className="text-danger mx-auto mb-6" />
            <h1
              className="font-display text-ink mb-4"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
            >
              Connexion impossible
            </h1>
            <p className="text-ink-muted text-sm mb-8">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/game')}
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Retour à la connexion
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen flex flex-col">
      <Container width="narrow" className="flex-1 flex flex-col items-center justify-center py-16">
        <Wordmark size="xl" className="text-7xl" />
        <p className="kicker mt-6">Finalisation…</p>
        <div className="mt-10 w-6 h-6 border-2 border-rule-strong border-t-accent rounded-full animate-spin" />
      </Container>
    </div>
  );
};

function mapErrorCode(code: string): string {
  switch (code) {
    case 'access_denied':
      return 'Vous avez annulé la connexion Google.';
    case 'google_oauth_not_configured':
      return 'Connexion Google indisponible pour le moment.';
    case 'invalid_state':
      return 'La session de connexion a expiré. Réessayez.';
    case 'token_exchange_failed':
    case 'id_token_invalid':
      return 'Réponse Google invalide. Réessayez dans un instant.';
    default:
      return 'Connexion Google impossible. Réessayez.';
  }
}

export default OAuthCallbackPage;
