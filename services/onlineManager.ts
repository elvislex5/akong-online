import { OnlineMessage } from '../types';
import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';
import type { GameState } from '../types';

export class SocketManager {
  private socket: Socket | null = null;
  private onMessageCallback: ((msg: OnlineMessage) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onReconnectCallback: ((gameState: GameState | null) => void) | null = null;
  // Phase 3: Invitation callbacks
  private onInvitationReceivedCallback: ((data: { invitationId: string, fromUserId: string }) => void) | null = null;
  private onInvitationAcceptedCallback: ((data: { invitationId: string, byUserId: string }) => void) | null = null;
  private onInvitationDeclinedCallback: ((data: { invitationId: string, byUserId: string }) => void) | null = null;
  private onInvitationCancelledCallback: ((data: { invitationId: string }) => void) | null = null;

  public myId: string = '';
  private currentRoomId: string = '';
  private currentUserId: string | null = null;
  private heartbeatInterval: number | null = null;

  constructor() { }

  /**
   * Initialize socket connection with optional authentication
   * @param userId - Optional user ID for authentication
   * @returns Promise resolving to socket ID
   */
  public async init(userId?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get server URL from environment
        const serverUrl = (import.meta as any).env?.VITE_SOCKET_SERVER_URL || 'http://localhost:3002';

        // Get authentication token if user is logged in
        let authToken: string | undefined;
        if (userId) {
          this.currentUserId = userId;
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            authToken = session.access_token;
            console.log('[onlineManager] Authenticating with JWT token');
          }
        }

        // Connect with authentication
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10, // Increased for better reliability
          reconnectionDelayMax: 5000,
          auth: authToken ? { token: authToken } : undefined,
        });

        this.socket.on('connect', () => {
          console.log('[onlineManager] Connected to server:', this.socket?.id);
          this.myId = this.socket?.id || '';

          // Set up event listeners
          this.setupEventListeners();

          // Start heartbeat
          this.startHeartbeat();

          resolve(this.myId);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[onlineManager] Connection error:', error);
          reject(new Error('Impossible de se connecter au serveur. Assurez-vous que le serveur Socket.io est démarré.'));
        });

        // Handle reconnection
        this.socket.on('reconnect', (attemptNumber) => {
          console.log('[onlineManager] Reconnected after', attemptNumber, 'attempts');
          if (this.currentRoomId && this.currentUserId) {
            this.reconnectToRoom(this.currentRoomId, this.currentUserId);
          }
        });

        this.socket.on('authenticated', (data: { userId: string }) => {
          console.log('[onlineManager] Authenticated as user:', data.userId);
        });

      } catch (e) {
        reject(e);
      }
    });
  }



  private setupEventListeners() {
    if (!this.socket) return;

    // Game events from other players
    this.socket.on('game_event', (data: { type: string, payload: any }) => {
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: data.type as any, payload: data.payload });
      }
    });

    // Player joined event
    this.socket.on('player_joined', (data: { connectionId: string, userId?: string }) => {
      console.log('[onlineManager] Player joined:', data);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'PLAYER_JOINED', payload: data });
      }
    });

    // Room creation confirmation
    this.socket.on('room_created', (roomCode: string) => {
      console.log('[onlineManager] Room created:', roomCode);
      this.currentRoomId = roomCode;
    });

    // Errors from server
    this.socket.on('error', (message: string) => {
      console.error('[onlineManager] Server error:', message);
    });

    // Disconnect event
    this.socket.on('disconnect', (reason) => {
      console.log('[onlineManager] Disconnected:', reason);
      this.stopHeartbeat();
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    });

    // Player disconnected (someone else)
    this.socket.on('player_disconnected', (data: { userId: string }) => {
      console.log('[onlineManager] Player disconnected:', data.userId);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'PLAYER_DISCONNECTED', payload: data });
      }
    });

    // Player reconnected
    this.socket.on('player_reconnected', (data: { userId: string }) => {
      console.log('[onlineManager] Player reconnected:', data.userId);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'PLAYER_RECONNECTED', payload: data });
      }
    });

    // Game state restored (after reconnection)
    this.socket.on('game_state_restored', (data: { gameState: GameState }) => {
      console.log('[onlineManager] Game state restored');
      if (this.onReconnectCallback) {
        this.onReconnectCallback(data.gameState);
      }
    });

    // Spectator events
    this.socket.on('spectator_joined', (data: { userId: string }) => {
      console.log('[onlineManager] Spectator joined:', data.userId);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'SPECTATOR_JOINED', payload: data });
      }
    });

    this.socket.on('spectator_left', (data: { userId: string }) => {
      console.log('[onlineManager] Spectator left:', data.userId);
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'SPECTATOR_LEFT', payload: data });
      }
    });

    // Heartbeat acknowledgement
    this.socket.on('heartbeat_ack', () => {
      // Silent, just to keep connection alive
    });

    // Phase 3: Invitation events
    this.socket.on('invitation_received', (data: { invitationId: string, fromUserId: string }) => {
      console.log('[onlineManager] Invitation received:', data);
      if (this.onInvitationReceivedCallback) {
        this.onInvitationReceivedCallback(data);
      }
    });

    this.socket.on('invitation_accepted', (data: { invitationId: string, byUserId: string }) => {
      console.log('[onlineManager] Invitation accepted:', data);
      if (this.onInvitationAcceptedCallback) {
        this.onInvitationAcceptedCallback(data);
      }
    });

    this.socket.on('invitation_declined', (data: { invitationId: string, byUserId: string }) => {
      console.log('[onlineManager] Invitation declined:', data);
      if (this.onInvitationDeclinedCallback) {
        this.onInvitationDeclinedCallback(data);
      }
    });

    this.socket.on('invitation_cancelled', (data: { invitationId: string }) => {
      console.log('[onlineManager] Invitation cancelled:', data);
      if (this.onInvitationCancelledCallback) {
        this.onInvitationCancelledCallback(data);
      }
    });

    this.socket.on('invitation_sent', (data: { invitationId: string }) => {
      console.log('[onlineManager] Invitation sent confirmation:', data);
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Create a new game room
   * @param userId - User ID of the host
   * @returns Room code
   */
  public createRoom(userId: string): string {
    if (!this.socket) {
      console.error('[onlineManager] Socket not initialized');
      return '';
    }

    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomId = roomCode;
    this.currentUserId = userId;

    this.socket.emit('create_room', { roomCode, userId });
    console.log('[onlineManager] Creating room:', roomCode);

    return roomCode;
  }

  /**
   * Join an existing room
   * @param roomCode - Room code to join
   * @param userId - User ID of the guest
   */
  public joinRoom(roomCode: string, userId: string) {
    if (!this.socket) {
      console.error('[onlineManager] Socket not initialized');
      return;
    }

    this.currentRoomId = roomCode;
    this.currentUserId = userId;
    this.socket.emit('join_room', { roomCode, userId });
    console.log('[onlineManager] Joining room:', roomCode);
  }

  /**
   * Reconnect to a room after disconnection
   * @param roomCode - Room code
   * @param userId - User ID
   */
  private reconnectToRoom(roomCode: string, userId: string) {
    if (!this.socket) return;

    console.log('[onlineManager] Reconnecting to room:', roomCode);
    this.socket.emit('reconnect_to_room', { roomCode, userId });
  }

  /**
   * Spectate a game room
   * @param roomCode - Room code to spectate
   * @param userId - User ID of spectator
   */
  public spectateRoom(roomCode: string, userId: string) {
    if (!this.socket) {
      console.error('[onlineManager] Socket not initialized');
      return;
    }

    this.currentRoomId = roomCode;
    this.currentUserId = userId;
    this.socket.emit('spectate_room', { roomCode, userId });
    console.log('[onlineManager] Spectating room:', roomCode);
  }

  /**
   * Leave spectating mode
   * @param roomCode - Room code
   * @param userId - User ID
   */
  public leaveSpectating(roomCode: string, userId: string) {
    if (!this.socket) return;

    this.socket.emit('leave_spectating', { roomCode, userId });
    console.log('[onlineManager] Leaving spectator mode');
  }

  /**
   * Send a message to all players in the room
   * @param roomCode - Room code (optional, uses current room if not provided)
   * @param msg - Message to send
   */
  public sendMessage(roomCode: string, msg: OnlineMessage) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[onlineManager] Cannot send message, socket not connected');
      return;
    }

    this.socket.emit('game_event', {
      roomCode: roomCode || this.currentRoomId,
      type: msg.type,
      payload: msg.payload
    });
  }

  /**
   * Broadcast a message to all players in the current room
   * @param msg - Message to broadcast
   */
  public broadcast(msg: OnlineMessage) {
    this.sendMessage(this.currentRoomId, msg);
  }

  /**
   * Send a message to a specific player (by socket ID)
   * @param socketId - Target socket ID
   * @param msg - Message to send
   */
  public sendTo(socketId: string, msg: OnlineMessage) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[onlineManager] Cannot send message, socket not connected');
      return;
    }

    this.socket.emit('direct_message', {
      targetSocketId: socketId,
      type: msg.type,
      payload: msg.payload
    });
  }

  /**
   * Register callback for incoming messages
   * @param cb - Callback function
   */
  public onMessage(cb: (msg: OnlineMessage) => void) {
    this.onMessageCallback = cb;
  }

  /**
   * Register callback for disconnect
   * @param cb - Callback function
   */
  public onDisconnect(cb: () => void) {
    this.onDisconnectCallback = cb;
  }

  /**
   * Register callback for reconnection with state restoration
   * @param cb - Callback function receiving restored game state
   */
  public onReconnect(cb: (gameState: GameState | null) => void) {
    this.onReconnectCallback = cb;
  }

  // ============================================
  // PHASE 3: INVITATION METHODS
  // ============================================

  /**
   * Send an invitation to another user
   * @param invitationId - Invitation ID from database
   * @param toUserId - Target user ID
   * @param fromUserId - Sender user ID
   */
  public sendInvitation(invitationId: string, toUserId: string, fromUserId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[onlineManager] Cannot send invitation, socket not connected');
      return;
    }

    this.socket.emit('send_invitation', { invitationId, toUserId, fromUserId });
    console.log('[onlineManager] Sending invitation:', invitationId);
  }

  /**
   * Accept an invitation
   * @param invitationId - Invitation ID
   * @param fromUserId - Sender user ID
   * @param toUserId - Receiver user ID
   */
  public acceptInvitation(invitationId: string, fromUserId: string, toUserId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[onlineManager] Cannot accept invitation, socket not connected');
      return;
    }

    this.socket.emit('accept_invitation', { invitationId, fromUserId, toUserId });
    console.log('[onlineManager] Accepting invitation:', invitationId);
  }

  /**
   * Decline an invitation
   * @param invitationId - Invitation ID
   * @param fromUserId - Sender user ID
   * @param toUserId - Receiver user ID
   */
  public declineInvitation(invitationId: string, fromUserId: string, toUserId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[onlineManager] Cannot decline invitation, socket not connected');
      return;
    }

    this.socket.emit('decline_invitation', { invitationId, fromUserId, toUserId });
    console.log('[onlineManager] Declining invitation:', invitationId);
  }

  /**
   * Cancel an invitation (sender cancels)
   * @param invitationId - Invitation ID
   * @param toUserId - Target user ID
   */
  public cancelInvitation(invitationId: string, toUserId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[onlineManager] Cannot cancel invitation, socket not connected');
      return;
    }

    this.socket.emit('cancel_invitation', { invitationId, toUserId });
    console.log('[onlineManager] Cancelling invitation:', invitationId);
  }

  /**
   * Register callback for invitation received
   * @param cb - Callback function
   */
  public onInvitationReceived(cb: (data: { invitationId: string, fromUserId: string }) => void) {
    this.onInvitationReceivedCallback = cb;
  }

  /**
   * Register callback for invitation accepted
   * @param cb - Callback function
   */
  public onInvitationAccepted(cb: (data: { invitationId: string, byUserId: string }) => void) {
    this.onInvitationAcceptedCallback = cb;
  }

  /**
   * Register callback for invitation declined
   * @param cb - Callback function
   */
  public onInvitationDeclined(cb: (data: { invitationId: string, byUserId: string }) => void) {
    this.onInvitationDeclinedCallback = cb;
  }

  /**
   * Register callback for invitation cancelled
   * @param cb - Callback function
   */
  public onInvitationCancelled(cb: (data: { invitationId: string }) => void) {
    this.onInvitationCancelledCallback = cb;
  }

  /**
   * Clean up and disconnect
   */
  public destroy() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoomId = '';
    this.currentUserId = null;
    this.myId = '';
  }

  /**
   * Check if connected
   * @returns True if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current room code
   * @returns Current room code or empty string
   */
  public getCurrentRoom(): string {
    return this.currentRoomId;
  }

  /**
   * Get current user ID
   * @returns Current user ID or null
   */
  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

// Export singleton instance
export const onlineManager = new SocketManager();
