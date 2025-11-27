/**
 * LobbyPage.tsx
 * Lobby page showing online users and invitation system
 * Phase 3a - Social Features
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getOnlineUsers, subscribeToOnlineUsers } from '../services/presenceService';
import { hasPendingInvitation } from '../services/invitationService';
import type { OnlineUser } from '../services/supabase';
import toast from 'react-hot-toast';

export default function LobbyPage() {
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [filter, setFilter] = useState<'all' | 'available' | 'in_game'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingInvitations, setSendingInvitations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load online users initially and subscribe to changes
  useEffect(() => {
    if (!user) return;

    getOnlineUsers(user.id)
      .then((users) => {
        setOnlineUsers(users);
        setLoading(false);
      })
      .catch((error) => {
        console.error('[LobbyPage] Error loading online users:', error);
        toast.error('Erreur lors du chargement des joueurs en ligne');
        setLoading(false);
      });

    // Subscribe to realtime updates
    const unsubscribe = subscribeToOnlineUsers((users) => {
      console.log('[LobbyPage] Online users updated:', users.length);
      setOnlineUsers(users);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Filter users
  const filteredUsers = onlineUsers.filter((u) => {
    // Filter by status
    if (filter === 'available' && u.status !== 'online') return false;
    if (filter === 'in_game' && u.status !== 'in_game') return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        u.username.toLowerCase().includes(query) ||
        (u.display_name && u.display_name.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Send invitation to a user
  const handleSendInvitation = async (targetUser: OnlineUser) => {
    if (!user || !profile) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Check if already sending
    if (sendingInvitations.has(targetUser.user_id)) {
      return;
    }

    // Check if user is available
    if (targetUser.status !== 'online') {
      toast.error('Ce joueur n\'est pas disponible');
      return;
    }

    // Check if already has pending invitation
    const alreadyPending = await hasPendingInvitation(user.id, targetUser.user_id);
    if (alreadyPending) {
      toast.error('Vous avez déjà envoyé une invitation à ce joueur');
      return;
    }

    // Mark as sending to disable button
    setSendingInvitations((prev) => new Set(prev).add(targetUser.user_id));

    // Navigate to game page with invitation info
    // The room will be created there, then the invitation will be sent
    navigate('/game', {
      state: {
        inviteUser: {
          userId: targetUser.user_id,
          username: targetUser.username,
          displayName: targetUser.display_name
        }
      }
    });

    // DON'T clear the sending state - it will be cleared when component unmounts
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    if (status === 'online') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
          Disponible
        </span>
      );
    }
    if (status === 'in_game') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
          En partie
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
        Hors ligne
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-amber-400 mb-4">Connexion requise</h2>
          <p className="text-gray-300 mb-6">Vous devez être connecté pour accéder au lobby</p>
          <button
            onClick={() => navigate('/game')}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-lg transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">Lobby</h1>
          <p className="text-gray-300">
            Trouvez des adversaires et lancez une partie !
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Disponibles
            </button>
            <button
              onClick={() => setFilter('in_game')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'in_game'
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              En partie
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Online Users List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Chargement des joueurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-lg">
              {searchQuery
                ? 'Aucun joueur trouvé'
                : filter === 'available'
                ? 'Aucun joueur disponible pour le moment'
                : 'Aucun joueur en ligne'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((targetUser) => (
              <div
                key={targetUser.user_id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-amber-500/50 transition-colors"
              >
                {/* User Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-400">
                      {targetUser.display_name || targetUser.username}
                    </h3>
                    {targetUser.display_name && (
                      <p className="text-sm text-gray-400">@{targetUser.username}</p>
                    )}
                  </div>
                  {getStatusBadge(targetUser.status)}
                </div>

                {/* Invite Button */}
                {targetUser.status === 'online' && (
                  <button
                    onClick={() => handleSendInvitation(targetUser)}
                    disabled={sendingInvitations.has(targetUser.user_id)}
                    className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 font-bold rounded-lg transition-colors"
                  >
                    {sendingInvitations.has(targetUser.user_id) ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                        Envoi...
                      </span>
                    ) : (
                      'Inviter'
                    )}
                  </button>
                )}

                {targetUser.status === 'in_game' && (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-700 text-gray-500 font-bold rounded-lg cursor-not-allowed"
                  >
                    En partie
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
