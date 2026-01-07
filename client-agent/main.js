// client-agent/main.js
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { io } = require("socket.io-client");
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const os = require('os');
const { machineId } = require('node-machine-id');
const path = require('path');
const fs = require('fs');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load environment variables based on command line argument or NODE_ENV
const args = process.argv.slice(1);
const envArg = args.find(arg => arg.startsWith('--env='));
const environment = envArg ? envArg.split('=')[1] : (process.env.NODE_ENV || 'development');

const envFile = path.join(__dirname, `.env.${environment}`);
if (fs.existsSync(envFile)) {
  const envConfig = fs.readFileSync(envFile, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
let mainWindow = null;
let socket = null;
let streamingInterval = null;
let screenshotInterval = null;
let currentUser = null;
let cachedDeviceIdentifier = null;
let currentSettings = {
  screenshotEnabled: true,
  screenshotInterval: 6000,
  streamingEnabled: true
};
let mouseTrackingData = {
  sessionId: null,
  movements: [],
  clicks: [],
  scrolls: [],
  screenResolution: { width: 0, height: 0 }
};
let mouseTrackingInterval = null;
let isTrackingMouse = false;
let appTrackingInterval = null;
let appUploadInterval = null;
let isTrackingApps = false;
let currentApp = null;
let appStartTime = null;
let appUsageBuffer = [];
let keystrokeTrackingData = {
  sessionId: null,
  keystrokes: [],
  screenResolution: { width: 0, height: 0 },
  currentApp: null,
  lastKnownApp: { name: 'Unknown', title: '' }
};
let keystrokeTrackingInterval = null;
let keystrokeAppCheckInterval = null;
let isTrackingKeystrokes = false;

// Resolve a stable device identifier without relying on network hardware.
async function getDeviceIdentifier() {
  if (cachedDeviceIdentifier) {
    return cachedDeviceIdentifier;
  }

  try {
    const id = await machineId();
    if (id) {
      cachedDeviceIdentifier = id;
      return cachedDeviceIdentifier;
    }
  } catch (error) {
  }

  cachedDeviceIdentifier = os.hostname();
  return cachedDeviceIdentifier;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle signup
ipcMain.handle('signup', async (event, data) => {
  try {
    const deviceId = await getDeviceIdentifier();
    const computerName = os.hostname();
    
    const response = await axios.post(`${SERVER_URL}/api/signup`, {
      ...data,
      deviceId,
      computerName
    });

    if (response.data.success) {
      currentUser = response.data.user;
      
      // Start app tracking
      startAppTracking();
      
      // Connect to socket immediately after signup
      if (!socket) {
        socket = io(SERVER_URL);

        socket.on('connect', () => {
          socket.emit('register', { deviceId: currentUser.deviceId });
          // Emit that user is now monitoring (online)
          socket.emit('start_monitoring', { deviceId: currentUser.deviceId });
          
          // Notify renderer about connection status
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-update', {
              isOnline: true,
              screenshotEnabled: currentSettings.screenshotEnabled,
              screenshotInterval: currentSettings.screenshotInterval,
              streamingEnabled: currentSettings.streamingEnabled
            });
          }
        });

        socket.on('start_stream', (data) => {
          if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
          }
          
          let frameCount = 0;
          
          streamingInterval = setInterval(async () => {
            try {
              const imgBuffer = await screenshot({ format: 'jpeg' });
              const base64Image = imgBuffer.toString('base64');
              frameCount++;
              socket.emit('stream_data', { image: base64Image, adminId: data.adminId });
            } catch (error) {
            }
          }, 1000);
        });

        socket.on('stop_stream', (data) => {
          if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
          }
        });

        socket.on('disconnect', () => {
          
          // Notify renderer about disconnection
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-update', {
              isOnline: false,
              screenshotEnabled: currentSettings.screenshotEnabled,
              screenshotInterval: currentSettings.screenshotInterval,
              streamingEnabled: currentSettings.streamingEnabled
            });
          }
        });

        socket.on('error', (error) => {
        });

        // Listen for settings updates from admin
        socket.on('settings_updated', (settings) => {
          handleSettingsUpdate(settings);
        });
      } else {
        // If socket already exists, just register again
        socket.emit('register', { deviceId: currentUser.deviceId });
        socket.emit('start_monitoring', { deviceId: currentUser.deviceId });
      }
      
      // Start screenshot capture interval automatically based on settings
      startScreenshotCapture();
      
      // Start mouse tracking
      startMouseTracking();
      
      // Start keystroke tracking
      startKeystrokeTracking();
      
      return { success: true, user: response.data.user };
    } else {
      return { success: false, message: response.data.message };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Signup failed' 
    };
  }
});

