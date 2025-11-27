import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile } from '../../services/supabase';
import { updateProfile, signOut, getCurrentUser } from '../../services/authService';
import BoardSkinSelector from '../profile/BoardSkinSelector';
import toast from 'react-hot-toast';

interface ProfilePageRevolutionaryProps {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: (profile: Profile) => void;
}

const ProfilePageRevolutionary: React.FC<ProfilePageRevolutionaryProps> = ({
  profile,
  onClose,
  onProfileUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'customize'>('stats');

  const handleSave = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      const updated = await updateProfile(user.id, { display_name: displayName });
      if (updated) {
        onProfileUpdated(updated);
        toast.success('Profil mis à jour !');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const winRate = profile.games_played > 0
    ? ((profile.games_won / profile.games_played) * 100).toFixed(1)
    : '0';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-black border-2 border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Avatar */}
            <div className="inline-block relative mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl">
                <span className="text-6xl font-black text-white">
                  {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center">
                <span className="text-lg">✓</span>
              </div>
            </div>

            {/* Name */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.input
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-3xl font-black text-center bg-white/10 border-2 border-amber-500/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 mb-2"
                  placeholder="Votre nom"
                />
              ) : (
                <motion.h2
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2"
                >
                  {profile.display_name || profile.username}
                </motion.h2>
              )}
            </AnimatePresence>

            <p className="text-gray-400">@{profile.username}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Statistiques
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'customize'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Personnalisation
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'stats' ? (
            <>
              {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Parties', value: profile.games_played, color: 'from-blue-500 to-cyan-500' },
              { label: 'Victoires', value: profile.games_won, color: 'from-green-500 to-emerald-500' },
              { label: 'Win Rate', value: `${winRate}%`, color: 'from-purple-500 to-pink-500' },
              { label: 'ELO', value: profile.elo_rating, color: 'from-amber-500 to-orange-500' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center overflow-hidden group hover:scale-105 transition-transform"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative">
                  <div className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-2">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsEditing(true)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-amber-500/50"
                >
                  Modifier le profil
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={handleSignOut}
              className="w-full px-6 py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 hover:border-red-500 rounded-xl font-semibold text-red-400 transition-all"
            >
              Se déconnecter
            </button>
          </div>
            </>
          ) : (
            /* Customization Tab */
            <div className="mb-8">
              <BoardSkinSelector
                userId={profile.id}
                currentSkinId={profile.selected_board_skin}
                onSkinSelected={() => {
                  // Reload page to apply new skin
                  window.location.reload();
                }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePageRevolutionary;
