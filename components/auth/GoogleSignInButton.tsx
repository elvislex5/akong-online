import React from 'react';
import { googleSignInUrl } from '../../services/auth/client';

/**
 * Minimalist Google sign-in button — matches the surrounding design system
 * (no Google blue, no shadows). The G logo is the only branding nod, so it
 * still reads as "Google" without breaking the page's visual rhythm.
 *
 * Clicks navigate top-frame to the server's /auth/oauth/google/start
 * endpoint, which redirects through Google and eventually lands on
 * /auth/oauth/callback in this app.
 */
interface Props {
  redirectAfter?: string;
  disabled?: boolean;
  label?: string;
}

export const GoogleSignInButton: React.FC<Props> = ({
  redirectAfter,
  disabled,
  label = 'Continuer avec Google',
}) => {
  const handleClick = () => {
    if (disabled) return;
    window.location.href = googleSignInUrl(redirectAfter);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-md border border-rule-strong bg-canvas text-ink hover:bg-surface hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium tracking-wide transition-colors duration-150"
    >
      <GoogleGlyph />
      {label}
    </button>
  );
};

const GoogleGlyph: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 18 18"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
    />
  </svg>
);
