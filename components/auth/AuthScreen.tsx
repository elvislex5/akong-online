import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { Container } from '../ui/Container';
import { Input } from '../ui/Input';
import { Wordmark } from '../ui/Wordmark';
import { GoogleSignInButton } from './GoogleSignInButton';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { signIn: ctxSignIn, signUp: ctxSignUp } = useAuthContext();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (mode === 'register') {
      // Mirrors the server-side strength check (passwords.js): ≥8 chars,
      // ≥1 letter, ≥1 digit, ≤128 chars.
      if (password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        setError('Le mot de passe doit contenir au moins une lettre et un chiffre.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await ctxSignIn(email, password);
        onAuthSuccess?.();
      } else {
        await ctxSignUp(email, password);
        setSuccess('Compte créé. Un email de confirmation vous a été envoyé.');
        onAuthSuccess?.();
      }
    } catch (err: any) {
      const code = err?.body?.error || err?.message || '';
      // Don't shout in the console for codes that drive UI flows by design.
      const expected = code === 'account_needs_claim' || code === 'use_oauth_provider';
      if (!expected) console.error('[AuthScreen]', err);
      if (code === 'invalid_credentials') setError('Email ou mot de passe incorrect.');
      else if (code === 'email_taken') setError('Cet email est déjà utilisé.');
      else if (code === 'weak_password') setError(err?.body?.message || 'Mot de passe trop faible.');
      else if (code === 'invalid_email') setError('Email invalide.');
      else if (code === 'account_locked') setError('Compte temporairement verrouillé. Réessayez dans 15 minutes.');
      else if (code === 'account_needs_claim') {
        // Legacy Supabase user — server fired a claim email in the same request.
        // Tell them to check their inbox; they'll set their password from the link.
        setSuccess(
          "Compte trouvé. Songo a migré son authentification : nous venons de vous envoyer un email pour définir votre mot de passe. Vérifiez votre boîte de réception."
        );
      }
      else if (code === 'use_oauth_provider') {
        setError("Ce compte utilise un fournisseur externe (Google). Connectez-vous via le bouton dédié.");
      }
      else setError('Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-canvas min-h-screen flex flex-col">
      <Container width="narrow" className="flex-1 flex flex-col items-center justify-center py-16">
        {/* Brand block */}
        <div className="text-center mb-12">
          <Wordmark size="xl" className="text-7xl" />
          <p className="kicker mt-6">Mancala africain · Variante Mpem</p>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-md">
          {/* Segmented tabs */}
          <div role="tablist" aria-label="Mode" className="grid grid-cols-2 mb-8 border border-rule">
            <Tab active={mode === 'login'} onClick={() => switchMode('login')} label="Connexion" />
            <Tab active={mode === 'register'} onClick={() => switchMode('register')} label="Inscription" />
          </div>

          {/* OAuth providers — above the email form so they read as the
              easiest path. The "ou" separator visually demotes email. */}
          <div className="mb-6">
            <GoogleSignInButton
              disabled={loading}
              label={mode === 'login' ? 'Continuer avec Google' : "S'inscrire avec Google"}
            />
          </div>
          <div className="flex items-center gap-3 mb-6" role="separator" aria-label="ou">
            <div className="flex-1 h-px bg-rule" />
            <span className="text-xs text-ink-subtle tracking-[0.16em] uppercase">ou</span>
            <div className="flex-1 h-px bg-rule" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                disabled={loading}
              />
            </Field>

            <Field label="Mot de passe" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={loading}
              />
            </Field>

            {mode === 'register' && (
              <Field label="Confirmer le mot de passe" htmlFor="confirm">
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </Field>
            )}

            {error && <Notice tone="danger">{error}</Notice>}
            {success && <Notice tone="success">{success}</Notice>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium tracking-wide transition-colors duration-150"
            >
              {loading ? 'Patience…' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>

            {mode === 'login' && (
              <p className="text-center">
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-ink-muted hover:text-ink underline decoration-rule-strong underline-offset-[3px] hover:decoration-accent transition-colors duration-150"
                >
                  Mot de passe oublié ?
                </Link>
              </p>
            )}
          </form>

          <p className="mt-8 text-center text-sm text-ink-muted">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-ink underline decoration-rule-strong underline-offset-[3px] hover:decoration-accent hover:text-accent transition-colors duration-150"
                >
                  Inscrivez-vous
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-ink underline decoration-rule-strong underline-offset-[3px] hover:decoration-accent hover:text-accent transition-colors duration-150"
                >
                  Connectez-vous
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-12 text-xs text-ink-subtle">© {new Date().getFullYear()} Songo. Jeu traditionnel d&apos;Afrique centrale.</p>
      </Container>
    </div>
  );
};

export default AuthScreen;

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const Tab: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={
      'h-10 text-sm font-medium tracking-wide transition-colors duration-150 ' +
      (active
        ? 'bg-accent text-accent-ink'
        : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
    }
  >
    {label}
  </button>
);

const Field: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({ label, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">
      {label}
    </label>
    {children}
  </div>
);

const Notice: React.FC<{ tone: 'danger' | 'success'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'danger' ? 'alert' : 'status'}
    className={
      'border-l-2 px-3 py-2 text-sm ' +
      (tone === 'danger'
        ? 'border-danger text-danger bg-danger/5'
        : 'border-success text-success bg-success/5')
    }
  >
    {children}
  </div>
);