// Handle login
ipcMain.handle('login', async (event, data) => {
  try {
    const deviceId = await getDeviceIdentifier();
    
    const response = await axios.post(`${SERVER_URL}/api/login`, {
      ...data,
      deviceId
    });

    if (response.data.success) {
      currentUser = response.data.user;
      
      // Connect to socket immediately after login to set user as online
      if (!socket) {
        socket = io(SERVER_URL);

        socket.on('connect', () => {
          socket.emit('register', { deviceId: currentUser.deviceId });
          // Emit that user is now monitoring (online)
          socket.emit('start_monitoring', { deviceId: currentUser.deviceId });
          
          // Notify renderer about connection status
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-update', {
              isOnline: true,
              screenshotEnabled: currentSettings.screenshotEnabled,
              screenshotInterval: currentSettings.screenshotInterval,
              streamingEnabled: currentSettings.streamingEnabled
            });
          }
        });

        socket.on('start_stream', (data) => {
          if (!currentSettings.streamingEnabled) {
            return;
          }

          if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
          }
          
          let frameCount = 0;
          
          streamingInterval = setInterval(async () => {
            try {
              const imgBuffer = await screenshot({ format: 'jpeg' });
              const base64Image = imgBuffer.toString('base64');
              frameCount++;
              socket.emit('stream_data', { image: base64Image, adminId: data.adminId });
            } catch (error) {
            }
          }, 1000);
        });

        socket.on('stop_stream', (data) => {
          if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
          }
        });

        socket.on('disconnect', () => {
          
          // Notify renderer about disconnection
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-update', {
              isOnline: false,
              screenshotEnabled: currentSettings.screenshotEnabled,
              screenshotInterval: currentSettings.screenshotInterval,
              streamingEnabled: currentSettings.streamingEnabled
            });
          }
        });

        socket.on('error', (error) => {
        });

        // Listen for settings updates from admin
        socket.on('settings_updated', (settings) => {
          handleSettingsUpdate(settings);
        });
      } else {
        // If socket already exists, just register again
        socket.emit('register', { deviceId: currentUser.deviceId });
        socket.emit('start_monitoring', { deviceId: currentUser.deviceId });
      }
      
      // Start screenshot capture interval automatically based on settings
      startScreenshotCapture();
      
      // Start mouse tracking
      startMouseTracking();
      
      // Start app tracking
      startAppTracking();
      
      // Start keystroke tracking
      startKeystrokeTracking();
      
      return { success: true, user: response.data.user };
    } else {
      return { success: false, message: response.data.message };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Login failed' 
    };
  }
});

// Function to capture and upload screenshot
async function captureAndUploadScreenshot() {
  try {
    if (!currentUser) {
      return;
    }

    if (!currentSettings.screenshotEnabled) {
      return;
    }

    const imgBuffer = await screenshot({ format: 'jpeg' });
    const base64Image = imgBuffer.toString('base64');
    
    // Upload to server
    const response = await axios.post(`${SERVER_URL}/api/screenshots`, {
      userId: currentUser.id,
      deviceId: currentUser.deviceId,
      username: currentUser.username,
      computerName: currentUser.computerName,
      imageData: `data:image/jpeg;base64,${base64Image}`
    });
  } catch (error) {
  }
}

// Function to start screenshot capture with current settings
function startScreenshotCapture() {
  // Stop existing interval if any
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  if (!currentSettings.screenshotEnabled) {
    return;
  }
  
  // Take first screenshot immediately
  captureAndUploadScreenshot();
  
  // Then continue at the specified interval
  screenshotInterval = setInterval(captureAndUploadScreenshot, currentSettings.screenshotInterval);
}

