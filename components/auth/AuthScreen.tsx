import React, { useState } from 'react';
import { signIn, signUp } from '../../services/authService';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'register';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        onAuthSuccess();
      } else {
        await signUp(email, password);
        setSuccessMessage('Compte créé ! Vérifiez votre email pour confirmer votre compte.');
        // Note: En mode développement Supabase, l'email de confirmation peut être désactivé
        // Dans ce cas, l'utilisateur peut se connecter immédiatement
        setTimeout(() => {
          onAuthSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      // Handle specific Supabase errors
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect');
      } else if (err.message.includes('already registered')) {
        setError('Cet email est déjà utilisé');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter');
      } else {
        setError(err.message || 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 z-[9999]">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-amber-500 mb-2">AKONG</h1>
          <p className="text-gray-400 text-lg">Le Jeu du Songo</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${
                mode === 'login'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${
                mode === 'register'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="votre@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="••••••••"
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500 rounded-lg p-3">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-bold text-gray-900 transition ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Chargement...
                </span>
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer un compte'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <p>
                Pas encore de compte ?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-amber-500 hover:text-amber-400 font-semibold"
                >
                  Inscrivez-vous
                </button>
              </p>
            ) : (
              <p>
                Déjà un compte ?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-amber-500 hover:text-amber-400 font-semibold"
                >
                  Connectez-vous
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>© 2025 Akong - Jeu traditionnel africain de stratégie</p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
