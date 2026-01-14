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
const MouseTracking = require('./models/MouseTracking');
const AppUsage = require('./models/AppUsage');
const Keystroke = require('./models/Keystroke');

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

// Device Registration Routes

// Check if device is registered
app.get('/api/device/check/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const user = await User.findOne({ deviceId });

    if (user) {
      // Update last seen
      user.lastSeen = new Date();
      user.isOnline = true;
      await user.save();

      res.json({
        success: true,
        registered: true,
        user: {
          id: user._id.toString(),
          userId: user._id.toString(),
          deviceId: user.deviceId,
          username: user.username,
          name: user.name || user.username,
          email: user.email,
          photoUrl: user.photoUrl,
          computerName: user.computerName
        }
      });
    } else {
      res.json({
        success: true,
        registered: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking device registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register device
app.post('/api/device/register', async (req, res) => {
  try {
    const { deviceId, userId, email, name, photoUrl, computerName } = req.body;

    // Validate required fields
    if (!deviceId || !userId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, userId, email, and name are required'
      });
    }

    // Check if user already exists with this device
    let user = await User.findOne({ deviceId });

    if (user) {
      // Update existing user
      user.externalUserId = userId;
      user.email = email;
      user.name = name;
      user.username = name; // Use name as username
      user.photoUrl = photoUrl || '';
      user.computerName = computerName || '';
      user.isExternalUser = true;
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        deviceId,
        externalUserId: userId,
        email,
        name,
        username: name,
        photoUrl: photoUrl || '',
        computerName: computerName || '',
        isExternalUser: true,
        isOnline: true,
        lastSeen: new Date()
      });
      await user.save();
    }

    res.json({
      success: true,
      message: 'Device registered successfully',
      user: {
        id: user._id.toString(),
        userId: user._id.toString(),
        deviceId: user.deviceId,
        username: user.username,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        computerName: user.computerName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Unregister device (logout)
app.post('/api/device/unregister', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required'
      });
    }

    const user = await User.findOne({ deviceId });

    if (user) {
      user.isOnline = false;
      user.isStreaming = false;
      user.lastSeen = new Date();
      await user.save();
      
      // Optionally delete external users completely on logout
      // if (user.isExternalUser) {
      //   await User.deleteOne({ deviceId });
      // }
    }

    res.json({
      success: true,
      message: 'Device unregistered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unregistering device',
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

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, email, computerName, screenShowEnabled } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (computerName) updateData.computerName = computerName;
    if (screenShowEnabled !== undefined) updateData.screenShowEnabled = screenShowEnabled;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Notify the client agent about the screen show setting change
    if (screenShowEnabled !== undefined) {
      const clientSocketId = connectedClients.get(user.deviceId);
      if (clientSocketId) {
        io.to(clientSocketId).emit('screen_show_updated', { screenShowEnabled });
      }
    }

    res.status(200).json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Also delete all related data
    await Promise.all([
      Screenshot.deleteMany({ userId: req.params.id }),
      AppUsage.deleteMany({ userId: req.params.id }),
      MouseTracking.deleteMany({ userId: req.params.id }),
      Keystroke.deleteMany({ userId: req.params.id })
    ]);

    res.status(200).json({ success: true, message: 'User and all related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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

// ============ Mouse Tracking API Endpoints ============

// Save mouse tracking data
app.post('/api/mouse-tracking', async (req, res) => {
  try {
    const { userId, deviceId, username, sessionId, movements, clicks, scrolls, screenResolution } = req.body;

    if (!userId || !deviceId || !username || !sessionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if session already exists
    let tracking = await MouseTracking.findOne({ sessionId });

    if (tracking) {
      // Update existing session
      if (movements && movements.length > 0) {
        tracking.movements.push(...movements);
      }
      if (clicks && clicks.length > 0) {
        tracking.clicks.push(...clicks);
      }
      if (scrolls && scrolls.length > 0) {
        tracking.scrolls.push(...scrolls);
      }
      tracking.endTime = new Date();
      await tracking.save();
    } else {
      // Create new session
      tracking = await MouseTracking.create({
        userId,
        deviceId,
        username,
        sessionId,
        movements: movements || [],
        clicks: clicks || [],
        scrolls: scrolls || [],
        screenResolution: screenResolution || { width: 1920, height: 1080 },
        endTime: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Mouse tracking data saved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save mouse tracking data' 
    });
  }
});

// Get mouse tracking data for a specific user
app.get('/api/mouse-tracking/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, skip = 0, sessionId, startDate, endDate } = req.query;

    let query = { userId };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.startTime.$lte = endDateTime;
      }
    }

    const trackingData = await MouseTracking.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await MouseTracking.countDocuments(query);

    res.status(200).json({
      success: true,
      trackingData,
      total,
      hasMore: total > (parseInt(skip) + trackingData.length)
    });
  } catch (error) {
    console.error('Error fetching mouse tracking data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch mouse tracking data' 
    });
  }
});

// Get specific session data
app.get('/api/mouse-tracking/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const tracking = await MouseTracking.findOne({ sessionId });

    if (!tracking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }

    res.status(200).json({
      success: true,
      tracking
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch session data' 
    });
  }
});

// Get aggregated statistics
app.get('/api/mouse-tracking/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { userId };
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const trackingData = await MouseTracking.find(query);

    let totalMovements = 0;
    let totalLeftClicks = 0;
    let totalRightClicks = 0;
    let totalMiddleClicks = 0;
    let totalScrolls = 0;

    trackingData.forEach(session => {
      totalMovements += session.movements.length;
      session.clicks.forEach(click => {
        if (click.button === 'left') totalLeftClicks++;
        else if (click.button === 'right') totalRightClicks++;
        else if (click.button === 'middle') totalMiddleClicks++;
      });
      totalScrolls += session.scrolls.length;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalSessions: trackingData.length,
        totalMovements,
        totalLeftClicks,
        totalRightClicks,
        totalMiddleClicks,
        totalClicks: totalLeftClicks + totalRightClicks + totalMiddleClicks,
        totalScrolls
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// Delete old mouse tracking data (cleanup endpoint)
app.delete('/api/mouse-tracking/cleanup/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await MouseTracking.deleteMany({
      startTime: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old mouse tracking sessions`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup mouse tracking data' 
    });
  }
});

// ============ Keystroke Tracking API Endpoints ============

// Save keystroke tracking data
app.post('/api/keystroke-tracking', async (req, res) => {
  try {
    const { userId, deviceId, username, sessionId, keystrokes, totalCount, appBreakdown, screenResolution } = req.body;

    if (!userId || !deviceId || !username || !sessionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const keystrokeData = await Keystroke.create({
      userId,
      deviceId,
      username,
      sessionId,
      keystrokes: keystrokes || [],
      totalCount: totalCount || 0,
      appBreakdown: appBreakdown || [],
      screenResolution: screenResolution || { width: 0, height: 0 }
    });

    res.status(201).json({
      success: true,
      message: 'Keystroke data saved successfully',
      data: keystrokeData
    });
  } catch (error) {
    console.error('Error saving keystroke data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save keystroke data' 
    });
  }
});

// Get keystroke data for a specific user with pagination and date filtering
app.get('/api/keystroke-tracking/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const query = { userId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day (23:59:59.999)
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }

    const keystrokeData = await Keystroke.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Keystroke.countDocuments(query);

    res.status(200).json({
      success: true,
      data: keystrokeData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching keystroke data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch keystroke data' 
    });
  }
});

// Get keystroke statistics for a user
app.get('/api/keystroke-tracking/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const matchQuery = { userId: new mongoose.Types.ObjectId(userId) };
    
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day (23:59:59.999)
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = endDateTime;
      }
    }

    // Get total keystroke count
    const totalStats = await Keystroke.aggregate([
      { $match: matchQuery },
      { $group: {
        _id: null,
        totalKeystrokes: { $sum: '$totalCount' },
        sessionCount: { $sum: 1 }
      }}
    ]);

    // Get keystroke count by app
    const appStats = await Keystroke.aggregate([
      { $match: matchQuery },
      { $unwind: '$appBreakdown' },
      { $group: {
        _id: '$appBreakdown.appName',
        totalCount: { $sum: '$appBreakdown.count' }
      }},
      { $sort: { totalCount: -1 } },
      { $limit: 20 }
    ]);

    // Get keystroke count by date (hourly)
    const timeSeriesData = await Keystroke.aggregate([
      { $match: matchQuery },
      { $unwind: '$keystrokes' },
      { $group: {
        _id: {
          year: { $year: '$keystrokes.timestamp' },
          month: { $month: '$keystrokes.timestamp' },
          day: { $dayOfMonth: '$keystrokes.timestamp' },
          hour: { $hour: '$keystrokes.timestamp' }
        },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Calculate average keystrokes per session
    const avgKeystrokesPerSession = totalStats.length > 0 && totalStats[0].sessionCount > 0
      ? Math.round(totalStats[0].totalKeystrokes / totalStats[0].sessionCount)
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalKeystrokes: totalStats.length > 0 ? totalStats[0].totalKeystrokes : 0,
        sessionCount: totalStats.length > 0 ? totalStats[0].sessionCount : 0,
        avgKeystrokesPerSession,
        appBreakdown: appStats.map(app => ({
          appName: app._id,
          count: app.totalCount
        })),
        timeSeries: timeSeriesData.map(item => ({
          timestamp: new Date(item._id.year, item._id.month - 1, item._id.day, item._id.hour),
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching keystroke statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch keystroke statistics' 
    });
  }
});

// Delete old keystroke data (cleanup endpoint)
app.delete('/api/keystroke-tracking/cleanup/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Keystroke.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old keystroke tracking sessions`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up keystroke data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup keystroke data' 
    });
  }
});

// ============ App Usage Tracking API Endpoints ============

// Save app usage data
app.post('/api/app-usage', async (req, res) => {
  try {
    const { userId, deviceId, username, appName, windowTitle, startTime, endTime, duration } = req.body;

    if (!userId || !deviceId || !username || !appName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const appUsage = await AppUsage.create({
      userId,
      deviceId,
      username,
      appName,
      windowTitle: windowTitle || '',
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      duration: duration || 0
    });

    res.status(201).json({
      success: true,
      message: 'App usage data saved successfully',
      appUsage: {
        id: appUsage._id,
        appName: appUsage.appName
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save app usage data' 
    });
  }
});

// Get app usage data for a specific user
app.get('/api/app-usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, skip = 0, startDate, endDate } = req.query;

    let query = { userId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const appUsageData = await AppUsage.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AppUsage.countDocuments(query);

    res.status(200).json({
      success: true,
      appUsageData,
      total,
      hasMore: total > (parseInt(skip) + appUsageData.length)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch app usage data' 
    });
  }
});

// Get app usage statistics for a user
app.get('/api/app-usage/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { userId: new mongoose.Types.ObjectId(userId) };

    console.log('App usage query with dates:', { startDate, endDate });

    // Get all app usage records
    const allRecords = await AppUsage.find(query);

    // Function to split session by date
    const splitSessionByDate = (record, filterStartDate, filterEndDate) => {
      const sessions = [];
      const startTime = new Date(record.startTime);
      const endTime = new Date(record.endTime);
      
      // Get start and end of day for dates
      let currentDate = new Date(startTime);
      currentDate.setHours(0, 0, 0, 0);
      
      while (currentDate <= endTime) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Check if this day is within filter range
        // Use local date formatting instead of UTC to match frontend filtering
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dayDateStr = `${year}-${month}-${day}`;
        
        let shouldInclude = true;
        if (filterStartDate && !filterEndDate) {
          // Single date filter - only include this specific date
          shouldInclude = dayDateStr === filterStartDate;
        } else if (filterStartDate || filterEndDate) {
          // Date range filter
          if (filterStartDate && dayDateStr < filterStartDate) shouldInclude = false;
          if (filterEndDate && dayDateStr > filterEndDate) shouldInclude = false;
        }
        
        if (shouldInclude) {
          // Calculate duration for this day
          const sessionStart = startTime > dayStart ? startTime : dayStart;
          const sessionEnd = endTime < dayEnd ? endTime : dayEnd;
          
          if (sessionStart <= sessionEnd) {
            const durationMs = sessionEnd - sessionStart;
            const durationSeconds = Math.floor(durationMs / 1000);
            
            if (durationSeconds > 0) {
              sessions.push({
                appName: record.appName,
                duration: durationSeconds,
                date: dayDateStr,
                timestamp: sessionStart
              });
            }
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return sessions;
    };

    // Split all records by date
    const splitSessions = [];
    for (const record of allRecords) {
      if (record.startTime && record.endTime && record.duration > 0) {
        const sessions = splitSessionByDate(record, startDate, endDate);
        splitSessions.push(...sessions);
      }
    }

    console.log('Split sessions count:', splitSessions.length);

    // Aggregate by app name
    const appStatsMap = {};
    let latestTimestamp = {};
    
    splitSessions.forEach(session => {
      if (!appStatsMap[session.appName]) {
        appStatsMap[session.appName] = {
          totalUsageTime: 0,
          usageCount: 0
        };
        latestTimestamp[session.appName] = session.timestamp;
      }
      
      appStatsMap[session.appName].totalUsageTime += session.duration;
      appStatsMap[session.appName].usageCount += 1;
      
      if (session.timestamp > latestTimestamp[session.appName]) {
        latestTimestamp[session.appName] = session.timestamp;
      }
    });

    // Convert to array and sort
    const appStats = Object.keys(appStatsMap).map(appName => ({
      _id: appName,
      totalUsageTime: appStatsMap[appName].totalUsageTime,
      usageCount: appStatsMap[appName].usageCount,
      lastUsed: latestTimestamp[appName]
    })).sort((a, b) => b.totalUsageTime - a.totalUsageTime);

    console.log('Aggregated app stats (first 3):', appStats.slice(0, 3));

    // Get total usage time
    const totalUsageTime = appStats.reduce((sum, app) => sum + app.totalUsageTime, 0);
    console.log('Total usage time (raw):', totalUsageTime);

    // Format the response
    const formattedStats = appStats.map(app => ({
      appName: app._id,
      totalUsageTime: app.totalUsageTime,
      totalUsageTimeFormatted: formatDuration(app.totalUsageTime),
      usageCount: app.usageCount,
      lastUsed: app.lastUsed,
      percentage: totalUsageTime > 0 ? ((app.totalUsageTime / totalUsageTime) * 100).toFixed(2) : 0
    }));

    res.status(200).json({
      success: true,
      stats: formattedStats,
      totalApps: appStats.length,
      totalUsageTime,
      totalUsageTimeFormatted: formatDuration(totalUsageTime)
    });
  } catch (error) {
    console.error('Error in app-usage stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch app usage statistics' 
    });
  }
});

// Helper function to format duration
function formatDuration(value) {
  // Convert to seconds if the value seems to be in milliseconds (> 100000 suggests milliseconds)
  let seconds = value;
  if (value > 100000) {
    seconds = Math.floor(value / 1000);
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Delete old app usage data (cleanup endpoint)
app.delete('/api/app-usage/cleanup/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await AppUsage.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old app usage records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup app usage data' 
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
    const { screenshotEnabled, screenshotInterval, streamingEnabled, doubleScreenEnabled } = req.body;
    
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
    if (typeof doubleScreenEnabled === 'boolean') updates.doubleScreenEnabled = doubleScreenEnabled;

    const settings = await Settings.updateSettings(updates);
    
    // Notify all connected clients about settings change
    io.emit('settings_updated', {
      screenshotEnabled: settings.screenshotEnabled,
      screenshotInterval: settings.screenshotInterval,
      streamingEnabled: settings.streamingEnabled,
      doubleScreenEnabled: settings.doubleScreenEnabled
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
      const user = await User.findOneAndUpdate(
        { deviceId: data.deviceId },
        { isOnline: true, lastSeen: new Date() },
        { new: true }
      );
      
      // Send current settings to the newly connected client
      const settings = await Settings.getSettings();
      socket.emit('settings_updated', {
        screenshotEnabled: settings.screenshotEnabled,
        screenshotInterval: settings.screenshotInterval,
        streamingEnabled: settings.streamingEnabled,
        screenShowEnabled: user ? user.screenShowEnabled : true
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

  // Handle screen switching request from admin
  socket.on('request_switch_screen', (data) => {
    const targetSocketId = connectedClients.get(data.targetDeviceId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('switch_screen', { 
        screenIndex: data.screenIndex 
      });
    }
  });

  // When the client agent sends an image, we forward it to the admin
  socket.on('stream_data', (data) => {
    io.to(data.adminId).emit('new_frame', { 
      image: data.image,
      screenIndex: data.screenIndex,
      totalScreens: data.totalScreens
    });
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

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});