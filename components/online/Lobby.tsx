import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Circle, LogIn } from 'lucide-react';
import { getOnlineUsers, subscribeToUserPresence } from '../../services/presenceService';
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

export function Lobby({ onJoinRoom, onClose, existingRoomId, existingRoomCode }: LobbyProps) {
    const { user, profile } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        loadOnlineUsers();
    }, [user]);

    const loadOnlineUsers = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const users = await getOnlineUsers(user.id);
            setOnlineUsers(users);
        } catch (error) {
            console.error('Error loading online users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (targetUser: OnlineUser) => {
        if (!user || invitingUserId) return;

        try {
            setInvitingUserId(targetUser.user_id);
            let roomIdToUse = existingRoomId;
            let codeToUse = existingRoomCode;

            // If no existing room, create one (Old Flow)
            if (!roomIdToUse) {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                const room = await createGameRoom(user.id, code);
                if (!room) throw new Error("Failed to create room");
                roomIdToUse = room.id;
                codeToUse = code;
            }

            // Send invitation
            const invite = await sendInvitation(user.id, targetUser.user_id, roomIdToUse);

            // Send via Socket for immediate notification
            if (invite) {
                onlineManager.sendInvitation(invite.id, targetUser.user_id, user.id);
            }

            toast.success(`Invitation envoyée à ${targetUser.username} !`);

            // Only join if we created a NEW room (Old Flow)
            if (!existingRoomId && codeToUse) {
                onJoinRoom(codeToUse);
            }

        } catch (error) {
            console.error('Error sending invitation:', error);
            toast.error("Erreur lors de l'envoi de l'invitation");
        } finally {
            setInvitingUserId(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 w-full h-full"
        >
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                        Joueurs en ligne
                    </h3>
                    <p className="text-gray-400 text-sm">
                        {onlineUsers.length} joueur{onlineUsers.length !== 1 ? 's' : ''} connecté{onlineUsers.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={loadOnlineUsers}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Actualiser"
                >
                    <Users className="w-5 h-5 text-emerald-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/20 rounded-xl p-2 border border-white/10 min-h-[300px] custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Chargement...
                    </div>
                ) : onlineUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                        <Users className="w-12 h-12 opacity-20" />
                        <p>Aucun autre joueur en ligne.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {onlineUsers.map((player) => (
                            <div
                                key={player.user_id}
                                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img
                                            src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                            alt={player.username}
                                            className="w-10 h-10 rounded-full bg-gray-700"
                                        />
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[#1a1a2e] rounded-full ${player.status === 'in_game' ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-200">{player.display_name || player.username}</h4>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            {player.status === 'in_game' ? (
                                                <>
                                                    <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />
                                                    En partie
                                                </>
                                            ) : (
                                                <>
                                                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                                                    Disponible
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleInvite(player)}
                                    disabled={player.status === 'in_game' || invitingUserId === player.user_id}
                                    className={`
                    px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all
                    ${player.status === 'in_game'
                                            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                        }
                  `}
                                >
                                    {invitingUserId === player.user_id ? (
                                        <span className="animate-pulse">Envoi...</span>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Inviter
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
