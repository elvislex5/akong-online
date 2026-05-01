import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Input } from '../components/ui/Input';
import { Wordmark } from '../components/ui/Wordmark';
import { confirmPasswordReset } from '../services/auth/client';

/**
 * Lands here from the password-reset email. Reads ?token=<plain> from URL,
 * lets the user choose a new password, calls /auth/password-reset/confirm.
 *
 * On success: shows a confirmation + link to login. The server has already
 * revoked all previous sessions, so the user must log in with the new
 * password (no auto-signin to avoid masking that side effect).
 */
const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err: any) {
      const code = err?.body?.error;
      if (code === 'invalid_or_expired_token') {
        setError('Lien expiré ou déjà utilisé. Demandez-en un nouveau.');
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
              Aucun token dans l'URL. Réessayez en cliquant sur le bouton dans l'email.
            </p>
            <Link
              to="/auth/forgot-password"
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Demander un nouveau lien
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
            <p className="kicker mb-3">Mot de passe mis à jour</p>
            <h1
              className="font-display text-ink mb-4"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
            >
              Tout est en ordre
            </h1>
            <p className="text-ink-muted text-sm mb-8">
              Pour votre sécurité, toutes vos sessions actives ont été déconnectées.
              Reconnectez-vous avec votre nouveau mot de passe.
            </p>
            <button
              type="button"
              onClick={() => navigate('/game')}
              className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Se connecter
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen flex flex-col">
      <Container width="narrow" className="flex-1 flex flex-col items-center justify-center py-16">
        <div className="text-center mb-12">
          <Wordmark size="xl" className="text-7xl" />
          <p className="kicker mt-6">Nouveau mot de passe</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">
              Nouveau mot de passe
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
            {submitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </Container>
    </div>
  );
};

export default ResetPasswordPage;
