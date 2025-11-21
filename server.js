import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('create_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} created room ${roomId}`);
  });

  socket.on('join_room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size > 0) {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        // Notify everyone in the room (including the host) that someone joined
        io.to(roomId).emit('player_joined', { connectionId: socket.id });
    } else {
        socket.emit('error', 'Room not found');
    }
  });

  socket.on('game_event', (data) => {
    const { roomId, type, payload } = data;
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit('game_event', { type, payload });
  });

  // Handle direct messages (for sendTo functionality)
  socket.on('direct_message', (data) => {
    const { targetSocketId, type, payload } = data;
    // Send directly to the target socket
    io.to(targetSocketId).emit('game_event', { type, payload });
    console.log(`Direct message sent from ${socket.id} to ${targetSocketId}: ${type}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Socket.io Server running on port ${PORT}`);
});
