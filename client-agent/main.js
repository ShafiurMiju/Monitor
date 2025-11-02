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
  console.log(`✅ Loaded environment: ${environment}`);
} else {
  console.log(`⚠️ No .env.${environment} file found, using default values`);
}

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
console.log(`🌐 Server URL: ${SERVER_URL}`);
let mainWindow = null;
let socket = null;
let streamingInterval = null;
let currentUser = null;
let cachedDeviceIdentifier = null;

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
    console.warn('Unable to resolve machine ID from OS:', error);
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
      return { success: true, user: response.data.user };
    } else {
      return { success: false, message: response.data.message };
    }
  } catch (error) {
    console.error('Signup error:', error);
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
      return { success: true, user: response.data.user };
    } else {
      return { success: false, message: response.data.message };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Login failed' 
    };
  }
});

// Handle start monitoring
ipcMain.handle('start-monitoring', async (event) => {
  try {
    if (!currentUser) {
      return { success: false, message: 'Not logged in' };
    }

    // Connect to socket if not already connected
    if (!socket) {
      socket = io(SERVER_URL);

      socket.on('connect', () => {
        console.log("✅ Agent has connected to the server!");
  console.log(`📡 Registering with device ID: ${currentUser.deviceId}`);
  socket.emit('register', { deviceId: currentUser.deviceId });
      });

      socket.on('start_stream', (data) => {
        console.log('🎥 Server requested stream for admin:', data.adminId);
        
        if (streamingInterval) {
          console.log('⚠️ Clearing existing streaming interval before starting new stream...');
          clearInterval(streamingInterval);
          streamingInterval = null;
        }
        
        console.log('✅ Starting screen capture interval (1 frame/sec)...');
        let frameCount = 0;
        
        streamingInterval = setInterval(async () => {
          try {
            const imgBuffer = await screenshot({ format: 'jpeg' });
            const base64Image = imgBuffer.toString('base64');
            frameCount++;
            console.log(`📸 Frame #${frameCount}: Captured and sending (${base64Image.length} bytes) to admin: ${data.adminId}`);
            socket.emit('stream_data', { image: base64Image, adminId: data.adminId });
          } catch (error) {
            console.error("❌ Failed to capture screen:", error);
          }
        }, 1000);
      });

      socket.on('stop_stream', (data) => {
        console.log('🛑 Server requested to stop stream.', data ? `(Admin: ${data.adminId})` : '');
        if (streamingInterval) {
          clearInterval(streamingInterval);
          streamingInterval = null;
          console.log('✅ Streaming stopped successfully');
        } else {
          console.log('ℹ️ No active stream to stop');
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });
    }

    // Emit start monitoring event
  socket.emit('start_monitoring', { deviceId: currentUser.deviceId });

    return { success: true, message: 'Monitoring started' };
  } catch (error) {
    console.error('Start monitoring error:', error);
    return { success: false, message: 'Failed to start monitoring' };
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

    // Emit stop monitoring event
  socket.emit('stop_monitoring', { deviceId: currentUser.deviceId });

    return { success: true, message: 'Monitoring stopped' };
  } catch (error) {
    console.error('Stop monitoring error:', error);
    return { success: false, message: 'Failed to stop monitoring' };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});