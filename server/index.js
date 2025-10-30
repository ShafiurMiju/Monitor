// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows connections from other local projects
  }
});

const connectedClients = new Map(); // Stores MAC address and socket ID

// This block runs every time a new user connects
io.on('connection', (socket) => {
  console.log('A user connected with ID:', socket.id);

  // When a client agent checks in, we save its MAC address
  socket.on('register', (data) => {
    console.log(`Agent registered with MAC address: ${data.macAddress}`);
    connectedClients.set(data.macAddress, socket.id);
  });

  // When an admin wants to see a screen
  socket.on('request_stream', (data) => {
    console.log(`Admin requested stream for MAC: ${data.targetMacAddress}`);
    const targetSocketId = connectedClients.get(data.targetMacAddress);
    if (targetSocketId) {
      // Send a 'start_stream' command ONLY to that specific user's PC
      io.to(targetSocketId).emit('start_stream', { adminId: socket.id });
    } else {
      console.log(`Could not find a client with MAC: ${data.targetMacAddress}`);
    }
  });

  // When the client agent sends an image, we forward it to the admin
  socket.on('stream_data', (data) => {
    io.to(data.adminId).emit('new_frame', { image: data.image });
  });

  // Handle disconnections (optional for now, but good practice)
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up the connectedClients map
    for (let [mac, id] of connectedClients.entries()) {
      if (id === socket.id) {
        connectedClients.delete(mac);
        break;
      }
    }
  });
});

server.listen(4000, () => {
  console.log('Server is online, listening on port 4000');
});