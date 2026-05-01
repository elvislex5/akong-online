import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Input } from '../components/ui/Input';
import { Wordmark } from '../components/ui/Wordmark';
import { confirmAccountClaim } from '../services/auth/client';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * Account claim landing page — reached from the "Activez votre compte"
 * email sent to legacy Supabase Auth users. Reads ?token=<plain> from URL,
 * lets the user choose a password, then auto-logs them in (the server
 * issues a session in the same response).
 *
 * Differs from ResetPasswordPage in two ways:
 *   - Welcoming tone (this is a re-onboarding moment, not a recovery)
 *   - Auto-login on success → /game (no separate signin step)
 */
const ClaimAccountPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuthContext();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Le mot de passe doit contenir au moins une lettre et un chiffre.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmAccountClaim(token, password);
      // Tokens are persisted by the client. Hydrate the profile so the
      // redirect lands on a fully-ready /game.
      await refreshProfile();
      setDone(true);
    } catch (err: any) {
      const code = err?.body?.error;
      if (code === 'invalid_or_expired_token') {
        setError('Lien expiré ou déjà utilisé. Demandez-en un nouveau depuis la page de connexion.');
      } else if (code === 'already_claimed') {
        setError('Ce compte est déjà activé. Connectez-vous avec votre mot de passe.');
      } else if (code === 'weak_password') {
        setError(err?.body?.message || 'Mot de passe trop faible.');
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-canvas min-h-[70vh] flex items-center">
        <Container width="narrow" className="py-16">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle size={40} strokeWidth={1.5} className="text-danger mx-auto mb-6" />
            <h1
              className="font-display text-ink mb-4"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
            >
              Lien invalide
            </h1>
            <p className="text-ink-muted text-sm mb-8">
              Aucun token dans l'URL. Cliquez sur le bouton dans l'email d'activation.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Retour à l'accueil
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-canvas min-h-[70vh] flex items-center">
        <Container width="narrow" className="py-16">
          <div className="max-w-md mx-auto text-center">
            <CheckCircle2 size={40} strokeWidth={1.5} className="text-accent mx-auto mb-6" />
            <p className="kicker mb-3">Compte activé</p>
            <h1
              className="font-display text-ink mb-4"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
            >
              Bon retour parmi nous
            </h1>
            <p className="text-ink-muted text-sm mb-8">
              Vos parties, votre rating et vos amis sont là, intacts. Vous êtes connecté.
            </p>
            <button
              type="button"
              onClick={() => navigate('/game')}
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Accéder au jeu
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen flex flex-col">
      <Container width="narrow" className="flex-1 flex flex-col items-center justify-center py-16">
        <div className="text-center mb-10">
          <Wordmark size="xl" className="text-7xl" />
          <p className="kicker mt-6 inline-flex items-center gap-2">
            <Sparkles size={12} strokeWidth={1.75} className="text-accent" />
            Activation de compte
          </p>
        </div>

        <div className="w-full max-w-md mb-6 text-center">
          <p className="text-sm text-ink-muted leading-relaxed">
            Songo a migré son système d'authentification. Définissez un mot de passe
            pour conserver l'accès à <span className="text-ink">vos parties, votre classement et vos amis</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">
              Confirmer
            </label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          <p className="text-xs text-ink-subtle">
            Au moins 8 caractères, avec une lettre et un chiffre.
          </p>

          {error && (
            <div role="alert" className="border-l-2 border-danger text-danger bg-danger/5 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="w-full h-11 inline-flex items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium tracking-wide transition-colors duration-150"
          >
            {submitting ? 'Activation…' : 'Activer mon compte'}
          </button>
        </form>
      </Container>
    </div>
  );
};

export default ClaimAccountPage;
