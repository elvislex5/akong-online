
import { OnlineMessage } from '../types';

declare const Peer: any;

export class PeerManager {
  private peer: any;
  private conn: any;
  private onMessageCallback: ((msg: OnlineMessage) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  
  public myId: string = '';

  constructor() {}

  public init(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (this.peer) {
            this.peer.destroy();
        }

        try {
            // Create a new Peer. giving undefined lets the cloud server assign an ID.
            this.peer = new Peer(undefined, {
                debug: 2
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

            this.peer.on('error', (err: any) => {
                console.error("PeerJS Error:", err);
                reject(err);
            });

        } catch (e) {
            reject(e);
        }
    });
  }

  // In PeerJS, "Creating a room" is just waiting for someone to connect to myId.
  public createRoom() {
      // No-op for PeerJS, just waiting for connection logic setup in init()
  }

  // Join a room = Connect to the Host's Peer ID
  public joinRoom(hostId: string) {
      if (!this.peer) return;
      console.log("Connecting to host:", hostId);
      const conn = this.peer.connect(hostId);
      this.setupConnection(conn);
  }

  private setupConnection(conn: any) {
      this.conn = conn;

      this.conn.on('open', () => {
          console.log("Connection established!");
          // If we received a connection (Host), tell the logic someone joined
          // If we initiated (Guest), this confirms we are in.
          
          // We simulate the 'PLAYER_JOINED' event for the UI
          if (this.onMessageCallback) {
             // Send a specialized internal message to UI
             this.onMessageCallback({ type: 'PLAYER_JOINED' }); 
          }
      });

      this.conn.on('data', (data: OnlineMessage) => {
          if (this.onMessageCallback) {
              this.onMessageCallback(data);
          }
      });

      this.conn.on('close', () => {
          console.log("Connection closed");
          if (this.onDisconnectCallback) this.onDisconnectCallback();
      });

      this.conn.on('error', (err: any) => {
          console.error("Connection Error:", err);
      });
  }

  public sendMessage(roomId: string, msg: OnlineMessage) {
      // roomId parameter is unused in PeerJS direct connection, but kept for API compatibility
      if (this.conn && this.conn.open) {
          this.conn.send(msg);
      } else {
          console.warn("Cannot send message, connection not open");
      }
  }

  public onMessage(cb: (msg: OnlineMessage) => void) {
      this.onMessageCallback = cb;
  }

  public onDisconnect(cb: () => void) {
      this.onDisconnectCallback = cb;
  }

  public destroy() {
      if (this.conn) {
          this.conn.close();
      }
      if (this.peer) {
          this.peer.destroy();
      }
      this.peer = null;
      this.conn = null;
  }
}

export const onlineManager = new PeerManager();