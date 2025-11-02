// admin-dashboard/src/App.jsx
import React, { useEffect, useState } from 'react';
import { io } from "socket.io-client";
import axios from 'axios';
import './App.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

console.log('🌐 Connecting to server:', SERVER_URL);
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
}); // Connect to our server

socket.on('connect', () => {
  console.log('✅ Admin dashboard connected to server, Socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Admin dashboard disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [liveImage, setLiveImage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const streamContainerRef = React.useRef(null);
  const frameCountRef = React.useRef(0);
  const lastFrameTimeRef = React.useRef(null);

  // Fetch users from the server
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/users`);
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Listen for user status changes
    socket.on('user_status_changed', () => {
      fetchUsers();
    });

    // Listen for the 'new_frame' event from the server
    socket.on('new_frame', (data) => {
      console.log(`📸 Received frame from server (${data.image.length} bytes)`);
      setLiveImage(`data:image/jpeg;base64,${data.image}`);
      setConnectionStatus('streaming');
      setIsSwitching(false);
      frameCountRef.current += 1;
      lastFrameTimeRef.current = Date.now();
    });

    // Listen for stream errors
    socket.on('stream_error', (data) => {
      alert(data.message);
      socket.emit('admin_stop_stream');
      setIsStreaming(false);
      setSelectedUser(null);
      setLiveImage('');
      setConnectionStatus('error');
      setIsSwitching(false);
    });

    // Listen for stream switch confirmation
    socket.on('stream_switched', (data) => {
      console.log(`🔄 Stream switched to device: ${data.deviceId}`);
      setConnectionStatus('connecting');
    });

    // Clean up listeners when component unmounts
    return () => {
      socket.off('user_status_changed');
      socket.off('new_frame');
      socket.off('stream_error');
      socket.off('stream_switched');
    };
  }, []);

  const startMonitoring = (user) => {
    if (!user.isOnline) {
      alert('User is offline!');
      return;
    }
    
    if (!user.isStreaming) {
      alert('User has not started monitoring yet!');
      return;
    }

    // Check if already viewing this user
    if (isStreaming && selectedUser && selectedUser.deviceId === user.deviceId) {
      console.log('Already viewing this user');
      return;
    }

    // Handle switching between users
    if (isStreaming && selectedUser && selectedUser.deviceId !== user.deviceId) {
      console.log(`🔄 Switching from ${selectedUser.username} to ${user.username}`);
      setIsSwitching(true);
      setConnectionStatus('switching');
      socket.emit('admin_stop_stream');
    }

    setSelectedUser(user);
    setIsStreaming(true);
    setLiveImage('');
    setConnectionStatus('connecting');
    frameCountRef.current = 0;
    lastFrameTimeRef.current = null;
    
    console.log(`📡 Admin requesting stream for device: ${user.deviceId}`);
    console.log(`Socket connected: ${socket.connected}`);
    socket.emit('request_stream', { targetDeviceId: user.deviceId });
  };

  const stopMonitoring = () => {
    if (isStreaming && selectedUser) {
      console.log(`⏹️ Stopping stream for ${selectedUser.username}`);
      socket.emit('admin_stop_stream');
    }

    // Exit fullscreen if in fullscreen mode
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    setIsStreaming(false);
    setSelectedUser(null);
    setLiveImage('');
    setConnectionStatus('idle');
    setIsSwitching(false);
    frameCountRef.current = 0;
    lastFrameTimeRef.current = null;
  };

  const toggleFullscreen = async () => {
    if (!streamContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await streamContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut for fullscreen (F key)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isStreaming && liveImage && (e.key === 'f' || e.key === 'F')) {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isStreaming, liveImage]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>🎯 ODL Monitor - Admin Dashboard</h1>
      </header>

      <div className="dashboard-content">
        {/* User List Section */}
        <div className="users-section">
          <h2>Registered Users</h2>
          {loading ? (
            <p className="loading">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="no-users">No registered users yet</p>
          ) : (
            <div className="users-list">
              {users.map((user) => (
                <div 
                  key={user._id} 
                  className={`user-card ${selectedUser?._id === user._id ? 'selected' : ''}`}
                >
                  <div className="user-info">
                    <div className="user-header">
                      <h3>{user.username}</h3>
                      <div className="status-badges">
                        <span className={`status-badge ${user.isOnline ? 'online' : 'offline'}`}>
                          {user.isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                        {user.isStreaming && (
                          <span className="status-badge streaming">
                            📡 Streaming
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="user-detail">📧 {user.email}</p>
                    <p className="user-detail">💻 {user.computerName}</p>
                    <p className="user-detail mac">🔗 {user.deviceId}</p>
                    {!user.isOnline && user.lastSeen && (
                      <p className="last-seen">
                        Last seen: {new Date(user.lastSeen).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button 
                    className={`stream-btn ${
                      !user.isOnline || !user.isStreaming ? 'disabled' : ''
                    }`}
                    onClick={() => startMonitoring(user)}
                    disabled={!user.isOnline || !user.isStreaming}
                  >
                    {isStreaming && selectedUser?._id === user._id 
                      ? '📺 Viewing' 
                      : '👁️ View Stream'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Stream Section */}
        <div className="stream-section">
          <div className="stream-header">
            <h2>Live Stream</h2>
            <div className="stream-controls">
              {isStreaming && selectedUser && liveImage && (
                <button className="fullscreen-btn" onClick={toggleFullscreen}>
                  {isFullscreen ? '🗙 Exit Fullscreen' : '⛶ Fullscreen'}
                </button>
              )}
              {isStreaming && selectedUser && (
                <button className="stop-stream-btn" onClick={stopMonitoring}>
                  ⏹️ Stop Viewing
                </button>
              )}
            </div>
          </div>
          
          <div className="stream-container" ref={streamContainerRef}>
            {!isStreaming ? (
              <div className="stream-placeholder">
                <p>👆 Select an online user with streaming enabled to view their screen</p>
              </div>
            ) : liveImage ? (
              <>
                <img 
                  src={liveImage} 
                  alt="Live Stream" 
                  className={`live-stream-image ${isSwitching ? 'switching' : ''}`}
                />
                {isSwitching && (
                  <div className="switching-overlay">
                    <div className="switching-spinner"></div>
                    <p>🔄 Switching stream...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="stream-loading">
                {connectionStatus === 'switching' ? (
                  <>
                    <div className="switching-spinner"></div>
                    <p>🔄 Switching to {selectedUser?.username}...</p>
                  </>
                ) : (
                  <>
                    <div className="loading-spinner"></div>
                    <p>⏳ Connecting to {selectedUser?.username}...</p>
                  </>
                )}
              </div>
            )}
          </div>

          {selectedUser && isStreaming && (
            <div className="stream-info">
              <p>
                <strong>Viewing:</strong> {selectedUser.username} ({selectedUser.computerName})
                {liveImage && (
                  <span className="stream-stats">
                    {' • '}
                    <span className={`status-indicator ${connectionStatus === 'streaming' ? 'active' : ''}`}>
                      ⚫
                    </span>
                    {' '}
                    {connectionStatus === 'streaming' ? 'Live' : 'Connecting...'}
                    {frameCountRef.current > 0 && ` • ${frameCountRef.current} frames`}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;