// client-agent/main.js
const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
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
const AutoLaunch = require('auto-launch');

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

const SERVER_URL = process.env.SERVER_URL || 'http://103.130.11.114:3001';

// Configure auto-launch
const autoLauncher = new AutoLaunch({
  name: 'ODL Portal',
  path: app.getPath('exe'),
});

// Enable auto-launch on startup
autoLauncher.isEnabled().then((isEnabled) => {
  if (!isEnabled) autoLauncher.enable();
}).catch((err) => {
  console.error('Auto-launch error:', err);
});

let mainWindow = null;
let tray = null;
let socket = null;
let streamingInterval = null;
let screenshotInterval = null;
let currentUser = null;
let cachedDeviceIdentifier = null;
let currentStreamScreen = 0; // Track which screen is being streamed
let currentSettings = {
  screenshotEnabled: true,
  screenshotInterval: 6000,
  streamingEnabled: true,
  doubleScreenEnabled: false,
  screenShowEnabled: true
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

async function createWindow() {
  const { nativeImage } = require('electron');
  const iconPath = path.join(__dirname, 'assets', 'octopi-logo.webp');
  
  mainWindow = new BrowserWindow({
    width: 320,
    height: 220,
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Remove the menu bar completely
  mainWindow.setMenu(null);

  mainWindow.loadFile('index.html');
  
  mainWindow.on('close', (event) => {
    event.preventDefault();
    // Automatically minimize to system tray
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create system tray
  createTray();

  // Check if device is already registered
  await checkDeviceRegistration();
}

// Check if device is registered and auto-login
async function checkDeviceRegistration() {
  try {
    const deviceId = await getDeviceIdentifier();
    
    // Check if device is registered in the server
    const response = await axios.get(`${SERVER_URL}/api/device/check/${deviceId}`);
    
    if (response.data.success && response.data.registered) {
      // Device is registered, auto-login
      const userData = response.data.user;
      currentUser = {
        id: userData.id || userData.userId,
        userId: userData.userId || userData.id,
        deviceId: userData.deviceId,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        photoUrl: userData.photoUrl,
        computerName: userData.computerName
      };
      
      // Show dashboard
      mainWindow.webContents.send('show-dashboard', {
        name: currentUser.name,
        email: currentUser.email,
        photoUrl: currentUser.photoUrl
      });
      
      // Fetch current settings from server
      try {
        const settingsResponse = await axios.get(`${SERVER_URL}/api/settings`);
        if (settingsResponse.data.success) {
          currentSettings = { ...currentSettings, ...settingsResponse.data.settings };
          console.log('✅ Loaded global settings:', currentSettings);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error.message);
      }
      
      // Start tracking that doesn't depend on settings
      startAppTracking();
      startMouseTracking();
      startKeystrokeTracking();
      
      // Connect to socket first - it will send user-specific settings
      // Screenshot capture will be started after receiving settings via socket
      console.log('🔌 Connecting to socket...');
      connectSocket();
    } else {
      // Device not registered, show login screen
      mainWindow.webContents.send('show-login');
    }
  } catch (error) {
    console.error('Error checking device registration:', error.message);
    // Show login screen on error
    mainWindow.webContents.send('show-login');
  }
}

// Connect to socket
function connectSocket() {
  if (!socket && currentUser) {
    socket = io(SERVER_URL);

    socket.on('connect', () => {
      socket.emit('register', { deviceId: currentUser.deviceId });
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
      startStreamHandler(data);
    });

    socket.on('stop_stream', () => {
      if (streamingInterval) {
        clearInterval(streamingInterval);
        streamingInterval = null;
      }
      currentStreamScreen = 0;
    });

    socket.on('switch_screen', (data) => {
      console.log('switch_screen event received:', data);
      if (data.screenIndex !== undefined) {
        currentStreamScreen = data.screenIndex;
        console.log('Updated currentStreamScreen to:', currentStreamScreen);
      }
    });

    socket.on('start_screenshot', (data) => {
      startScreenshotHandler(data);
    });

    socket.on('stop_screenshot', () => {
      if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
      }
    });

    socket.on('settings_updated', (newSettings) => {
      console.log('📥 Received settings_updated:', newSettings);
      const isInitialSettings = !screenshotInterval && newSettings.screenShowEnabled !== undefined;
      handleSettingsUpdate(newSettings);
      
      // Start screenshot capture on initial settings if not already running
      if (isInitialSettings && currentUser && currentSettings.screenshotEnabled && currentSettings.screenShowEnabled) {
        console.log('🚀 Starting screenshot capture with initial settings');
        startScreenshotCapture();
      }
    });

    socket.on('screen_show_updated', (data) => {
      const wasEnabled = currentSettings.screenShowEnabled;
      currentSettings.screenShowEnabled = data.screenShowEnabled;
      
      console.log(`📺 Screen show updated: ${data.screenShowEnabled ? 'ENABLED' : 'DISABLED'}`);
      
      // Update UI
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-update', {
          isOnline: true,
          screenshotEnabled: currentSettings.screenshotEnabled,
          screenshotInterval: currentSettings.screenshotInterval,
          streamingEnabled: currentSettings.streamingEnabled,
          doubleScreenEnabled: currentSettings.doubleScreenEnabled,
          screenShowEnabled: currentSettings.screenShowEnabled
        });
      }
      
      // Handle screenshot capture based on new setting
      if (data.screenShowEnabled && !wasEnabled) {
        // Re-enabled: Start screenshot capture if screenshots are enabled
        if (currentSettings.screenshotEnabled && currentUser) {
          console.log('🔄 Restarting screenshot capture after screen show enabled');
          startScreenshotCapture();
        }
      } else if (!data.screenShowEnabled && screenshotInterval) {
        // Disabled: Stop screenshot capture
        console.log('⏸️ Stopping screenshot capture (screen show disabled)');
        clearInterval(screenshotInterval);
        screenshotInterval = null;
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
  }
}

// Stream handler
function startStreamHandler(data) {
  if (!currentSettings.streamingEnabled) {
    return;
  }

  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }
  
  // Set the screen index if provided
  if (data.screenIndex !== undefined) {
    currentStreamScreen = data.screenIndex;
  }
  
  streamingInterval = setInterval(async () => {
    try {
      const displays = screen.getAllDisplays();
      let imgBuffer;
      
      if (currentSettings.doubleScreenEnabled && displays.length > 1) {
        // Capture specific screen if multiple displays exist
        const displayIndex = Math.min(currentStreamScreen, displays.length - 1);
        
        // Get available screenshot displays
        const screens = await screenshot.listDisplays();
        
        // Use the screen ID from the listDisplays result
        const targetScreen = screens[displayIndex];
        imgBuffer = await screenshot({ screen: targetScreen.id, format: 'jpeg' });
      } else {
        // Capture primary screen (index 0)
        imgBuffer = await screenshot({ screen: 0, format: 'jpeg' });
      }
      
      const base64Image = imgBuffer.toString('base64');
      socket.emit('stream_data', { 
        image: base64Image, 
        adminId: data.adminId,
        screenIndex: currentStreamScreen,
        totalScreens: displays.length
      });
    } catch (error) {
      console.error('Screenshot error:', error);
    }
  }, 1000);
}

// Screenshot handler
function startScreenshotHandler(data) {
  if (!currentSettings.screenshotEnabled || !currentSettings.screenShowEnabled) {
    return;
  }

  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  const interval = data.interval || currentSettings.screenshotInterval || 6000;

  screenshotInterval = setInterval(async () => {
    try {
      const imgBuffer = await screenshot({ format: 'png' });
      const base64Image = imgBuffer.toString('base64');

      await axios.post(`${SERVER_URL}/api/screenshots`, {
        userId: currentUser.id,
        deviceId: currentUser.deviceId,
        image: base64Image,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to capture screenshot:', error.message);
    }
  }, interval);
}

// Handle settings update
function handleSettingsUpdate(newSettings) {
  console.log('Settings updated:', newSettings);
  
  const oldSettings = { ...currentSettings };
  currentSettings = { ...currentSettings, ...newSettings };

  // Handle screenshot interval change
  if (oldSettings.screenshotInterval !== currentSettings.screenshotInterval) {
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
      
      if (currentSettings.screenshotEnabled && currentSettings.screenShowEnabled) {
        startScreenshotHandler({ interval: currentSettings.screenshotInterval });
      }
    }
  }

  // Handle screenshot enabled/disabled or screenShowEnabled change
  if (oldSettings.screenshotEnabled !== currentSettings.screenshotEnabled || 
      oldSettings.screenShowEnabled !== currentSettings.screenShowEnabled) {
    if (currentSettings.screenshotEnabled && currentSettings.screenShowEnabled) {
      startScreenshotHandler({ interval: currentSettings.screenshotInterval });
    } else {
      if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
      }
    }
  }

  // Notify renderer about settings change
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', {
      isOnline: socket && socket.connected,
      screenshotEnabled: currentSettings.screenshotEnabled,
      screenshotInterval: currentSettings.screenshotInterval,
      streamingEnabled: currentSettings.streamingEnabled,
      screenShowEnabled: currentSettings.screenShowEnabled
    });
  }
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
      
      // Fetch current settings from server
      try {
        const settingsResponse = await axios.get(`${SERVER_URL}/api/settings`);
        if (settingsResponse.data.success) {
          currentSettings = { ...currentSettings, ...settingsResponse.data.settings };
          console.log('Loaded settings:', currentSettings);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error.message);
      }
      
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
          
          // Set the screen index if provided
          if (data.screenIndex !== undefined) {
            currentStreamScreen = data.screenIndex;
          }
          
          let frameCount = 0;
          
          streamingInterval = setInterval(async () => {
            try {
              const displays = screen.getAllDisplays();
              let imgBuffer;
              
              if (currentSettings.doubleScreenEnabled && displays.length > 1) {
                // Capture specific screen if multiple displays exist
                const displayIndex = Math.min(currentStreamScreen, displays.length - 1);
                if (frameCount % 10 === 0) { // Log every 10th frame to avoid spam
                  console.log(`[Signup Stream] Capturing screen ${displayIndex} (currentStreamScreen: ${currentStreamScreen}, total displays: ${displays.length})`);
                }
                
                // Try using all available options for the screenshot library
                try {
                  imgBuffer = await screenshot({ format: 'jpeg' }).then(async () => {
                    const screens = await screenshot.listDisplays();
                    return await screenshot({ screen: screens[displayIndex], format: 'jpeg' });
                  }).catch(async (err) => {
                    return await screenshot({ screen: displayIndex, format: 'jpeg' });
                  });
                } catch (err) {
                  imgBuffer = await screenshot({ screen: displays[displayIndex].id, format: 'jpeg' });
                }
              } else {
                // Capture primary screen (index 0)
                imgBuffer = await screenshot({ screen: 0, format: 'jpeg' });
              }
              
              const base64Image = imgBuffer.toString('base64');
              frameCount++;
              socket.emit('stream_data', { 
                image: base64Image, 
                adminId: data.adminId,
                screenIndex: currentStreamScreen,
                totalScreens: displays.length
              });
            } catch (error) {
              console.error('Screenshot error:', error);
            }
          }, 1000);
        });

        socket.on('stop_stream', (data) => {
          if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
          }
          currentStreamScreen = 0; // Reset to primary screen
        });

        socket.on('switch_screen', (data) => {
          console.log('switch_screen event received:', data);
          if (data.screenIndex !== undefined) {
            currentStreamScreen = data.screenIndex;
            console.log('Updated currentStreamScreen to:', currentStreamScreen);
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
      
      // Fetch current settings from server
      try {
        const settingsResponse = await axios.get(`${SERVER_URL}/api/settings`);
        if (settingsResponse.data.success) {
          currentSettings = { ...currentSettings, ...settingsResponse.data.settings };
          console.log('Loaded settings:', currentSettings);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error.message);
      }
      
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
          
          // Set the screen index if provided
          if (data.screenIndex !== undefined) {
            currentStreamScreen = data.screenIndex;
          }
          
          let frameCount = 0;
          
          streamingInterval = setInterval(async () => {
            try {
              const displays = screen.getAllDisplays();
              let imgBuffer;
              
              // Debug logging every frame to understand the issue
              console.log(`[Stream Debug] doubleScreenEnabled: ${currentSettings.doubleScreenEnabled}, displays: ${displays.length}, currentStreamScreen: ${currentStreamScreen}`);
              
              if (currentSettings.doubleScreenEnabled && displays.length > 1) {
                // Capture specific screen if multiple displays exist
                const displayIndex = Math.min(currentStreamScreen, displays.length - 1);
                console.log(`[Login Stream] Capturing screen ${displayIndex}`);
                
                // Get available screenshot displays
                const screens = await screenshot.listDisplays();
                console.log('Available screenshot screens:', screens);
                
                // Use the screen ID from the listDisplays result
                const targetScreen = screens[displayIndex];
                console.log(`Using screen ID: ${targetScreen.id}`);
                imgBuffer = await screenshot({ screen: targetScreen.id, format: 'jpeg' });
              } else {
                console.log(`[Login Stream] Capturing primary screen (doubleScreen: ${currentSettings.doubleScreenEnabled}, displays: ${displays.length})`);
                // Capture primary screen (index 0)
                imgBuffer = await screenshot({ screen: 0, format: 'jpeg' });
              }
              
              const base64Image = imgBuffer.toString('base64');
              frameCount++;
              socket.emit('stream_data', { 
                image: base64Image, 
                adminId: data.adminId,
                screenIndex: currentStreamScreen,
                totalScreens: displays.length
              });
            } catch (error) {
              console.error('Screenshot error:', error);
            }
          }, 1000);
        });

        socket.on('stop_stream', (data) => {
          if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
          }
          currentStreamScreen = 0; // Reset to primary screen
        });

        socket.on('switch_screen', (data) => {
          console.log('switch_screen event received (login):', data);
          if (data.screenIndex !== undefined) {
            currentStreamScreen = data.screenIndex;
            console.log('Updated currentStreamScreen to:', currentStreamScreen);
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

    const displays = screen.getAllDisplays();
    console.log(`[Screenshot Debug] doubleScreenEnabled: ${currentSettings.doubleScreenEnabled}, displays: ${displays.length}`);
    
    // Check if dual screen is enabled and multiple displays exist
    if (currentSettings.doubleScreenEnabled && displays.length > 1) {
      console.log('[Screenshot Debug] Capturing multiple screens...');
      // Capture all screens
      const screens = await screenshot.listDisplays();
      
      for (let i = 0; i < screens.length; i++) {
        try {
          const imgBuffer = await screenshot({ screen: screens[i].id, format: 'jpeg' });
          const base64Image = imgBuffer.toString('base64');
          
          // Upload each screen separately
          await axios.post(`${SERVER_URL}/api/screenshots`, {
            userId: currentUser.userId || currentUser.id,
            deviceId: currentUser.deviceId,
            username: currentUser.username,
            computerName: currentUser.computerName,
            imageData: `data:image/jpeg;base64,${base64Image}`,
            screenIndex: i,
            totalScreens: screens.length
          });
          console.log(`✓ Screenshot uploaded successfully (Screen ${i + 1}/${screens.length})`);
        } catch (screenError) {
          console.error(`✗ Failed to upload screenshot for screen ${i}:`, screenError.response?.data || screenError.message);
        }
      }
    } else {
      console.log('[Screenshot Debug] Capturing single screen only');
      // Capture only primary screen
      const imgBuffer = await screenshot({ format: 'jpeg' });
      const base64Image = imgBuffer.toString('base64');
      
      // Upload to server
      await axios.post(`${SERVER_URL}/api/screenshots`, {
        userId: currentUser.userId || currentUser.id,
        deviceId: currentUser.deviceId,
        username: currentUser.username,
        computerName: currentUser.computerName,
        imageData: `data:image/jpeg;base64,${base64Image}`
      });
      console.log('✓ Screenshot uploaded successfully');
    }
  } catch (error) {
    console.error('✗ Failed to upload screenshot:', error.response?.data || error.message);
  }
}

// Function to start screenshot capture with current settings
function startScreenshotCapture() {
  console.log('📸 startScreenshotCapture called');
  console.log('   - screenshotEnabled:', currentSettings.screenshotEnabled);
  console.log('   - screenShowEnabled:', currentSettings.screenShowEnabled);
  console.log('   - screenshotInterval:', currentSettings.screenshotInterval);
  console.log('   - currentUser:', currentUser ? 'YES' : 'NO');
  
  // Stop existing interval if any
  if (screenshotInterval) {
    console.log('   - Clearing existing screenshot interval');
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  if (!currentSettings.screenshotEnabled || !currentSettings.screenShowEnabled) {
    console.log('   ⚠️ Screenshot capture NOT started (disabled)');
    return;
  }
  
  console.log('   ✅ Starting screenshot capture...');
  
  // Take first screenshot immediately
  captureAndUploadScreenshot();
  
  // Then continue at the specified interval
  screenshotInterval = setInterval(captureAndUploadScreenshot, currentSettings.screenshotInterval);
  console.log('   ✅ Screenshot interval set:', currentSettings.screenshotInterval, 'ms');
}

// Function to handle settings updates from admin
function handleSettingsUpdate(settings) {
  const oldSettings = { ...currentSettings };
  currentSettings = { ...currentSettings, ...settings };

  console.log('⚙️ Settings updated:', settings);

  // Handle screenshot settings changes
  if (oldSettings.screenshotEnabled !== currentSettings.screenshotEnabled ||
      oldSettings.screenshotInterval !== currentSettings.screenshotInterval ||
      oldSettings.screenShowEnabled !== currentSettings.screenShowEnabled ||
      oldSettings.doubleScreenEnabled !== currentSettings.doubleScreenEnabled) {
    
    if (currentUser) {
      console.log('🔄 Restarting screenshot capture with new settings');
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
      streamingEnabled: currentSettings.streamingEnabled,
      doubleScreenEnabled: currentSettings.doubleScreenEnabled,
      screenShowEnabled: currentSettings.screenShowEnabled
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

    // Stop app tracking
    stopAppTracking();
    
    // Stop mouse tracking
    stopMouseTracking();
    
    // Stop keystroke tracking
    stopKeystrokeTracking();

    // Emit logout event to set user offline
    if (socket && socket.connected) {
      socket.emit('logout', { deviceId });
      socket.disconnect();
    }

    // Update offline status via API and unregister device
    try {
      await axios.post(`${SERVER_URL}/api/device/unregister`, { deviceId });
    } catch (error) {
      console.error('Failed to unregister device:', error.message);
    }

    // Clear socket and user
    socket = null;
    currentUser = null;

    // Notify renderer
    mainWindow.webContents.send('logout-complete');

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to logout' };
  }
});

// Handle login with external API credentials
ipcMain.handle('login-with-credentials', async (event, { email, password }) => {
  try {
    // Call the external API
    const loginResponse = await axios.post('https://server.octopi-digital.com/api/auth/login', {
      email,
      password
    });

    if (loginResponse.status === 200 && loginResponse.data.user) {
      const userData = loginResponse.data.user;
      const deviceId = await getDeviceIdentifier();
      const computerName = os.hostname();

      // Extract name from firstName and lastName
      const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      
      // Register device in our database
      const registerResponse = await axios.post(`${SERVER_URL}/api/device/register`, {
        deviceId,
        userId: userData._id,
        email: userData.email,
        name: name,
        photoUrl: userData.photoUrl || '',
        computerName
      });

      if (registerResponse.data.success) {
        const userData = registerResponse.data.user;
        currentUser = {
          id: userData.id || userData.userId,
          userId: userData.userId || userData.id,
          deviceId: userData.deviceId,
          email: userData.email,
          username: userData.username,
          name: userData.name,
          photoUrl: userData.photoUrl,
          computerName: userData.computerName
        };

        // Fetch current settings from server
        try {
          const settingsResponse = await axios.get(`${SERVER_URL}/api/settings`);
          if (settingsResponse.data.success) {
            currentSettings = { ...currentSettings, ...settingsResponse.data.settings };
            console.log('Loaded settings:', currentSettings);
          }
        } catch (error) {
          console.error('Failed to fetch settings:', error.message);
        }

        // Start all tracking
        startAppTracking();
        startScreenshotCapture();
        startMouseTracking();
        startKeystrokeTracking();

        // Connect to socket
        connectSocket();

        return {
          success: true,
          user: {
            name: currentUser.name,
            email: currentUser.email,
            photoUrl: currentUser.photoUrl
          }
        };
      } else {
        return { success: false, message: 'Failed to register device' };
      }
    } else {
      return { success: false, message: 'Wrong credentials' };
    }
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    if (error.response?.status === 401 || error.response?.status === 400) {
      return { success: false, message: 'Wrong credentials' };
    }
    return { success: false, message: 'Login failed. Please try again.' };
  }
});

// Handle window resize
ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
    mainWindow.center();
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
      userId: currentUser.userId || currentUser.id,
      deviceId: currentUser.deviceId,
      username: currentUser.username,
      sessionId: mouseTrackingData.sessionId,
      movements: mouseTrackingData.movements,
      clicks: mouseTrackingData.clicks,
      scrolls: mouseTrackingData.scrolls,
      screenResolution: mouseTrackingData.screenResolution
    });

    console.log('✓ Mouse tracking data uploaded successfully');
    // Clear data after successful upload
    mouseTrackingData.movements = [];
    mouseTrackingData.clicks = [];
    mouseTrackingData.scrolls = [];
  } catch (error) {
    console.error('✗ Failed to upload mouse tracking data:', error.response?.data || error.message);
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
      userId: currentUser.userId || currentUser.id,
      deviceId: currentUser.deviceId,
      username: currentUser.username,
      sessionId: keystrokeTrackingData.sessionId,
      keystrokes: keystrokeTrackingData.keystrokes,
      totalCount: keystrokeTrackingData.keystrokes.length,
      appBreakdown: appBreakdownArray,
      screenResolution: keystrokeTrackingData.screenResolution
    });

    console.log('✓ Keystroke data uploaded successfully');
    
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
    
    // Check if the script file exists
    if (!fs.existsSync(scriptPath)) {
      console.error('PowerShell script not found at:', scriptPath);
      return null;
    }
    
    const { stdout, stderr } = await execPromise(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "& '${scriptPath}'"`,
      { timeout: 5000 }
    );
    
    if (stderr && stderr.trim()) {
      console.error('PowerShell stderr:', stderr);
    }
    
    const output = stdout.trim();
    if (!output) {
      console.warn('Empty output from PowerShell script');
      return null;
    }
    
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
    // Return a fallback value instead of null to keep tracking working
    return {
      owner: { name: 'Unknown' },
      title: ''
    };
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

  // Set user offline and unregister device
  if (currentUser && socket && socket.connected) {
    socket.emit('logout', { deviceId: currentUser.deviceId });
    
    // Unregister device from the database
    try {
      await axios.post(`${SERVER_URL}/api/device/unregister`, { 
        deviceId: currentUser.deviceId 
      });
      console.log('Device unregistered successfully');
    } catch (error) {
      console.error('Failed to unregister device:', error.message);
    }
    
    socket.disconnect();
  }
}

// Create system tray
function createTray() {
  const { nativeImage } = require('electron');
  
  // Use octopi-logo.webp from assets folder
  const iconPath = path.join(__dirname, 'assets', 'octopi-logo.webp');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a simple placeholder icon
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('ODL Portal');
  tray.setContextMenu(contextMenu);
  
  // Double click to show/hide window
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // Handle second instance attempt
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed (keep running in tray)
  // User must explicitly exit from tray menu
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