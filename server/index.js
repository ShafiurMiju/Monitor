// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');
const Screenshot = require('./models/Screenshot');
const Settings = require('./models/Settings');
const MouseActivity = require('./models/MouseActivity');

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware to check database connection
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database connection unavailable. Please try again later.' 
    });
  }
  next();
});

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

    // Validate required fields
    if (!username || !email || !password || !deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (username, email, password, deviceId) are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

        // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }, { deviceId }] 
    });

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 
                           existingUser.username === username ? 'username' : 'device';
      return res.status(400).json({ 
        success: false, 
        message: `User with this ${conflictField} already exists` 
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
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `This ${field} is already registered` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    // Validate required fields
    if (!email || !password || !deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and device ID are required' 
      });
    }

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

    // Set user as online immediately upon login
    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date()
    });

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
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Logout Route
app.post('/api/logout', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Device ID is required' 
      });
    }

    // Set user as offline
    const user = await User.findOneAndUpdate(
      { deviceId },
      { 
        isOnline: false, 
        isStreaming: false,
        lastSeen: new Date() 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all users (for admin dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload screenshot
app.post('/api/screenshots', async (req, res) => {
  try {
    const { userId, deviceId, username, imageData, computerName } = req.body;

    if (!userId || !deviceId || !username || !imageData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const screenshot = await Screenshot.create({
      userId,
      deviceId,
      username,
      imageData,
      computerName: computerName || ''
    });

    res.status(201).json({
      success: true,
      message: 'Screenshot saved successfully',
      screenshot: {
        id: screenshot._id,
        timestamp: screenshot.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save screenshot' 
    });
  }
});

// Get screenshots for a specific user
app.get('/api/screenshots/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const screenshots = await Screenshot.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-imageData'); // Don't send image data in list

    const total = await Screenshot.countDocuments({ userId });

    res.status(200).json({
      success: true,
      screenshots,
      total,
      hasMore: total > (parseInt(skip) + screenshots.length)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch screenshots' 
    });
  }
});

// Get a specific screenshot with image data
app.get('/api/screenshots/image/:screenshotId', async (req, res) => {
  try {
    const { screenshotId } = req.params;

    const screenshot = await Screenshot.findById(screenshotId);

    if (!screenshot) {
      return res.status(404).json({ 
        success: false, 
        message: 'Screenshot not found' 
      });
    }

    res.status(200).json({
      success: true,
      screenshot
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch screenshot' 
    });
  }
});

// Delete old screenshots (cleanup endpoint - optional)
app.delete('/api/screenshots/cleanup/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Screenshot.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old screenshots`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup screenshots' 
    });
  }
});

// ============ Mouse Activity API Endpoints ============

// Batch upload mouse activity data
app.post('/api/mouse-activity/batch', async (req, res) => {
  try {
    const { userId, deviceId, username, computerName, activities } = req.body;

    console.log('📊 Received mouse activity batch:', {
      userId,
      deviceId,
      username,
      activitiesCount: activities?.length
    });

    if (!userId || !deviceId || !username || !activities || !Array.isArray(activities)) {
      console.log('❌ Invalid mouse activity data');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields or invalid activities array' 
      });
    }

    // Prepare batch insert data
    const mouseActivities = activities.map(activity => ({
      userId,
      deviceId,
      username,
      computerName: computerName || '',
      eventType: activity.eventType,
      x: activity.x,
      y: activity.y,
      screenWidth: activity.screenWidth,
      screenHeight: activity.screenHeight,
      scrollX: activity.scrollX || 0,
      scrollY: activity.scrollY || 0,
      timestamp: activity.timestamp || new Date()
    }));

    // Bulk insert
    await MouseActivity.insertMany(mouseActivities);

    console.log('✅ Saved', mouseActivities.length, 'mouse activities');

    res.status(201).json({
      success: true,
      message: 'Mouse activities saved successfully',
      count: mouseActivities.length
    });
  } catch (error) {
    console.error('❌ Error saving mouse activities:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save mouse activities' 
    });
  }
});

// Get mouse activity for a specific user
app.get('/api/mouse-activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      limit = 5000, 
      skip = 0, 
      eventType,
      startDate,
      endDate 
    } = req.query;

    console.log('📊 Fetching mouse activity for userId:', userId);

    // Build query
    const query = { userId };
    
    if (eventType) {
      query.eventType = eventType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    console.log('Query:', JSON.stringify(query));

    const activities = await MouseActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await MouseActivity.countDocuments(query);

    console.log('✅ Found', activities.length, 'activities out of', total, 'total');

    res.status(200).json({
      success: true,
      activities,
      total,
      hasMore: total > (parseInt(skip) + activities.length)
    });
  } catch (error) {
    console.error('❌ Error fetching mouse activities:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch mouse activities' 
    });
  }
});

// Get mouse activity statistics
app.get('/api/mouse-activity/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Build query
    const query = { userId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get counts by event type
    const stats = await MouseActivity.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: '$eventType', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const totalEvents = await MouseActivity.countDocuments(query);

    res.status(200).json({
      success: true,
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      totalEvents
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch mouse activity statistics' 
    });
  }
});

