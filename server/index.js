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

// Configure CORS based on environment
const corsOrigin = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : "*";

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'ODL-MONITOR';
const connectedClients = new Map(); 
const adminViewingTargets = new Map();

// Root Route - Server Status
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'ODL Monitor Server is running successfully! 🚀',
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: {
      signup: '/api/signup',
      login: '/api/login',
      users: '/api/users',
      userById: '/api/users/:id'
    },
    socketIO: 'enabled',
    version: '1.0.0'
  });
});

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password, deviceId, computerName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }, { deviceId }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email, username, or device already exists' 
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      deviceId,
      computerName: computerName || 'Unknown'
    });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, deviceId: user.deviceId }, JWT_SECRET, {
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
        deviceId: user.deviceId,
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
    const { email, password, deviceId } = req.body;

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

    // Verify device ID matches
    if (user.deviceId !== deviceId) {
      return res.status(403).json({ 
        success: false, 
        message: 'This account is registered with a different device' 
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, deviceId: user.deviceId }, JWT_SECRET, {
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
        deviceId: user.deviceId,
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

  // When a client agent checks in, we save its device ID and update user status
  socket.on('register', async (data) => {
    try {
      console.log(`Agent registered with device ID: ${data.deviceId}`);
      connectedClients.set(data.deviceId, socket.id);
      
      // Update user online status in database
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
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
      console.log(`User started monitoring: ${data.deviceId}`);
      
      // Update streaming status in database
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
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
      console.log(`User stopped monitoring: ${data.deviceId}`);
      
      // Update streaming status in database
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
        { isStreaming: false }
      );
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
      console.error('Error updating streaming status:', error);
    }
  });

  // When an admin wants to see a screen
  socket.on('request_stream', async (data) => {
    console.log(`Admin (${socket.id}) requested stream for device: ${data.targetDeviceId}`);
    console.log(`Connected clients:`, Array.from(connectedClients.keys()));
    const previousTargetDeviceId = adminViewingTargets.get(socket.id);

    // Verify the target user is actually online and streaming
    try {
      const targetUser = await User.findOne({ deviceId: data.targetDeviceId });
      if (!targetUser) {
        console.log(`User with device ID ${data.targetDeviceId} not found in database`);
        socket.emit('stream_error', { message: 'User not found' });
        return;
      }

      if (!targetUser.isOnline) {
        console.log(`User ${targetUser.username} is offline`);
        socket.emit('stream_error', { message: 'User is offline' });
        return;
      }

      if (!targetUser.isStreaming) {
        console.log(`User ${targetUser.username} is not streaming`);
        socket.emit('stream_error', { message: 'User has not enabled monitoring' });
        return;
      }
    } catch (error) {
      console.error('Error verifying user status:', error);
      socket.emit('stream_error', { message: 'Failed to verify user status' });
      return;
    }

    // Stop previous stream if switching to a different user
    if (previousTargetDeviceId && previousTargetDeviceId !== data.targetDeviceId) {
      const previousSocketId = connectedClients.get(previousTargetDeviceId);
      if (previousSocketId) {
        console.log(`🔄 Switching: Stopping stream from device: ${previousTargetDeviceId}`);
        io.to(previousSocketId).emit('stop_stream', { adminId: socket.id });
        // Small delay to ensure clean switch
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const targetSocketId = connectedClients.get(data.targetDeviceId);
    if (targetSocketId) {
      console.log(`✅ Found target socket ID: ${targetSocketId}, initiating stream...`);
      // Send a 'start_stream' command ONLY to that specific user's PC
      io.to(targetSocketId).emit('start_stream', { adminId: socket.id });
      adminViewingTargets.set(socket.id, data.targetDeviceId);
      
      // Confirm stream switch to admin
      socket.emit('stream_switched', { deviceId: data.targetDeviceId });
    } else {
      console.log(`❌ Could not find active socket for device ID: ${data.targetDeviceId}`);
      socket.emit('stream_error', { message: 'User connection not found. Please refresh and try again.' });
    }
  });

  socket.on('admin_stop_stream', () => {
    const targetDeviceId = adminViewingTargets.get(socket.id);
    if (!targetDeviceId) {
      return;
    }

    const targetSocketId = connectedClients.get(targetDeviceId);
    if (targetSocketId) {
      console.log(`Admin (${socket.id}) requested to stop stream for device: ${targetDeviceId}`);
      io.to(targetSocketId).emit('stop_stream', { adminId: socket.id });
    }

    adminViewingTargets.delete(socket.id);
  });

  // When the client agent sends an image, we forward it to the admin
  socket.on('stream_data', (data) => {
    console.log(`📸 Received frame from client (${data.image.length} bytes), forwarding to admin: ${data.adminId}`);
    io.to(data.adminId).emit('new_frame', { image: data.image });
  });

  // Handle disconnections
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);

    const viewingTarget = adminViewingTargets.get(socket.id);
    if (viewingTarget) {
      const viewingSocketId = connectedClients.get(viewingTarget);
      if (viewingSocketId) {
        console.log(`Stopping stream from device: ${viewingTarget} due to admin disconnect: ${socket.id}`);
        io.to(viewingSocketId).emit('stop_stream', { adminId: socket.id });
      }
      adminViewingTargets.delete(socket.id);
    }
    
    // Clean up the connectedClients map and update database
    for (let [deviceId, id] of connectedClients.entries()) {
      if (id === socket.id) {
        connectedClients.delete(deviceId);
        
        try {
          // Update user offline status in database
          await User.findOneAndUpdate(
            { deviceId },
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