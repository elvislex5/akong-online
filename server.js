const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
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
        // Notify the host that someone joined
        io.to(roomId).emit('player_joined');
    } else {
        socket.emit('error', 'Room not found');
    }
  });

  socket.on('game_event', (data) => {
    const { roomId, type, payload } = data;
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit('game_event', { type, payload });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io Server running on port ${PORT}`);
});