// Delete old mouse activity data (cleanup endpoint)
app.delete('/api/mouse-activity/cleanup/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await MouseActivity.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old mouse activity records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup mouse activity data' 
    });
  }
});

// ============ Settings API Endpoints ============

// Get current settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch settings' 
    });
  }
});

// Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const { screenshotEnabled, screenshotInterval, streamingEnabled } = req.body;
    
    const updates = {};
    if (typeof screenshotEnabled === 'boolean') updates.screenshotEnabled = screenshotEnabled;
    if (typeof screenshotInterval === 'number') {
      // Validate interval (between 1 second and 1 hour)
      if (screenshotInterval >= 1000 && screenshotInterval <= 3600000) {
        updates.screenshotInterval = screenshotInterval;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Screenshot interval must be between 1 second and 1 hour'
        });
      }
    }
    if (typeof streamingEnabled === 'boolean') updates.streamingEnabled = streamingEnabled;

    const settings = await Settings.updateSettings(updates);
    
    // Notify all connected clients about settings change
    io.emit('settings_updated', {
      screenshotEnabled: settings.screenshotEnabled,
      screenshotInterval: settings.screenshotInterval,
      streamingEnabled: settings.streamingEnabled
    });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings' 
    });
  }
});

// ============ Socket.IO Logic ============

// This block runs every time a new user connects
io.on('connection', (socket) => {
  // When a client agent checks in, we save its device ID and update user status
  socket.on('register', async (data) => {
    try {
      connectedClients.set(data.deviceId, socket.id);
      
      // Update user online status in database
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
        { isOnline: true, lastSeen: new Date() }
      );
      
      // Send current settings to the newly connected client
      const settings = await Settings.getSettings();
      socket.emit('settings_updated', {
        screenshotEnabled: settings.screenshotEnabled,
        screenshotInterval: settings.screenshotInterval,
        streamingEnabled: settings.streamingEnabled
      });
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
    }
  });

  // When user clicks "Start" button - mark as streaming
  socket.on('start_monitoring', async (data) => {
    try {
      // Update streaming status in database
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
        { isStreaming: true }
      );
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
    }
  });

  // When user stops monitoring
  socket.on('stop_monitoring', async (data) => {
    try {
      // Update streaming status in database
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
        { isStreaming: false }
      );
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
    }
  });

  // When user logs out
  socket.on('logout', async (data) => {
    try {
      // Update user status to offline
      await User.findOneAndUpdate(
        { deviceId: data.deviceId },
        { 
          isOnline: false, 
          isStreaming: false,
          lastSeen: new Date() 
        }
      );
      
      // Remove from connected clients
      connectedClients.delete(data.deviceId);
      
      // Notify all admins that user list has changed
      io.emit('user_status_changed');
    } catch (error) {
    }
  });

  // When an admin wants to see a screen
  socket.on('request_stream', async (data) => {
    const previousTargetDeviceId = adminViewingTargets.get(socket.id);

    // Verify the target user is actually online and streaming
    try {
      const targetUser = await User.findOne({ deviceId: data.targetDeviceId });
      if (!targetUser) {
        socket.emit('stream_error', { message: 'User not found' });
        return;
      }

      if (!targetUser.isOnline) {
        socket.emit('stream_error', { message: 'User is offline' });
        return;
      }

      if (!targetUser.isStreaming) {
        socket.emit('stream_error', { message: 'User has not enabled monitoring' });
        return;
      }
    } catch (error) {
      socket.emit('stream_error', { message: 'Failed to verify user status' });
      return;
    }

    // Stop previous stream if switching to a different user
    if (previousTargetDeviceId && previousTargetDeviceId !== data.targetDeviceId) {
      const previousSocketId = connectedClients.get(previousTargetDeviceId);
      if (previousSocketId) {
        io.to(previousSocketId).emit('stop_stream', { adminId: socket.id });
        // Small delay to ensure clean switch
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const targetSocketId = connectedClients.get(data.targetDeviceId);
    if (targetSocketId) {
      // Send a 'start_stream' command ONLY to that specific user's PC
      io.to(targetSocketId).emit('start_stream', { adminId: socket.id });
      adminViewingTargets.set(socket.id, data.targetDeviceId);
      
      // Confirm stream switch to admin
      socket.emit('stream_switched', { deviceId: data.targetDeviceId });
    } else {
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
      io.to(targetSocketId).emit('stop_stream', { adminId: socket.id });
    }

    adminViewingTargets.delete(socket.id);
  });

  // When the client agent sends an image, we forward it to the admin
  socket.on('stream_data', (data) => {
    io.to(data.adminId).emit('new_frame', { image: data.image });
  });

  // Handle disconnections
  socket.on('disconnect', async () => {
    const viewingTarget = adminViewingTargets.get(socket.id);
    if (viewingTarget) {
      const viewingSocketId = connectedClients.get(viewingTarget);
      if (viewingSocketId) {
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
        }
        
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
});