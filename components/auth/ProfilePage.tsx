import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, updateUsername, updateProfile } from '../../services/authService';
import { getAllSkinsWithUnlockStatus, selectBoardSkin, type BoardSkin } from '../../services/boardSkinService';
import type { Profile } from '../../services/supabase';
import { ArrowLeft, Edit2, Save, X, Lock } from 'lucide-react';
import ParticlesBackground from '../effects/ParticlesBackground';
import AnimatedGradient from '../effects/AnimatedGradient';

interface ProfilePageProps {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: (profile: Profile) => void;
}

const AVATARS = [
  '/avatars/avatar_male_black.png',
  '/avatars/avatar_female_black.png',
  '/avatars/avatar_male_white.png',
  '/avatars/avatar_female_white.png',
];

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onClose, onProfileUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar_url || AVATARS[0]);
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(profile.selected_board_skin);

  const [availableSkins, setAvailableSkins] = useState<(BoardSkin & { unlocked: boolean })[]>([]);
  const [loadingSkins, setLoadingSkins] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync state when profile changes
  useEffect(() => {
    setUsername(profile.username);
    setDisplayName(profile.display_name || '');
    setBio(profile.bio || '');
    setSelectedAvatar(profile.avatar_url || AVATARS[0]);
    setSelectedSkinId(profile.selected_board_skin);
  }, [profile]);

  // Fetch available skins
  useEffect(() => {
    const fetchSkins = async () => {
      try {
        const skins = await getAllSkinsWithUnlockStatus(profile.id);
        setAvailableSkins(skins);

        // If no skin selected, or selected skin not found, default to the first unlocked one (usually classic)
        if (!profile.selected_board_skin && skins.length > 0) {
          const defaultSkin = skins.find(s => s.name === 'Classic Wood') || skins[0];
          setSelectedSkinId(defaultSkin.id);
        }
      } catch (err) {
        console.error('Error fetching skins:', err);
      } finally {
        setLoadingSkins(false);
      }
    };

    fetchSkins();
  }, [profile.id]);

  const handleSave = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const updates: Partial<Profile> = {};
      let usernameChanged = false;

      // Check if username changed
      if (username !== profile.username) {
        usernameChanged = true;
      }

      // Check if other fields changed
      if (displayName !== (profile.display_name || '')) {
        updates.display_name = displayName;
      }

      if (bio !== (profile.bio || '')) {
        updates.bio = bio;
      }

      if (selectedAvatar !== profile.avatar_url) {
        updates.avatar_url = selectedAvatar;
      }

      // Update username separately
      if (usernameChanged) {
        await updateUsername(profile.id, username);
      }

      // Update board skin if changed
      if (selectedSkinId && selectedSkinId !== profile.selected_board_skin) {
        // Use the specific service to select skin (handles validation)
        await selectBoardSkin(profile.id, selectedSkinId);
        // We don't add it to 'updates' because selectBoardSkin handles the DB update
        // But we need to update the local profile object below
      }

      // Update other fields
      if (Object.keys(updates).length > 0) {
        await updateProfile(profile.id, updates);
      }

      // Refresh profile object for parent
      const updatedProfile = {
        ...profile,
        username,
        display_name: displayName,
        bio,
        avatar_url: selectedAvatar,
        selected_board_skin: selectedSkinId
      };
      onProfileUpdated(updatedProfile);

      setSuccessMessage('Profil mis à jour avec succès !');
      setIsEditing(false);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError('Erreur lors de la déconnexion');
    }
  };

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  const currentSkinName = availableSkins.find(s => s.id === selectedSkinId)?.name || 'Classique';

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Particles Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticlesBackground theme="dark" />
      </div>

      {/* Animated Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatedGradient variant="dark" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6 text-amber-400" />
            </button>
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Mon Profil
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Avatar & Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Avatar Card */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-3xl" />

              <div className="relative z-10 w-full flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                  className="relative w-40 h-40 mb-6 rounded-full overflow-hidden border-4 border-amber-500 shadow-2xl shadow-amber-500/30 group"
                >
                  <img
                    src={selectedAvatar || '/avatars/avatar_male_black.png'}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                    >
                      <span className="text-sm font-bold flex items-center gap-2 text-white">
                        <Edit2 className="w-5 h-5" /> Modifier
                      </span>
                    </button>
                  )}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 text-center mb-2"
                >
                  {profile.display_name || profile.username}
                </motion.h2>
                <p className="text-gray-400 text-sm text-center mb-6">@{profile.username}</p>

                {/* Quick Stats Grid */}
                <div className="w-full grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                      {profile.games_played}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Parties</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                      {profile.games_won}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Victoires</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                      {winRate}%
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Win Rate</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                      {profile.elo_rating}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">ELO</div>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-amber-500/50 flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-5 h-5" /> Modifier le profil
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Details & Editing */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8 space-y-6"
          >
            {/* Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="text-red-400 font-semibold">{error}</div>
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="text-green-400 font-semibold">{successMessage}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Edit Form / View Details */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-3xl" />

              <h3 className="relative z-10 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-6">
                Informations Personnelles
              </h3>

              {isEditing ? (
                <div className="relative z-10 space-y-6">
                  {/* Avatar Selection */}
                  <div>
                    <label className="block text-sm font-bold text-amber-400 mb-3">Choisir un avatar</label>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {AVATARS.map((avatar) => (
                        <button
                          key={avatar}
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`relative w-20 h-20 rounded-full overflow-hidden border-3 transition-all flex-shrink-0 hover:scale-110 ${
                            selectedAvatar === avatar
                              ? 'border-amber-500 ring-4 ring-amber-500/30 scale-110'
                              : 'border-white/20 hover:border-amber-500/50'
                          }`}
                        >
                          <img src={avatar} alt="Avatar option" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Board Skin Selection */}
                  <div>
                    <label className="block text-sm font-bold text-amber-400 mb-3">Apparence du plateau</label>
                    {loadingSkins ? (
                      <div className="text-sm text-gray-400">Chargement des apparences...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {availableSkins.map((skin) => (
                          <button
                            key={skin.id}
                            onClick={() => skin.unlocked && setSelectedSkinId(skin.id)}
                            disabled={!skin.unlocked}
                            className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:scale-105 ${
                              selectedSkinId === skin.id
                                ? 'border-amber-500 bg-amber-500/20 shadow-lg shadow-amber-500/30'
                                : skin.unlocked
                                  ? 'border-white/10 hover:border-amber-500/50 bg-white/5'
                                  : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="w-full h-16 rounded-lg overflow-hidden relative">
                              <img src={skin.image_url} alt={skin.name} className="w-full h-full object-cover" />
                              {!skin.unlocked && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-semibold truncate w-full text-center text-gray-300">{skin.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-amber-400 mb-2">Nom d'utilisateur</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500/30 transition-all text-white placeholder-gray-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Lettres minuscules et chiffres uniquement</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-amber-400 mb-2">Nom d'affichage</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500/30 transition-all text-white placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-amber-400 mb-2">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500/30 transition-all text-white placeholder-gray-500 resize-none"
                      placeholder="Parlez-nous de vous..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" /> {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setUsername(profile.username);
                        setDisplayName(profile.display_name || '');
                        setBio(profile.bio || '');
                        setSelectedAvatar(profile.avatar_url || AVATARS[0]);
                        setSelectedSkinId(profile.selected_board_skin);
                      }}
                      disabled={loading}
                      className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <span className="block text-sm text-amber-400 font-bold mb-1">Nom d'utilisateur</span>
                      <span className="text-xl font-bold text-white">@{profile.username}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <span className="block text-sm text-amber-400 font-bold mb-1">Nom d'affichage</span>
                      <span className="text-xl font-bold text-white">{profile.display_name || '-'}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="block text-sm text-amber-400 font-bold mb-2">Bio</span>
                    <p className="text-gray-300">
                      {profile.bio || 'Aucune bio définie.'}
                    </p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="block text-sm text-amber-400 font-bold mb-2">Apparence du plateau</span>
                    <span className="text-lg font-bold text-white capitalize">
                      {currentSkinName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Statistics */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-3xl" />

              <h3 className="relative z-10 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-6">
                Statistiques Détaillées
              </h3>

              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Parties', value: profile.games_played, color: 'from-blue-500 to-cyan-500' },
                  { label: 'Victoires', value: profile.games_won, color: 'from-green-500 to-emerald-500' },
                  { label: 'Défaites', value: profile.games_lost, color: 'from-red-500 to-rose-500' },
                  { label: 'Nuls', value: profile.games_drawn, color: 'from-purple-500 to-pink-500' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center hover:scale-105 transition-transform"
                  >
                    <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* ELO Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="relative bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-2 border-amber-500/50 rounded-2xl p-6 flex items-center justify-between overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-sm text-amber-400 font-bold uppercase tracking-wider mb-1">Classement ELO</div>
                  <div className="text-5xl font-black text-white">{profile.elo_rating}</div>
                </div>
                <div className="relative z-10 text-right">
                  <div className="text-xs text-amber-300 mb-1">Meilleur score</div>
                  <div className="text-2xl font-bold text-white">{profile.peak_elo}</div>
                </div>
              </motion.div>
            </div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <button
                onClick={handleSignOut}
                className="w-full py-4 px-6 bg-red-900/20 hover:bg-red-900/40 border-2 border-red-500/50 hover:border-red-500 text-red-400 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/30"
              >
                Se déconnecter
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
