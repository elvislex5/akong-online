import React, { useState } from 'react';
import { signOut, updateUsername, updateProfile } from '../../services/authService';
import type { Profile } from '../../services/supabase';

interface ProfilePageProps {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: (profile: Profile) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onClose, onProfileUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

      // Update username separately (has its own validation)
      if (usernameChanged) {
        await updateUsername(profile.id, username);
      }

      // Update other fields
      if (Object.keys(updates).length > 0) {
        await updateProfile(profile.id, updates);
      }

      // Refresh profile
      const updatedProfile = { ...profile, username, display_name: displayName, bio };
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
      window.location.reload(); // Simple reload to reset state
    } catch (err: any) {
      console.error('Error signing out:', err);
      setError('Erreur lors de la déconnexion');
    }
  };

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Profil</h2>
              <p className="text-gray-800 mt-1">@{profile.username}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-900 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Success/Error Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-3">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Profile Info */}
          {!isEditing ? (
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nom d'affichage</label>
                <p className="text-white text-lg">{profile.display_name || 'Non défini'}</p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                <p className="text-white">{profile.bio || 'Aucune bio'}</p>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-lg transition"
              >
                Modifier le profil
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Edit Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  3-20 caractères, uniquement lettres minuscules, chiffres et underscores
                </p>
              </div>

              {/* Edit Display Name */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                  Nom d'affichage
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  disabled={loading}
                />
              </div>

              {/* Edit Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">{bio.length}/200 caractères</p>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(profile.username);
                    setDisplayName(profile.display_name || '');
                    setBio(profile.bio || '');
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-white mb-4">Statistiques</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Parties jouées</p>
                <p className="text-2xl font-bold text-white">{profile.games_played}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Victoires</p>
                <p className="text-2xl font-bold text-green-400">{profile.games_won}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Défaites</p>
                <p className="text-2xl font-bold text-red-400">{profile.games_lost}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Taux de victoire</p>
                <p className="text-2xl font-bold text-amber-500">{winRate}%</p>
              </div>
            </div>

            {/* ELO (Phase 4) */}
            <div className="mt-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-lg p-4 border border-amber-500/30">
              <p className="text-gray-400 text-sm">Classement ELO</p>
              <p className="text-3xl font-bold text-amber-500">{profile.elo_rating}</p>
              <p className="text-xs text-gray-500 mt-1">Record: {profile.peak_elo}</p>
            </div>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-700 pt-6">
            <button
              onClick={handleSignOut}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
