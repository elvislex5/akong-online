import 'dotenv/config'; // Load .env file
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Supabase setup (for database access from server)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  console.log('Server will run without database persistence.');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // TODO: Restrict in production
    methods: ["GET", "POST"]
  }
});

// Store socket-to-user mapping for reconnection
const socketUserMap = new Map(); // socketId -> { userId, roomId }
const userSocketMap = new Map(); // userId -> socketId

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Verify Supabase JWT token
 * @param {string} token - JWT token from client
 * @returns {Promise<object|null>} User object or null
 */
async function verifyToken(token) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      console.error('[Auth] Invalid token:', error?.message);
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('[Auth] Token verification error:', err);
    return null;
  }
}

/**
 * Set user online in database
 * @param {string} userId - User ID
 */
async function setUserOnline(userId) {
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('set_user_online', {
      p_user_id: userId
    });

    if (error) {
      console.error('[Presence] Error setting user online:', error);
    } else {
      console.log('[Presence] User set to online:', userId);
    }
  } catch (err) {
    console.error('[Presence] Error:', err);
  }
}

/**
 * Set user offline in database
 * @param {string} userId - User ID
 */
async function setUserOffline(userId) {
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('set_user_offline', {
      p_user_id: userId
    });

    if (error) {
      console.error('[Presence] Error setting user offline:', error);
    } else {
      console.log('[Presence] User set to offline:', userId);
    }
  } catch (err) {
    console.error('[Presence] Error:', err);
  }
}

/**
 * Set user in game
 * @param {string} userId - User ID
 * @param {string} roomId - Room ID
 */
async function setUserInGame(userId, roomId) {
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('set_user_in_game', {
      p_user_id: userId,
      p_room_id: roomId
    });

    if (error) {
      console.error('[Presence] Error setting user in game:', error);
    } else {
      console.log('[Presence] User set to in_game:', userId);
    }
  } catch (err) {
    console.error('[Presence] Error:', err);
  }
}

/**
 * Update game state in database
 * @param {string} roomId - Room UUID
 * @param {object} gameState - Game state object
 */
async function saveGameState(roomId, gameState) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('game_rooms')
      .update({ game_state: gameState })
      .eq('id', roomId);

    if (error) {
      console.error('[DB] Error saving game state:', error);
    }
  } catch (err) {
    console.error('[DB] Save error:', err);
  }
}

/**
 * Get room from database
 * @param {string} roomCode - Room code
 * @returns {Promise<object|null>} Room object or null
 */
async function getRoomByCode(roomCode) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('game_rooms')
      .select()
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (error) {
      console.error('[DB] Error fetching room:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[DB] Fetch error:', err);
    return null;
  }
}

// ============================================
// SOCKET.IO CONNECTION HANDLER
// ============================================

