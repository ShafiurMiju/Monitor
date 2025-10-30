// client-agent/main.js
const { app } = require('electron');
const { io } = require("socket.io-client");
const macaddress = require('macaddress');
const screenshot = require('screenshot-desktop');

let streamingInterval = null;

async function startAgent() {
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  const macAddress = await macaddress.one();
  // DEBUG 1: Check if we got the MAC address correctly.
  console.log(`Retrieved MAC Address: ${macAddress}`); // <-- ADD THIS

  const socket = io("http://localhost:4000");

  socket.on('connect', () => {
    console.log("Agent has connected to the server!");
    
    // DEBUG 2: Check what we are about to send to the server.
    console.log(`Registering with MAC: ${macAddress}`); // <-- ADD THIS
    socket.emit('register', { macAddress });
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
    clearInterval(streamingInterval);
  });
}

app.whenReady().then(startAgent);

app.on('window-all-closed', (e) => e.preventDefault());