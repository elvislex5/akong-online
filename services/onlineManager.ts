import { OnlineMessage } from '../types';
import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';
import type { GameState } from '../types';

export class SocketManager {
  private socket: Socket | null = null;
  private onMessageCallback: ((msg: OnlineMessage) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onReconnectCallback: ((gameState: GameState | null) => void) | null = null;

  public myId: string = '';
  private currentRoomId: string = '';
  private currentUserId: string | null = null;
  private heartbeatInterval: number | null = null;

  constructor() {}

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
