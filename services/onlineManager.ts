
import { OnlineMessage } from '../types';

declare const Peer: any;

export class PeerManager {
  private peer: any;
  // We now store multiple connections (Player 2 + Spectators)
  private connections: any[] = [];
  
  private onMessageCallback: ((msg: OnlineMessage, senderId?: string) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  
  public myId: string = '';

  constructor() {}

  public init(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (this.peer) {
            this.destroy();
        }

        try {
            // Create a new Peer. giving undefined lets the cloud server assign an ID.
            this.peer = new Peer(undefined, {
                debug: 1,
                config: {
                    'iceServers': [
                        { url: 'stun:stun.l.google.com:19302' },
                        { url: 'stun:stun1.l.google.com:19302' },
                    ]
                }
            });

            this.peer.on('open', (id: string) => {
                console.log('My Peer ID is: ' + id);
                this.myId = id;
                resolve(id);
            });

            this.peer.on('connection', (conn: any) => {
                console.log("Incoming connection form:", conn.peer);
                this.setupConnection(conn);
            });

            // ROBUSTNESS: Handle signaling server disconnection
            this.peer.on('disconnected', () => {
                console.warn('Peer disconnected from server. Attempting reconnect...');
                // Workaround: Reconnect needs a small delay and check if not destroyed
                setTimeout(() => {
                     if (this.peer && !this.peer.destroyed) {
                        this.peer.reconnect();
                     }
                }, 1000);
            });

            this.peer.on('error', (err: any) => {
                console.error("PeerJS Error:", err);
                // Only reject promise if we failed during initialization
                if (!this.myId) {
                     reject(err);
                }
                // Ignore 'lost connection' errors if they happen after init, 
                // as the 'disconnected' handler above will try to fix it.
            });

        } catch (e) {
            reject(e);
        }
    });
  }

  // Join a room = Connect to the Host's Peer ID
  public joinRoom(hostId: string) {
      if (!this.peer) return;
      console.log("Connecting to host:", hostId);
      const conn = this.peer.connect(hostId);
      this.setupConnection(conn);
  }

  private setupConnection(conn: any) {
      // Add to connections list
      this.connections.push(conn);

      conn.on('open', () => {
          console.log("Connection established with " + conn.peer);
          
          // Notify UI that someone joined, passing their ID explicitly
          if (this.onMessageCallback) {
             this.onMessageCallback({ type: 'PLAYER_JOINED', payload: { connectionId: conn.peer } }, conn.peer); 
          }
      });

      conn.on('data', (data: OnlineMessage) => {
          if (this.onMessageCallback) {
              this.onMessageCallback(data, conn.peer);
          }
      });

      conn.on('close', () => {
          console.log("Connection closed with " + conn.peer);
          // Remove from list
          this.connections = this.connections.filter(c => c !== conn);
          
          if (this.connections.length === 0 && this.onDisconnectCallback) {
              this.onDisconnectCallback();
          }
      });

      conn.on('error', (err: any) => {
          console.error("Connection Error:", err);
      });
  }

  // Broadcast to ALL connected peers (Player 2 + Spectators)
  public broadcast(msg: OnlineMessage) {
      this.connections.forEach(conn => {
          if (conn.open) {
              conn.send(msg);
          }
      });
  }

  // Send to a specific peer (used for assigning roles)
  public sendTo(connectionId: string, msg: OnlineMessage) {
      const conn = this.connections.find(c => c.peer === connectionId);
      if (conn && conn.open) {
          conn.send(msg);
      }
  }

  // Legacy support for 1-to-1 calls in App.tsx (maps to broadcast)
  public sendMessage(dummyRoomId: string, msg: OnlineMessage) {
      this.broadcast(msg);
  }

  public onMessage(cb: (msg: OnlineMessage, senderId?: string) => void) {
      this.onMessageCallback = cb;
  }

  public onDisconnect(cb: () => void) {
      this.onDisconnectCallback = cb;
  }

  public destroy() {
      this.connections.forEach(c => c.close());
      this.connections = [];
      
      if (this.peer) {
          this.peer.destroy();
      }
      this.peer = null;
      this.myId = '';
  }
}

export const onlineManager = new PeerManager();
