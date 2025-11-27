/**
 * InvitationSystem.tsx
 * Global invitation system - handles receiving, accepting, declining invitations
 * Phase 3a - Social Features
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  subscribeToInvitations
} from '../services/invitationService';
import { onlineManager } from '../services/onlineManager';
import type { PendingInvitation } from '../services/supabase';
import toast from 'react-hot-toast';

export default function InvitationSystem() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [currentInvitation, setCurrentInvitation] = useState<PendingInvitation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  // Load pending invitations on mount
  useEffect(() => {
    if (!user) return;

    getPendingInvitations(user.id)
      .then((invitations) => {
        console.log('[InvitationSystem] Loaded pending invitations:', invitations.length);
        setPendingInvitations(invitations);

        // Show first invitation if any
        if (invitations.length > 0) {
          setCurrentInvitation(invitations[0]);
          setShowModal(true);
        }
      })
      .catch((error) => {
        console.error('[InvitationSystem] Error loading invitations:', error);
      });
  }, [user]);

  // Subscribe to new invitations (real-time)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToInvitations(user.id, (invitation) => {
      console.log('[InvitationSystem] New invitation received:', invitation);

      // If this is a new invitation (INSERT event)
      if (invitation.status === 'pending') {
        // Reload pending invitations
        getPendingInvitations(user.id).then((invitations) => {
          setPendingInvitations(invitations);

          // Show modal if not already showing
          if (!showModal && invitations.length > 0) {
            const newInvitation = invitations.find((inv) => inv.id === invitation.id);
            if (newInvitation) {
              setCurrentInvitation(newInvitation);
              setShowModal(true);
            }
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, showModal]);

  // Listen to Socket.io invitation events
  useEffect(() => {
    if (!user) return;

    // When we receive an invitation via Socket.io
    onlineManager.onInvitationReceived((data) => {
      console.log('[InvitationSystem] Invitation received via Socket.io:', data);
      toast.success('Vous avez reçu une invitation !');

      // Reload pending invitations
      getPendingInvitations(user.id).then((invitations) => {
        setPendingInvitations(invitations);

        if (!showModal && invitations.length > 0) {
          const newInvitation = invitations.find((inv) => inv.id === data.invitationId);
          if (newInvitation) {
            setCurrentInvitation(newInvitation);
            setShowModal(true);
          }
        }
      });
    });

    // When our invitation is accepted
    onlineManager.onInvitationAccepted((data) => {
      console.log('[InvitationSystem] Invitation accepted:', data);
      toast.success('Votre invitation a été acceptée !');
    });

    // When our invitation is declined
    onlineManager.onInvitationDeclined((data) => {
      console.log('[InvitationSystem] Invitation declined:', data);
      toast.error('Votre invitation a été refusée');
    });

    // When an invitation is cancelled
    onlineManager.onInvitationCancelled((data) => {
      console.log('[InvitationSystem] Invitation cancelled:', data);
      toast.info('L\'invitation a été annulée');

      // Remove from pending
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== data.invitationId));

      // Close modal if showing this invitation
      if (currentInvitation?.id === data.invitationId) {
        handleNext();
      }
    });
  }, [user, currentInvitation, showModal]);

  // Accept invitation
  const handleAccept = async () => {
    if (!currentInvitation || !user) return;

    setAccepting(true);

    try {
      // Accept in database
      const result = await acceptInvitation(currentInvitation.id);

      if (!result) {
        toast.error('Cette invitation n\'est plus valide');
        handleNext();
        return;
      }

      // Notify sender via Socket.io
      onlineManager.acceptInvitation(
        currentInvitation.id,
        currentInvitation.from_user_id,
        user.id
      );

      toast.success('Invitation acceptée ! Redirection...');

      // Close modal
      setShowModal(false);

      // Remove from pending
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== currentInvitation.id));

      // Redirect to game with room code
      setTimeout(() => {
        navigate(`/game?mode=online&join=${result.room_code}`);
      }, 500);
    } catch (error) {
      console.error('[InvitationSystem] Error accepting invitation:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setAccepting(false);
    }
  };

  // Decline invitation
  const handleDecline = async () => {
    if (!currentInvitation || !user) return;

    setDeclining(true);

    try {
      // Decline in database
      await declineInvitation(currentInvitation.id);

      // Notify sender via Socket.io
      onlineManager.declineInvitation(
        currentInvitation.id,
        currentInvitation.from_user_id,
        user.id
      );

      toast('Invitation refusée');

      // Remove from pending
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== currentInvitation.id));

      // Show next invitation
      handleNext();
    } catch (error) {
      console.error('[InvitationSystem] Error declining invitation:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setDeclining(false);
    }
  };

  // Show next invitation
  const handleNext = () => {
    const remainingInvitations = pendingInvitations.filter(
      (inv) => inv.id !== currentInvitation?.id
    );

    if (remainingInvitations.length > 0) {
      setCurrentInvitation(remainingInvitations[0]);
    } else {
      setCurrentInvitation(null);
      setShowModal(false);
    }
  };

  if (!showModal || !currentInvitation) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 border-2 border-amber-500 rounded-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-amber-400 mb-2">
            Invitation reçue !
          </h2>
          <p className="text-gray-300">
            <span className="font-bold text-white">
              {currentInvitation.from_display_name || currentInvitation.from_username}
            </span>{' '}
            vous invite à jouer une partie !
          </p>
          {currentInvitation.from_display_name && (
            <p className="text-sm text-gray-400 mt-1">
              @{currentInvitation.from_username}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {accepting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Acceptation...
              </span>
            ) : (
              'Accepter'
            )}
          </button>

          <button
            onClick={handleDecline}
            disabled={accepting || declining}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {declining ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Refus...
              </span>
            ) : (
              'Refuser'
            )}
          </button>
        </div>

        {/* Pending count */}
        {pendingInvitations.length > 1 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            {pendingInvitations.length - 1} autre(s) invitation(s) en attente
          </p>
        )}
      </div>
    </div>
  );
}