// Function to handle settings updates from admin
function handleSettingsUpdate(settings) {
  const oldSettings = { ...currentSettings };
  currentSettings = { ...currentSettings, ...settings };

  // Handle screenshot settings changes
  if (oldSettings.screenshotEnabled !== currentSettings.screenshotEnabled ||
      oldSettings.screenshotInterval !== currentSettings.screenshotInterval) {
    
    if (currentUser) {
      startScreenshotCapture();
    }
  }

  // Handle streaming settings changes
  if (oldSettings.streamingEnabled !== currentSettings.streamingEnabled) {
    if (!currentSettings.streamingEnabled && streamingInterval) {
      // Stop streaming if it's currently active and admin disabled it
      clearInterval(streamingInterval);
      streamingInterval = null;
    }
  }

  // Notify the renderer process about settings changes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', {
      isOnline: socket && socket.connected,
      screenshotEnabled: currentSettings.screenshotEnabled,
      screenshotInterval: currentSettings.screenshotInterval,
      streamingEnabled: currentSettings.streamingEnabled
    });
  }
}

// Handle start monitoring
ipcMain.handle('start-monitoring', async (event) => {
  try {
    if (!currentUser) {
      return { success: false, message: 'Not logged in' };
    }

    // Socket should already be connected from login, but check just in case
    if (!socket || !socket.connected) {
      if (socket) {
        socket.connect();
      }
    }

    // Emit start monitoring event
    socket.emit('start_monitoring', { deviceId: currentUser.deviceId });

    // Start screenshot capture based on current settings
    startScreenshotCapture();
    
    // Start keystroke tracking
    startKeystrokeTracking();

    return { success: true, message: 'Monitoring started' };
  } catch (error) {
    return { success: false, message: 'Failed to start monitoring' };
  }
});

// Handle get current status
ipcMain.handle('get-status', async (event) => {
  try {
    if (!currentUser) {
      return { 
        success: false, 
        message: 'Not logged in',
        isOnline: false,
        screenshotEnabled: false,
        screenshotInterval: 0
      };
    }

    return { 
      success: true,
      isOnline: socket && socket.connected,
      screenshotEnabled: currentSettings.screenshotEnabled,
      screenshotInterval: currentSettings.screenshotInterval,
      streamingEnabled: currentSettings.streamingEnabled
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'Failed to get status',
      isOnline: false,
      screenshotEnabled: false,
      screenshotInterval: 0
    };
  }
});

// Handle logout
ipcMain.handle('logout', async (event) => {
  try {
    if (!currentUser) {
      return { success: false, message: 'Not logged in' };
    }

    const deviceId = currentUser.deviceId;

    // Stop streaming if active
    if (streamingInterval) {
      clearInterval(streamingInterval);
      streamingInterval = null;
    }

    // Stop screenshot capture
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }

    // Emit logout event to set user offline
    if (socket && socket.connected) {
      socket.emit('logout', { deviceId });
      socket.disconnect();
    }

    // Update offline status via API
    try {
      await axios.post(`${SERVER_URL}/api/logout`, { deviceId });
    } catch (error) {
    }

    // Clear socket and user
    socket = null;
    currentUser = null;

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to logout' };
  }
});

// Handle stop monitoring
ipcMain.handle('stop-monitoring', async (event) => {
  try {
    if (!currentUser || !socket) {
      return { success: false, message: 'Not monitoring' };
    }

    // Stop streaming if active
    if (streamingInterval) {
      clearInterval(streamingInterval);
      streamingInterval = null;
    }

    // Stop screenshot capture
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }

    // Emit stop monitoring event
    socket.emit('stop_monitoring', { deviceId: currentUser.deviceId });

    return { success: true, message: 'Monitoring stopped' };
  } catch (error) {
    return { success: false, message: 'Failed to stop monitoring' };
  }
});

// ============ Mouse Tracking Functions ============

