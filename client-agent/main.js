// client-agent/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { io } = require("socket.io-client");
const macaddress = require('macaddress');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const os = require('os');
const config = require('./config');

const SERVER_URL = config.SERVER_URL;
let mainWindow = null;
let socket = null;
let streamingInterval = null;
let currentUser = null;

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
    const macAddress = await macaddress.one();
    const computerName = os.hostname();
    
    const response = await axios.post(`${SERVER_URL}/api/signup`, {
      ...data,
      macAddress,
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
    const macAddress = await macaddress.one();
    
    const response = await axios.post(`${SERVER_URL}/api/login`, {
      ...data,
      macAddress
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
        console.log("Agent has connected to the server!");
        socket.emit('register', { macAddress: currentUser.macAddress });
      });

      socket.on('start_stream', (data) => {
        console.log('Server requested stream for admin:', data.adminId);
        
        if (streamingInterval) clearInterval(streamingInterval);
        
        streamingInterval = setInterval(async () => {
          try {
            const imgBuffer = await screenshot({ format: 'jpeg' });
            const base64Image = imgBuffer.toString('base64');
            socket.emit('stream_data', { image: base64Image, adminId: data.adminId });
          } catch (error) {
            console.error("Failed to capture screen:", error);
          }
        }, 1000);
      });

      socket.on('stop_stream', () => {
        console.log('Server requested to stop stream.');
        if (streamingInterval) {
          clearInterval(streamingInterval);
          streamingInterval = null;
        }
      });
    }

    // Emit start monitoring event
    socket.emit('start_monitoring', { macAddress: currentUser.macAddress });

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
    socket.emit('stop_monitoring', { macAddress: currentUser.macAddress });

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