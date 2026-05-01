import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { requestEmailVerification } from '../services/auth/client';

/**
 * Gate hook for sensitive actions that require a verified email
 * (online ranked play, tournaments, friend requests, challenges).
 *
 * Usage:
 *   const requireVerified = useEmailVerificationGate();
 *   const onClick = () => requireVerified(() => doTheThing(), 'lancer une partie');
 *
 * If the user's email is verified, the action runs immediately. Otherwise
 * a toast pops up explaining why and offering to resend the verification
 * email. The toast wording uses the optional `reason` to be specific.
 */
export function useEmailVerificationGate() {
  const { user } = useAuth();
  const isVerified = !!user?.emailVerified;

  return useCallback(
    (action: () => void | Promise<void>, reason?: string) => {
      if (isVerified) {
        return action();
      }
      const what = reason ? ` pour ${reason}` : '';
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <strong>Email à vérifier</strong>
              {what} — confirmez votre adresse pour débloquer cette action.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={async () => {
                  if (user?.email) {
                    try {
                      await requestEmailVerification(user.email);
                      toast.success('Email renvoyé. Vérifiez votre boîte.');
                    } catch {
                      toast.error("Impossible d'envoyer maintenant.");
                    }
                  }
                  toast.dismiss(t.id);
                }}
                className="text-xs font-medium px-2 py-1 rounded bg-accent text-accent-ink hover:bg-accent-hover"
              >
                Renvoyer l'email
              </button>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Plus tard
              </button>
            </div>
          </div>
        ),
        { duration: 8000 },
      );
    },
    [isVerified, user?.email],
  );
}
