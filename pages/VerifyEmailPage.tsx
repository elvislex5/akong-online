import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { confirmEmailVerification } from '../services/auth/client';
import { useAuth } from '../hooks/useAuth';

type Status = 'pending' | 'success' | 'expired' | 'error';

/**
 * Lands here when the user clicks the verification link from their inbox.
 * Reads ?token=<plain> from the URL, calls our /auth/verify-email/confirm
 * endpoint, and refreshes the auth context so the UI sees the verified flag.
 */
const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'error');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    confirmEmailVerification(token)
      .then(async () => {
        if (cancelled) return;
        await refreshProfile();
        setStatus('success');
      })
      .catch((err: any) => {
        if (cancelled) return;
        const code = err?.body?.error;
        setStatus(code === 'invalid_or_expired_token' ? 'expired' : 'error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="bg-canvas min-h-[70vh] flex items-center">
      <Container width="narrow" className="py-16">
        <div className="max-w-md mx-auto text-center">
          {status === 'pending' && (
            <>
              <Loader2 size={32} strokeWidth={1.5} className="text-accent mx-auto animate-spin mb-6" />
              <p className="kicker mb-3">Vérification en cours</p>
              <h1
                className="font-display text-ink mb-4"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
              >
                Confirmation de votre adresse…
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={40} strokeWidth={1.5} className="text-accent mx-auto mb-6" />
              <p className="kicker mb-3">C'est confirmé</p>
              <h1
                className="font-display text-ink mb-4"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
              >
                Votre adresse est validée
              </h1>
              <p className="text-ink-muted text-sm mb-8">
                Bienvenue sur Songo. Vous pouvez maintenant accéder à l'ensemble des fonctionnalités.
              </p>
              <Link
                to="/game"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
              >
                Aller jouer
              </Link>
            </>
          )}

          {status === 'expired' && (
            <>
              <AlertCircle size={40} strokeWidth={1.5} className="text-danger mx-auto mb-6" />
              <p className="kicker mb-3">Lien expiré</p>
              <h1
                className="font-display text-ink mb-4"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
              >
                Ce lien n'est plus valide
              </h1>
              <p className="text-ink-muted text-sm mb-8">
                Le lien de vérification a expiré ou a déjà été utilisé. Connectez-vous, on vous renverra un nouveau.
              </p>
              <Link
                to="/game"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
              >
                Se connecter
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle size={40} strokeWidth={1.5} className="text-danger mx-auto mb-6" />
              <p className="kicker mb-3">Lien invalide</p>
              <h1
                className="font-display text-ink mb-4"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
              >
                Quelque chose ne va pas
              </h1>
              <p className="text-ink-muted text-sm mb-8">
                Le lien de vérification est incomplet. Réessayez en cliquant sur le bouton dans l'email.
              </p>
              <Link
                to="/"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-rule-strong text-ink hover:bg-surface text-sm font-medium tracking-wide transition-colors duration-150"
              >
                Retour à l'accueil
              </Link>
            </>
          )}
        </div>
      </Container>
    </div>
  );
};

export default VerifyEmailPage;