io.on('connection', (socket) => {
  console.log('[Socket] User connected:', socket.id);

  // Store authentication token if provided
  const token = socket.handshake.auth?.token;
  let authenticatedUser = null;

  // Authenticate user on connection (if token provided)
  if (token) {
    verifyToken(token).then(user => {
      if (user) {
        authenticatedUser = user;
        socketUserMap.set(socket.id, { userId: user.id, roomId: null });
        userSocketMap.set(user.id, socket.id);
        console.log('[Auth] User authenticated:', user.id);

        // Set user online in database (Phase 3)
        setUserOnline(user.id);

        socket.emit('authenticated', { userId: user.id });
      } else {
        console.log('[Auth] Authentication failed for socket:', socket.id);
      }
    });
  }

  // ============================================
  // CREATE ROOM
  // ============================================
  socket.on('create_room', async (data) => {
    const { roomCode, userId, roomId } = data;
    console.log('[Room] Create room request:', roomCode, 'by user:', userId);

    // Join socket.io room
    socket.join(roomCode);

    // Store mapping
    if (socketUserMap.has(socket.id)) {
      const userData = socketUserMap.get(socket.id);
      userData.roomId = roomCode;
    } else {
      socketUserMap.set(socket.id, { userId, roomId: roomCode });
    }

    // Set user in_game status (Phase 3)
    if (roomId) {
      await setUserInGame(userId, roomId);
    }

    socket.emit('room_created', roomCode);
    console.log('[Room] Created:', roomCode);
  });

  // ============================================
  // JOIN ROOM
  // ============================================
  socket.on('join_room', async (data) => {
    const { roomCode, userId } = data;
    console.log('[Room] Join room request:', roomCode, 'by user:', userId);

    // Check if room exists in socket.io
    const room = io.sockets.adapter.rooms.get(roomCode);
    if (!room || room.size === 0) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Join socket.io room
    socket.join(roomCode);

    // Store mapping
    if (socketUserMap.has(socket.id)) {
      const userData = socketUserMap.get(socket.id);
      userData.roomId = roomCode;
    } else {
      socketUserMap.set(socket.id, { userId, roomId: roomCode });
    }

    // Set user in_game status (Phase 3)
    const dbRoom = await getRoomByCode(roomCode);
    if (dbRoom) {
      await setUserInGame(userId, dbRoom.id);
    }

    // Notify everyone in the room
    io.to(roomCode).emit('player_joined', { connectionId: socket.id, userId });
    console.log('[Room] User joined:', userId, 'in room:', roomCode);
  });

  // ============================================
  // SPECTATE ROOM
  // ============================================
  socket.on('spectate_room', async (data) => {
    const { roomCode, userId } = data;
    console.log('[Spectator] Join request:', roomCode, 'by user:', userId);

    // Check if room exists
    const room = io.sockets.adapter.rooms.get(roomCode);
    if (!room || room.size === 0) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Join as spectator
    socket.join(roomCode);
    socket.join(`${roomCode}:spectators`); // Separate spectator channel

    // Add to database if available
    if (supabase) {
      const dbRoom = await getRoomByCode(roomCode);
      if (dbRoom) {
        await supabase
          .from('game_spectators')
          .insert({ room_id: dbRoom.id, user_id: userId });
      }
    }

    // Notify room
    io.to(roomCode).emit('spectator_joined', { userId });
    console.log('[Spectator] User joined:', userId);
  });

  // ============================================
  // LEAVE SPECTATING
  // ============================================
  socket.on('leave_spectating', async (data) => {
    const { roomCode, userId } = data;
    console.log('[Spectator] Leave request:', roomCode, 'by user:', userId);

    socket.leave(roomCode);
    socket.leave(`${roomCode}:spectators`);

    // Remove from database if available
    if (supabase) {
      const dbRoom = await getRoomByCode(roomCode);
      if (dbRoom) {
        await supabase
          .from('game_spectators')
          .delete()
          .eq('room_id', dbRoom.id)
          .eq('user_id', userId);
      }
    }

    io.to(roomCode).emit('spectator_left', { userId });
  });

  // ============================================
  // GAME EVENT (Broadcast to room)
  // ============================================
  socket.on('game_event', async (data) => {
    const { roomCode, type, payload } = data;
    console.log('[Game] Event:', type, 'in room:', roomCode);

    // Save game state if it's a move or state update
    if (supabase && payload?.gameState && (type === 'REMOTE_MOVE' || type === 'SYNC_STATE')) {
      const dbRoom = await getRoomByCode(roomCode);
      if (dbRoom) {
        await saveGameState(dbRoom.id, payload.gameState);
      }
    }

    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomCode).emit('game_event', { type, payload });
  });

  // ============================================
  // DIRECT MESSAGE (Send to specific socket)
  // ============================================
  socket.on('direct_message', (data) => {
    const { targetSocketId, type, payload } = data;
    io.to(targetSocketId).emit('game_event', { type, payload });
    console.log('[Message] Direct:', type, 'to:', targetSocketId);
  });

  // ============================================
  // RECONNECT TO ROOM
  // ============================================
  socket.on('reconnect_to_room', async (data) => {
    const { roomCode, userId } = data;
    console.log('[Reconnect] User:', userId, 'to room:', roomCode);

    // Rejoin socket.io room
    socket.join(roomCode);

    // Update mapping
    if (socketUserMap.has(socket.id)) {
      socketUserMap.get(socket.id).roomId = roomCode;
    } else {
      socketUserMap.set(socket.id, { userId, roomId: roomCode });
    }
    userSocketMap.set(userId, socket.id);

    // Get latest game state from database
    if (supabase) {
      const dbRoom = await getRoomByCode(roomCode);
      if (dbRoom && dbRoom.game_state) {
        socket.emit('game_state_restored', { gameState: dbRoom.game_state });
        console.log('[Reconnect] State restored for user:', userId);
      }
    }

    // Notify room of reconnection
    socket.to(roomCode).emit('player_reconnected', { userId });
  });

  // ============================================
  // HEARTBEAT (Keep-alive)
  // ============================================
  socket.on('heartbeat', async () => {
    socket.emit('heartbeat_ack');

    // Update last_seen in database (Phase 3)
    const userData = socketUserMap.get(socket.id);
    if (userData && userData.userId && supabase) {
      await supabase
        .from('user_presence')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', userData.userId);
    }
  });

  // ============================================
  // PHASE 3: INVITATION EVENTS
  // ============================================

  // Send invitation to another user
  socket.on('send_invitation', async (data) => {
    const { invitationId, toUserId, fromUserId } = data;
    console.log('[Invitation] Send:', fromUserId, '→', toUserId);

    // Get target user's socket
    const targetSocketId = userSocketMap.get(toUserId);

    if (targetSocketId) {
      // Send invitation notification to target user
      io.to(targetSocketId).emit('invitation_received', {
        invitationId,
        fromUserId
      });
      console.log('[Invitation] Sent to socket:', targetSocketId);
    } else {
      console.log('[Invitation] Target user not connected, will see on login');
    }

    // Acknowledge to sender
    socket.emit('invitation_sent', { invitationId });
  });

  // Accept invitation
  socket.on('accept_invitation', async (data) => {
    const { invitationId, fromUserId, toUserId } = data;
    console.log('[Invitation] Accepted:', invitationId);

    // Notify sender that invitation was accepted
    const senderSocketId = userSocketMap.get(fromUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('invitation_accepted', {
        invitationId,
        byUserId: toUserId
      });
    }
  });

  // Decline invitation
  socket.on('decline_invitation', async (data) => {
    const { invitationId, fromUserId, toUserId } = data;
    console.log('[Invitation] Declined:', invitationId);

    // Notify sender that invitation was declined
    const senderSocketId = userSocketMap.get(fromUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('invitation_declined', {
        invitationId,
        byUserId: toUserId
      });
    }
  });

  // Cancel invitation
  socket.on('cancel_invitation', async (data) => {
    const { invitationId, toUserId } = data;
    console.log('[Invitation] Cancelled:', invitationId);

    // Notify receiver that invitation was cancelled
    const receiverSocketId = userSocketMap.get(toUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('invitation_cancelled', {
        invitationId
      });
    }
  });

  // ============================================
  // DISCONNECT
  // ============================================
  socket.on('disconnect', async () => {
    console.log('[Socket] User disconnected:', socket.id);

    const userData = socketUserMap.get(socket.id);
    if (userData) {
      const { userId, roomId } = userData;

      // Set user offline in database (Phase 3)
      await setUserOffline(userId);

      // Notify room of disconnection
      if (roomId) {
        io.to(roomId).emit('player_disconnected', { userId });
      }

      // Cleanup
      socketUserMap.delete(socket.id);
      if (userSocketMap.get(userId) === socket.id) {
        userSocketMap.delete(userId);
      }
    }
  });
});

// ============================================
// HTTP API ENDPOINTS (Optional health check)
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: supabase ? 'connected' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// PERIODIC CLEANUP (Phase 3)
// ============================================

/**
 * Cleanup expired invitations and stale presence
 * Runs every 60 seconds
 */
if (supabase) {
  setInterval(async () => {
    try {
      // Cleanup expired invitations
      const { data: expiredCount } = await supabase.rpc('cleanup_expired_invitations');
      if (expiredCount > 0) {
        console.log(`[Cleanup] Expired ${expiredCount} invitations`);
      }

      // Cleanup stale presence (users offline > 5 minutes)
      const { data: staleCount } = await supabase.rpc('cleanup_stale_presence');
      if (staleCount > 0) {
        console.log(`[Cleanup] Set ${staleCount} users to offline (stale presence)`);
      }
    } catch (err) {
      console.error('[Cleanup] Error:', err);
    }
  }, 60000); // Run every 60 seconds
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Akông Socket.io Server               ║
║   Port: ${PORT}                         ║
║   Database: ${supabase ? 'Connected ✓' : 'Not configured ⚠'}     ║
╚════════════════════════════════════════╝
  `);
});
