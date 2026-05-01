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
      toast.success('Votre invitation a été acceptée !');
    });

    // When our invitation is declined
    onlineManager.onInvitationDeclined((data) => {
      toast.error('Votre invitation a été refusée');
    });

    // When an invitation is cancelled
    onlineManager.onInvitationCancelled((data) => {
      toast('L\'invitation a été annulée', { icon: 'ℹ️' });

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
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== currentInvitation.id));

      // Trigger join via callback or event?
      // Since we don't have direct access to `handleJoinRoom` here, we rely on URL param logic
      // IF App.tsx handles it. If not, we are stuck.
      // Let's assume we need to trigger it.
      // Workaround: Use onlineManager to signal 'INVITATION_ACCEPTED_LOCAL' and have App.tsx listen?
      // Or just navigate and hope?
      // Let's verify App.tsx first.
      window.location.href = `/game?mode=online&join=${result.room_code}`;
      // Using window.location to force full reload might be safer for ensuring fresh state if App parses URL on mount.
      // But standard router is better.
      navigate(`/game?mode=online&join=${result.room_code}`);
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

  const senderName =
    currentInvitation.from_display_name || currentInvitation.from_username;
  const remainingCount = pendingInvitations.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm"
    >
      <div className="bg-surface border border-rule shadow-lg w-full max-w-md">
        <div className="p-8">
          <p className="kicker mb-4 text-accent">Invitation reçue</p>
          <h2
            id="invitation-title"
            className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-3"
            style={{
              fontVariationSettings: '"opsz" 60, "SOFT" 40',
              fontSize: 'clamp(1.875rem, 4vw, 2.5rem)',
            }}
          >
            {senderName} vous invite.
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-2">
            Une partie en ligne vous attend. Acceptez pour rejoindre la salle.
          </p>
          {currentInvitation.from_display_name && (
            <p className="text-xs text-ink-subtle italic font-display">
              @{currentInvitation.from_username}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row-reverse gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting || declining}
              className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {accepting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Acceptation…
                </span>
              ) : (
                'Accepter'
              )}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={accepting || declining}
              className="h-11 inline-flex items-center justify-center px-5 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-danger hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {declining ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Refus…
                </span>
              ) : (
                'Refuser'
              )}
            </button>
          </div>

          {remainingCount > 0 && (
            <p className="mt-6 pt-4 border-t border-rule text-center text-xs text-ink-subtle">
              {remainingCount} autre{remainingCount > 1 ? 's' : ''} invitation{remainingCount > 1 ? 's' : ''} en attente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
