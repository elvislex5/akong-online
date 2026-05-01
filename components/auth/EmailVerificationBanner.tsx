import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { requestEmailVerification } from '../../services/auth/client';

const DISMISS_KEY = 'songo_verif_banner_dismissed_v1';

/**
 * Persistent reminder banner. Shows when the logged-in user hasn't
 * verified their email yet. Dismissible per browser session
 * (sessionStorage) — disappears for the rest of the session, comes
 * back on next visit. Sticks at the very top above the navbar.
 *
 * The "Renvoyer l'email" button calls /auth/verify-email/request and
 * surfaces feedback as a toast.
 */
export const EmailVerificationBanner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });
  const [resending, setResending] = useState(false);

  if (!isAuthenticated) return null;
  if (!user || user.emailVerified) return null;
  if (dismissed) return null;

  const handleResend = async () => {
    if (!user.email || resending) return;
    setResending(true);
    try {
      await requestEmailVerification(user.email);
      toast.success('Email renvoyé. Vérifiez votre boîte.');
    } catch {
      toast.error("Impossible d'envoyer maintenant. Réessayez plus tard.");
    } finally {
      setResending(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sessionStorage unavailable — that's fine, dismiss for this render */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-accent/10 border-b border-accent/30 text-ink"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <Mail size={14} strokeWidth={1.75} className="text-accent shrink-0" />
        <p className="text-xs sm:text-sm flex-1 leading-snug">
          <span className="font-medium">Vérifiez votre adresse email</span>
          <span className="text-ink-muted hidden sm:inline">
            {' '}— sans confirmation, vous ne pouvez pas jouer en ligne, rejoindre des tournois ni ajouter d'amis.
          </span>
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-60 transition-colors duration-150 shrink-0"
        >
          {resending ? 'Envoi…' : "Renvoyer l'email"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Masquer"
          className="text-ink-muted hover:text-ink shrink-0"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};
