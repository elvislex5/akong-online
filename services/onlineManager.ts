import { OnlineMessage } from '../types';
import { io, Socket } from 'socket.io-client';

export class SocketManager {
  private socket: Socket | null = null;
  private onMessageCallback: ((msg: OnlineMessage) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  public myId: string = '';
  private currentRoomId: string = '';

  constructor() {}

  public init(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to Socket.io server
        // Uses environment variable in production, localhost in development
        const serverUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3002';

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('Connected to Socket.io server:', this.socket?.id);
          this.myId = this.socket?.id || '';

          // Set up event listeners
          this.setupEventListeners();

          resolve(this.myId);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(new Error('Impossible de se connecter au serveur. Assurez-vous que le serveur Socket.io est démarré.'));
        });

      } catch (e) {
        reject(e);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Listen for game events from other players
    this.socket.on('game_event', (data: { type: string, payload: any }) => {
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: data.type as any, payload: data.payload });
      }
    });

    // Listen for player joined event
    this.socket.on('player_joined', () => {
      console.log('A player joined the room');
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'PLAYER_JOINED' });
      }
    });

    // Listen for room creation confirmation
    this.socket.on('room_created', (roomId: string) => {
      console.log('Room created:', roomId);
      this.currentRoomId = roomId;
    });

    // Listen for errors
    this.socket.on('error', (message: string) => {
      console.error('Server error:', message);
    });

    // Listen for disconnect
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    });
  }

  // Create a room and return the room ID
  public createRoom(): string {
    if (!this.socket) {
      console.error('Socket not initialized');
      return '';
    }

    // Generate a simple 6-character room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomId = roomId;

    this.socket.emit('create_room', roomId);
    console.log('Creating room:', roomId);

    return roomId;
  }

  // Join an existing room
  public joinRoom(roomId: string) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.currentRoomId = roomId;
    this.socket.emit('join_room', roomId);
    console.log('Joining room:', roomId);
  }

  // Send a message to all players in the room
  public sendMessage(roomId: string, msg: OnlineMessage) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot send message, socket not connected');
      return;
    }

    this.socket.emit('game_event', {
      roomId: roomId || this.currentRoomId,
      type: msg.type,
      payload: msg.payload
    });
  }

  // Register callback for incoming messages
  public onMessage(cb: (msg: OnlineMessage) => void) {
    this.onMessageCallback = cb;
  }

  // Register callback for disconnect
  public onDisconnect(cb: () => void) {
    this.onDisconnectCallback = cb;
  }

  // Clean up and disconnect
  public destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoomId = '';
    this.myId = '';
  }

  // Check if connected
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const onlineManager = new SocketManager();
