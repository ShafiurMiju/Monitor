// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/database');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows connections from other local projects
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const connectedClients = new Map(); // Stores MAC address and socket ID

// ============ REST API Routes ============

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password, macAddress, computerName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }, { macAddress }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email, username, or MAC address already exists' 
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      macAddress,
      computerName: computerName || 'Unknown'
    });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, macAddress: user.macAddress }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        macAddress: user.macAddress,
        computerName: user.computerName
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, macAddress } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify MAC address matches
    if (user.macAddress !== macAddress) {
      return res.status(403).json({ 
        success: false, 
        message: 'This account is registered with a different device' 
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, macAddress: user.macAddress }, JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        macAddress: user.macAddress,
        computerName: user.computerName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Get all users (for admin dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ Socket.IO Logic ============

// This block runs every time a new user connects
io.on('connection', (socket) => {
  console.log('A user connected with ID:', socket.id);

  // When a client agent checks in, we save its MAC address and update user status
  socket.on('register', async (data) => {
    try {
      console.log(`Agent registered with MAC address: ${data.macAddress}`);
      connectedClients.set(data.macAddress, socket.id);
      
      // Update user online status in database
      await User.findOneAndUpdate(
        { macAddress: data.macAddress },
        { isOnline: true, lastSeen: new Date() }
      );
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  // When user clicks "Start" button - mark as streaming
  socket.on('start_monitoring', async (data) => {
    try {
      console.log(`User started monitoring: ${data.macAddress}`);
      
      // Update streaming status in database
      await User.findOneAndUpdate(
        { macAddress: data.macAddress },
        { isStreaming: true }
      );
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
      console.error('Error updating streaming status:', error);
    }
  });

  // When user stops monitoring
  socket.on('stop_monitoring', async (data) => {
    try {
      console.log(`User stopped monitoring: ${data.macAddress}`);
      
      // Update streaming status in database
      await User.findOneAndUpdate(
        { macAddress: data.macAddress },
        { isStreaming: false }
      );
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
      console.error('Error updating streaming status:', error);
    }
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
      socket.emit('stream_error', { message: 'User is not online or not streaming' });
    }
  });

  // When the client agent sends an image, we forward it to the admin
  socket.on('stream_data', (data) => {
    io.to(data.adminId).emit('new_frame', { image: data.image });
  });

  // Handle disconnections
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up the connectedClients map and update database
    for (let [mac, id] of connectedClients.entries()) {
      if (id === socket.id) {
        connectedClients.delete(mac);
        
        try {
          // Update user offline status in database
          await User.findOneAndUpdate(
            { macAddress: mac },
            { isOnline: false, isStreaming: false, lastSeen: new Date() }
          );
          
          // Notify all admins that user list has changed
          io.emit('user_status_changed');
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
        
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server is online, listening on port ${PORT}`);
});