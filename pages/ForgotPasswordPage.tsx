import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Input } from '../components/ui/Input';
import { Wordmark } from '../components/ui/Wordmark';
import { requestPasswordReset } from '../services/auth/client';

/**
 * "Forgot password" form. Always returns silently to the user
 * (mirrors the server's no-leak behaviour) — same UI message regardless
 * of whether the email is registered.
 */
const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch (err) {
      console.warn('[ForgotPassword] request error:', err);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="bg-canvas min-h-screen flex flex-col">
      <Container width="narrow" className="flex-1 flex flex-col items-center justify-center py-16">
        <div className="text-center mb-12">
          <Wordmark size="xl" className="text-7xl" />
          <p className="kicker mt-6">Récupération du mot de passe</p>
        </div>

        <div className="w-full max-w-md">
          {submitted ? (
            <div className="text-center">
              <Mail size={32} strokeWidth={1.5} className="text-accent mx-auto mb-6" />
              <h1
                className="font-display text-ink mb-4"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.75rem' }}
              >
                Vérifiez votre boîte mail
              </h1>
              <p className="text-ink-muted text-sm mb-8">
                Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé.
                Le lien expire dans 1 heure.
              </p>
              <Link
                to="/game"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-rule-strong text-ink hover:bg-surface text-sm font-medium tracking-wide transition-colors duration-150"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-xs font-medium tracking-[0.12em] uppercase text-ink-muted mb-2">
                  Adresse email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
              </div>

              <p className="text-xs text-ink-subtle">
                Nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe.
                Ce lien sera valable 1 heure.
              </p>

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full h-11 inline-flex items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium tracking-wide transition-colors duration-150"
              >
                {submitting ? 'Envoi…' : 'Envoyer le lien'}
              </button>

              <p className="text-center">
                <Link
                  to="/game"
                  className="text-xs text-ink-muted hover:text-ink underline decoration-rule-strong underline-offset-[3px] hover:decoration-accent transition-colors duration-150"
                >
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;
