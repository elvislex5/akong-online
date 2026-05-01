import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, UserPlus, Users } from 'lucide-react';
import { getOnlineUsers } from '../../services/presenceService';
import { sendInvitation } from '../../services/invitationService';
import { createGameRoom } from '../../services/roomService';
import { useAuth } from '../../hooks/useAuth';
import type { OnlineUser } from '../../services/supabase';
import { onlineManager } from '../../services/onlineManager';
import toast from 'react-hot-toast';

interface LobbyProps {
  onJoinRoom: (roomId: string) => void;
  onClose: () => void;
  existingRoomId?: string;
  existingRoomCode?: string;
}

export function Lobby({ onJoinRoom, existingRoomId, existingRoomCode }: LobbyProps) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadOnlineUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOnlineUsers = async (initial = false) => {
    if (!user) return;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const users = await getOnlineUsers(user.id);
      setOnlineUsers(users);
    } catch (error) {
      console.error('[Lobby] Error loading online users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInvite = async (targetUser: OnlineUser) => {
    if (!user || invitingUserId) return;

    try {
      setInvitingUserId(targetUser.user_id);
      let roomIdToUse = existingRoomId;
      let codeToUse = existingRoomCode;

      // If no existing room, create one (old flow)
      if (!roomIdToUse) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const room = await createGameRoom(user.id, code);
        if (!room) throw new Error('Failed to create room');
        roomIdToUse = room.id;
        codeToUse = code;
      }

      const invite = await sendInvitation(user.id, targetUser.user_id, roomIdToUse);
      if (invite) {
        onlineManager.sendInvitation(invite.id, targetUser.user_id, user.id);
      }

      toast.success(`Invitation envoyée à ${targetUser.username}.`);

      // Only join if we created a NEW room (old flow)
      if (!existingRoomId && codeToUse) {
        onJoinRoom(codeToUse);
      }
    } catch (error) {
      console.error('[Lobby] Error sending invitation:', error);
      toast.error("Erreur lors de l'envoi de l'invitation");
    } finally {
      setInvitingUserId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col w-full h-full bg-surface border border-rule"
    >
      {/* Header */}
      <div className="flex items-end justify-between gap-4 px-4 py-3 border-b border-rule">
        <div>
          <p className="kicker">
            Joueurs en ligne · {onlineUsers.length}
          </p>
          <p className="text-xs text-ink-subtle mt-0.5">
            Cliquez « Inviter » pour proposer une partie
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadOnlineUsers(false)}
          aria-label="Rafraîchir la liste"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-muted hover:text-ink hover:bg-canvas border border-rule transition-colors duration-150"
        >
          <RefreshCw size={14} strokeWidth={1.75} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-[260px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-ink-subtle">
            Chargement…
          </div>
        ) : onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-subtle gap-3 px-6 py-12 text-center">
            <Users size={24} strokeWidth={1.5} />
            <p className="text-sm leading-relaxed">
              Aucun autre joueur en ligne pour le moment.
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-rule">
            {onlineUsers.map((player) => {
              const inGame = player.status === 'in_game';
              const isPending = invitingUserId === player.user_id;
              return (
                <li
                  key={player.user_id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-canvas hover:bg-surface transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={
                          player.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`
                        }
                        alt=""
                        className="w-9 h-9 rounded-full border border-rule object-cover bg-surface"
                      />
                      <span
                        aria-hidden="true"
                        className={
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-canvas ' +
                          (inGame ? 'bg-warning' : 'bg-success')
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-ink font-medium truncate">
                        {player.display_name || player.username}
                      </p>
                      <p className="text-xs text-ink-subtle">
                        {inGame ? 'En partie' : 'Disponible'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInvite(player)}
                    disabled={inGame || isPending}
                    className={
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 ' +
                      (inGame
                        ? 'border border-rule text-ink-subtle cursor-not-allowed'
                        : isPending
                          ? 'bg-accent text-accent-ink opacity-70 cursor-wait'
                          : 'border border-rule-strong text-ink hover:border-accent hover:text-accent')
                    }
                  >
                    {isPending ? (
                      'Envoi…'
                    ) : (
                      <>
                        <UserPlus size={12} strokeWidth={1.75} />
                        Inviter
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
