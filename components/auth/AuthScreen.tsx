import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signUp } from '../../services/authService';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
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
        onAuthSuccess?.();
      } else {
        await signUp(email, password);
        setSuccessMessage('Compte créé ! Veuillez vérifier votre email pour confirmer votre compte.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
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

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24">
        {/* Background uses the global board skin from AppRouter - no need to duplicate */}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Title */}
        <div className="text-center mb-8">
            <motion.h1
              className="text-7xl sm:text-8xl font-black mb-4"
              animate={{
                textShadow: [
                  '0 0 20px rgba(255, 215, 0, 0.4)',
                  '0 0 50px rgba(255, 165, 0, 0.6)',
                  '0 0 20px rgba(255, 215, 0, 0.4)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500">
                AKÔNG
              </span>
            </motion.h1>
          <p className="text-gray-300 text-lg">Le Jeu du Songo Réinventé</p>
        </div>

        {/* Auth Card - Revolutionary Style */}
        <div className="bg-gradient-to-br from-gray-900/40 to-black/40 backdrop-blur-xl border-2 border-amber-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 pointer-events-none"></div>

          <div className="relative z-10">
            {/* Tabs */}
            <div className="flex mb-6 bg-black/20 p-1 rounded-xl">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-white transition-all relative ${mode === 'login' ? '' : 'text-gray-400 hover:text-white'}`}
            >
              {mode === 'login' && <motion.div layoutId="auth-tab" className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg shadow-md" />}
              <span className="relative z-10">Connexion</span>
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-white transition-all relative ${mode === 'register' ? '' : 'text-gray-400 hover:text-white'}`}
            >
              {mode === 'register' && <motion.div layoutId="auth-tab" className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg shadow-md" />}
              <span className="relative z-10">Inscription</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="votre@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Confirm Password (Register only) */}
            <AnimatePresence>
            {mode === 'register' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 p-3 rounded-xl">
                <p className="text-red-300 text-sm font-medium text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-900/50 border border-green-500/50 p-3 rounded-xl">
                <p className="text-green-300 text-sm font-medium text-center">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-4 rounded-xl font-bold text-lg text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                  ${loading ? 'bg-gray-600' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:shadow-amber-500/50'}`
                }
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    {/* SVG Spinner */}
                    Chargement...
                  </span>
                ) : mode === 'login' ? (
                  'Se connecter'
                ) : (
                  'Créer un compte'
                )}
              </button>
            </div>
          </form>

            {/* Help Text */}
            <div className="mt-6 text-center text-sm text-gray-400">
              {mode === 'login' ? (
                <p>
                  Pas encore de compte ?{' '}
                  <button onClick={() => switchMode('register')} className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                    Inscrivez-vous
                  </button>
                </p>
              ) : (
                <p>
                  Déjà un compte ?{' '}
                  <button onClick={() => switchMode('login')} className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                    Connectez-vous
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Akông - Jeu traditionnel africain de stratégie</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