// Generate unique session ID
function generateSessionId() {
  return `${currentUser.deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start mouse tracking
function startMouseTracking() {
  if (isTrackingMouse || !currentUser) {
    return;
  }

  isTrackingMouse = true;
  
  // Initialize session
  mouseTrackingData.sessionId = generateSessionId();
  mouseTrackingData.movements = [];
  mouseTrackingData.clicks = [];
  mouseTrackingData.scrolls = [];
  
  // Get screen resolution
  const primaryDisplay = screen.getPrimaryDisplay();
  mouseTrackingData.screenResolution = {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height
  };

  // Start uiohook to track mouse events
  try {
    uIOhook.on('mousemove', (e) => {
      if (isTrackingMouse) {
        mouseTrackingData.movements.push({
          x: e.x,
          y: e.y,
          timestamp: new Date()
        });
      }
    });

    uIOhook.on('click', (e) => {
      if (isTrackingMouse) {
        let button = 'left';
        if (e.button === 2) button = 'right';
        else if (e.button === 3) button = 'middle';
        
        mouseTrackingData.clicks.push({
          x: e.x,
          y: e.y,
          button: button,
          timestamp: new Date()
        });
      }
    });

    uIOhook.on('wheel', (e) => {
      if (isTrackingMouse) {
        mouseTrackingData.scrolls.push({
          deltaX: e.x,
          deltaY: e.rotation,
          timestamp: new Date()
        });
      }
    });

    // Register keystroke listener once
    uIOhook.on('keydown', (e) => {
      if (isTrackingKeystrokes) {
        const app = keystrokeTrackingData.currentApp || keystrokeTrackingData.lastKnownApp;
        keystrokeTrackingData.keystrokes.push({
          key: e.keycode.toString(),
          timestamp: new Date(),
          appName: app.name,
          appTitle: app.title
        });
      }
    });

    uIOhook.start();
  } catch (error) {
    console.error('Error starting uIOhook:', error);
  }

  // Send data to server every 30 seconds
  mouseTrackingInterval = setInterval(uploadMouseTrackingData, 30000);
}

// Stop mouse tracking
function stopMouseTracking() {
  if (!isTrackingMouse) {
    return;
  }

  isTrackingMouse = false;

  try {
    uIOhook.stop();
  } catch (error) {
  }

  if (mouseTrackingInterval) {
    clearInterval(mouseTrackingInterval);
    mouseTrackingInterval = null;
  }

  // Upload final data before stopping
  uploadMouseTrackingData();
}

// Upload mouse tracking data to server
async function uploadMouseTrackingData() {
  if (!currentUser || !mouseTrackingData.sessionId) {
    return;
  }

  // Only upload if there's data
  if (mouseTrackingData.movements.length === 0 && 
      mouseTrackingData.clicks.length === 0 && 
      mouseTrackingData.scrolls.length === 0) {
    return;
  }

  try {
    await axios.post(`${SERVER_URL}/api/mouse-tracking`, {
      userId: currentUser.id,
      deviceId: currentUser.deviceId,
      username: currentUser.username,
      sessionId: mouseTrackingData.sessionId,
      movements: mouseTrackingData.movements,
      clicks: mouseTrackingData.clicks,
      scrolls: mouseTrackingData.scrolls,
      screenResolution: mouseTrackingData.screenResolution
    });

    // Clear data after successful upload
    mouseTrackingData.movements = [];
    mouseTrackingData.clicks = [];
    mouseTrackingData.scrolls = [];
  } catch (error) {
  }
}

// ============ Keystroke Tracking Functions ============

// Start keystroke tracking
async function startKeystrokeTracking() {
  if (isTrackingKeystrokes || !currentUser) {
    return;
  }

  isTrackingKeystrokes = true;
  
  // Initialize session
  keystrokeTrackingData.sessionId = generateSessionId();
  keystrokeTrackingData.keystrokes = [];
  keystrokeTrackingData.currentApp = null;
  
  // Get screen resolution
  const primaryDisplay = screen.getPrimaryDisplay();
  keystrokeTrackingData.screenResolution = {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height
  };

  console.log('Keystroke tracking started for user:', currentUser.username);

  // Get initial app
  try {
    const initialWindow = await getActiveWindow();
    if (initialWindow) {
      keystrokeTrackingData.currentApp = {
        name: initialWindow.owner.name,
        title: initialWindow.title
      };
      keystrokeTrackingData.lastKnownApp = keystrokeTrackingData.currentApp;
    }
  } catch (error) {
    console.error('Failed to get initial window:', error);
  }

  // Update current app every 1 second for better accuracy
  keystrokeAppCheckInterval = setInterval(async () => {
    try {
      const activeWindow = await getActiveWindow();
      if (activeWindow) {
        keystrokeTrackingData.currentApp = {
          name: activeWindow.owner.name,
          title: activeWindow.title
        };
        keystrokeTrackingData.lastKnownApp = keystrokeTrackingData.currentApp;
      }
    } catch (error) {
      // Keep using last known app on error
      keystrokeTrackingData.currentApp = keystrokeTrackingData.lastKnownApp;
    }
  }, 1000);

  // Send data to server every 30 seconds
  keystrokeTrackingInterval = setInterval(uploadKeystrokeTrackingData, 30000);
}
if (keystrokeAppCheckInterval) {
    clearInterval(keystrokeAppCheckInterval);
    keystrokeAppCheckInterval = null;
  }

  
// Stop keystroke tracking
function stopKeystrokeTracking() {
  if (!isTrackingKeystrokes) {
    return;
  }

  isTrackingKeystrokes = false;

  if (keystrokeTrackingInterval) {
    clearInterval(keystrokeTrackingInterval);
    keystrokeTrackingInterval = null;
  }

  // Upload final data before stopping
  uploadKeystrokeTrackingData();
}

// Upload keystroke tracking data to server
async function uploadKeystrokeTrackingData() {
  if (!currentUser || !keystrokeTrackingData.sessionId) {
    return;
  }

  // Only upload if there's data
  if (keystrokeTrackingData.keystrokes.length === 0) {
    console.log('No keystroke data to upload');
    return;
  }

  try {
    console.log(`Uploading ${keystrokeTrackingData.keystrokes.length} keystrokes`);
    
    // Calculate app breakdown
    const appBreakdown = {};
    keystrokeTrackingData.keystrokes.forEach(keystroke => {
      const appName = keystroke.appName || 'Unknown';
      if (!appBreakdown[appName]) {
        appBreakdown[appName] = 0;
      }
      appBreakdown[appName]++;
    });

    const appBreakdownArray = Object.keys(appBreakdown).map(appName => ({
      appName,
      count: appBreakdown[appName]
    }));

    await axios.post(`${SERVER_URL}/api/keystroke-tracking`, {
      userId: currentUser.id,
      deviceId: currentUser.deviceId,
      username: currentUser.username,
      sessionId: keystrokeTrackingData.sessionId,
      keystrokes: keystrokeTrackingData.keystrokes,
      totalCount: keystrokeTrackingData.keystrokes.length,
      appBreakdown: appBreakdownArray,
      screenResolution: keystrokeTrackingData.screenResolution
    });

    console.log('Keystroke data uploaded successfully');
    
    // Clear data after successful upload
    keystrokeTrackingData.keystrokes = [];
  } catch (error) {
    console.error('Error uploading keystroke tracking data:', error);
  }
}

// ============ App Usage Tracking Functions ============

// Get active window using PowerShell (Windows-only)
async function getActiveWindow() {
  try {
    const scriptPath = path.join(__dirname, 'get-active-window.ps1');
    const { stdout } = await execPromise(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 3000 }
    );
    
    const output = stdout.trim();
    if (!output) return null;
    
    const result = JSON.parse(output);
    
    if (result && result.ProcessName) {
      return {
        owner: { name: result.ProcessName },
        title: result.WindowTitle || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting active window:', error.message);
    return null;
  }
}

// Start app usage tracking
async function startAppTracking() {
  if (isTrackingApps || !currentUser) {
    console.log('App tracking not started:', { isTrackingApps, hasUser: !!currentUser });
    return;
  }

  console.log('Starting app tracking for user:', currentUser.username);

  // Test if we can get active window
  try {
    const testWindow = await getActiveWindow();
    console.log('Active window detection test successful:', testWindow);
  } catch (error) {
    console.error('Active window detection test failed:', error);
    return;
  }

  isTrackingApps = true;
  appUsageBuffer = [];

  // Track active window every 2 seconds
  appTrackingInterval = setInterval(async () => {
    try {
      const activeWindow = await getActiveWindow();
      
      if (activeWindow) {
        const appName = activeWindow.owner.name || 'Unknown';
        const windowTitle = activeWindow.title || '';

        console.log('Active app detected:', appName);

        // Check if app changed
        if (!currentApp || currentApp !== appName) {
          // Save previous app usage if exists
          if (currentApp && appStartTime) {
            const endTime = new Date();
            const duration = Math.floor((endTime - appStartTime) / 1000); // in seconds

            if (duration > 0) {
              appUsageBuffer.push({
                appName: currentApp,
                windowTitle: '',
                startTime: appStartTime,
                endTime: endTime,
                duration: duration
              });
              console.log(`Buffered app usage: ${currentApp} - ${duration}s (Buffer size: ${appUsageBuffer.length})`);
            }
          }

          // Start tracking new app
          currentApp = appName;
          appStartTime = new Date();
          console.log(`Started tracking: ${appName}`);
        }
      } else {
        console.log('No active window detected');
      }
    } catch (error) {
      console.error('Error tracking app:', error);
    }
  }, 2000);

  // Upload app usage data every 15 seconds (reduced for more responsive updates)
  appUploadInterval = setInterval(uploadAppUsageData, 15000);
  
  // Do an immediate upload after 10 seconds to get initial data
  setTimeout(uploadAppUsageData, 10000);
  
  console.log('App tracking started successfully - will check every 2 seconds and upload every 15 seconds');
}

// Stop app usage tracking
function stopAppTracking() {
  if (!isTrackingApps) {
    return;
  }

  isTrackingApps = false;

  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = null;
  }

  if (appUploadInterval) {
    clearInterval(appUploadInterval);
    appUploadInterval = null;
  }

  // Save current app before stopping
  if (currentApp && appStartTime) {
    const endTime = new Date();
    const duration = Math.floor((endTime - appStartTime) / 1000);

    if (duration > 0) {
      appUsageBuffer.push({
        appName: currentApp,
        windowTitle: '',
        startTime: appStartTime,
        endTime: endTime,
        duration: duration
      });
    }
  }

  // Upload final data before stopping
  uploadAppUsageData();

  currentApp = null;
  appStartTime = null;
}

// Upload app usage data to server
async function uploadAppUsageData() {
  if (!currentUser) {
    console.log('No user logged in, skipping upload');
    return;
  }

  if (appUsageBuffer.length === 0) {
    console.log('No app usage data to upload');
    return;
  }

  console.log(`Uploading ${appUsageBuffer.length} app usage records...`);

  try {
    // Upload each app usage record
    for (const usage of appUsageBuffer) {
      const response = await axios.post(`${SERVER_URL}/api/app-usage`, {
        userId: currentUser.id,
        deviceId: currentUser.deviceId,
        username: currentUser.username,
        appName: usage.appName,
        windowTitle: usage.windowTitle,
        startTime: usage.startTime,
        endTime: usage.endTime,
        duration: usage.duration
      });
      console.log(`✓ Uploaded: ${usage.appName} - ${usage.duration}s`);
    }

    // Clear buffer after successful upload
    console.log(`✓ Successfully uploaded ${appUsageBuffer.length} app usage records`);
    appUsageBuffer = [];
  } catch (error) {
    console.error('✗ Failed to upload app usage data:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    // Keep data in buffer for next attempt if upload fails
  }
}

// Cleanup function when app is closing
async function cleanup() {
  // Stop app tracking
  stopAppTracking();
  
  // Stop mouse tracking
  stopMouseTracking();
  
  // Stop keystroke tracking
  stopKeystrokeTracking();

  // Stop all intervals
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }
  
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  // Set user offline
  if (currentUser && socket && socket.connected) {
    socket.emit('logout', { deviceId: currentUser.deviceId });
    
    // Also update via API
    try {
      await axios.post(`${SERVER_URL}/api/logout`, { 
        deviceId: currentUser.deviceId 
      });
    } catch (error) {
    }
    
    socket.disconnect();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  await cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  await cleanup();
  app.exit(0);
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});