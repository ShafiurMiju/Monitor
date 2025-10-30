// admin-dashboard/src/App.jsx
import React, { useEffect, useState } from 'react';
import { io } from "socket.io-client";
import axios from 'axios';
import './App.css';

const socket = io("http://localhost:4000"); // Connect to our server
const SERVER_URL = "http://localhost:4000";

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [liveImage, setLiveImage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setLiveImage(`data:image/jpeg;base64,${data.image}`);
    });

    // Listen for stream errors
    socket.on('stream_error', (data) => {
      alert(data.message);
      stopMonitoring();
    });

    // Clean up listeners when component unmounts
    return () => {
      socket.off('user_status_changed');
      socket.off('new_frame');
      socket.off('stream_error');
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

    setSelectedUser(user);
    setIsStreaming(true);
    setLiveImage('');
    console.log(`Requesting stream for: ${user.macAddress}`);
    socket.emit('request_stream', { targetMacAddress: user.macAddress });
  };

  const stopMonitoring = () => {
    setIsStreaming(false);
    setSelectedUser(null);
    setLiveImage('');
  };

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
                    <p className="user-detail mac">🔗 {user.macAddress}</p>
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
                    disabled={!user.isOnline || !user.isStreaming || isStreaming}
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
            {isStreaming && selectedUser && (
              <button className="stop-stream-btn" onClick={stopMonitoring}>
                ⏹️ Stop Viewing
              </button>
            )}
          </div>
          
          <div className="stream-container">
            {!isStreaming ? (
              <div className="stream-placeholder">
                <p>👆 Select an online user with streaming enabled to view their screen</p>
              </div>
            ) : liveImage ? (
              <img 
                src={liveImage} 
                alt="Live Stream" 
                className="live-stream-image"
              />
            ) : (
              <div className="stream-loading">
                <p>⏳ Connecting to stream...</p>
              </div>
            )}
          </div>

          {selectedUser && isStreaming && (
            <div className="stream-info">
              <p><strong>Viewing:</strong> {selectedUser.username} ({selectedUser.computerName})</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;