// client-agent/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { io } = require("socket.io-client");
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const os = require('os');
const { machineId } = require('node-machine-id');
const path = require('path');
const fs = require('fs');

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
let mouseTrackingEnabled = true;
let mouseDataBuffer = [];
const MOUSE_BUFFER_SIZE = 50; // Send data in batches of 50 events
const MOUSE_BUFFER_TIMEOUT = 5000; // Or every 5 seconds
let mouseBufferTimer = null;

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
      
      // Start mouse tracking after successful signup
      startMouseTracking();
      
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
      
      // Start screenshot capture based on current settings
      startScreenshotCapture();
      
      // Start mouse tracking after successful login
      startMouseTracking();
      
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

// Function to send buffered mouse data to server
async function sendMouseDataBuffer() {
  if (mouseDataBuffer.length === 0 || !currentUser) {
    return;
  }

  try {
    const dataToSend = [...mouseDataBuffer];
    mouseDataBuffer = []; // Clear buffer

    console.log(`📊 Sending ${dataToSend.length} mouse events to server`);

    const response = await axios.post(`${SERVER_URL}/api/mouse-activity/batch`, {
      userId: currentUser.id,
      deviceId: currentUser.deviceId,
      username: currentUser.username,
      computerName: currentUser.computerName,
      activities: dataToSend
    });

    console.log('✅ Mouse data sent successfully:', response.data);
  } catch (error) {
    console.error('❌ Failed to send mouse data:', error.message);
    // If send fails, don't clear buffer but limit size
    if (mouseDataBuffer.length > MOUSE_BUFFER_SIZE * 2) {
      mouseDataBuffer = mouseDataBuffer.slice(-MOUSE_BUFFER_SIZE);
    }
  }
}

// Function to add mouse event to buffer
function addMouseEvent(eventType, x, y, screenWidth, screenHeight, scrollX = 0, scrollY = 0) {
  if (!mouseTrackingEnabled || !currentUser) {
    return;
  }

  mouseDataBuffer.push({
    eventType,
    x,
    y,
    screenWidth,
    screenHeight,
    scrollX,
    scrollY,
    timestamp: new Date()
  });

  if (mouseDataBuffer.length === 1) {
    console.log('🖱️ Mouse tracking started, first event:', eventType, 'at', x, y);
  }

  // Send immediately if buffer is full
  if (mouseDataBuffer.length >= MOUSE_BUFFER_SIZE) {
    console.log(`📦 Buffer full (${mouseDataBuffer.length} events), sending now`);
    sendMouseDataBuffer();
    
    // Reset timeout timer
    if (mouseBufferTimer) {
      clearTimeout(mouseBufferTimer);
    }
    mouseBufferTimer = setTimeout(sendMouseDataBuffer, MOUSE_BUFFER_TIMEOUT);
  } else if (!mouseBufferTimer) {
    // Set timer for first event
    console.log(`⏱️ Starting buffer timeout (${MOUSE_BUFFER_TIMEOUT}ms)`);
    mouseBufferTimer = setTimeout(sendMouseDataBuffer, MOUSE_BUFFER_TIMEOUT);
  }
}

// Start mouse tracking using Electron's built-in screen capture
function startMouseTracking() {
  // Prevent duplicate intervals
  if (global.mouseTrackingInterval) {
    return;
  }

  if (!currentUser) {
    return;
  }

  try {
    const { screen } = require('electron');
    let lastMoveTime = 0;
    const MOVE_THROTTLE = 500; // Throttle move events to once per 500ms

    // Create a global mouse tracking interval
    global.mouseTrackingInterval = setInterval(() => {
      if (!currentUser || !mouseTrackingEnabled) return;

      const now = Date.now();
      if (now - lastMoveTime < MOVE_THROTTLE) return;

      try {
        const cursorPos = screen.getCursorScreenPoint();
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        
        // Only track if cursor position is valid
        if (cursorPos.x >= 0 && cursorPos.y >= 0) {
          addMouseEvent('move', cursorPos.x, cursorPos.y, width, height);
          lastMoveTime = now;
        }
      } catch (error) {
        // Ignore cursor tracking errors
      }
    }, MOVE_THROTTLE);
  } catch (error) {
    // If tracking fails, disable it
    mouseTrackingEnabled = false;
  }
}

// Cleanup function when app is closing
async function cleanup() {
  // Stop all intervals
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }
  
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  if (mouseBufferTimer) {
    clearTimeout(mouseBufferTimer);
    mouseBufferTimer = null;
  }

  // Send any remaining mouse data
  await sendMouseDataBuffer();

  // Stop mouse tracking
  if (global.mouseTrackingInterval) {
    clearInterval(global.mouseTrackingInterval);
    global.mouseTrackingInterval = null;
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