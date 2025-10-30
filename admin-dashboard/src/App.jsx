// admin-dashboard/src/App.js
import React, { useEffect, useState } from 'react';
import { io } from "socket.io-client";

const socket = io("http://localhost:4000"); // Connect to our server

function App() {
  const [liveImage, setLiveImage] = useState('');

  useEffect(() => {
    // Listen for the 'new_frame' event from the server
    socket.on('new_frame', (data) => {
      // The image data arrives as base64, so we format it for an <img> tag
      setLiveImage(`data:image/jpeg;base64,${data.image}`);
    });

    // Clean up the listener when the component unmounts
    return () => {
      socket.off('new_frame');
    };
  }, []); // The empty array [] means this runs only once on component mount

  const startMonitoring = () => {
    // IMPORTANT: Replace this with the MAC address of the PC running the client-agent
    const macToMonitor = "0a:00:27:00:00:13"; 
    console.log(`Requesting stream for: ${macToMonitor}`);
    socket.emit('request_stream', { targetMacAddress: macToMonitor });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <button onClick={startMonitoring}>Show Live Screen</button>
      <hr style={{ margin: '20px 0' }} />
      <h3>Live Feed</h3>
      {liveImage ? (
        <img src={liveImage} alt="Live Stream" style={{ width: '80%', border: '1px solid black' }} />
      ) : (
        <p>Click the button to start the stream.</p>
      )}
    </div>
  );
}

export default App;