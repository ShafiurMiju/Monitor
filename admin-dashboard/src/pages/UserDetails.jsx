// admin-dashboard/src/pages/UserDetails.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

function UserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [liveImage, setLiveImage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const streamContainerRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/api/users`);
        if (response.data.success) {
          const foundUser = response.data.users.find(u => u._id === userId);
          setUser(foundUser);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/api/settings`);
        if (response.data.success) {
          setStreamingEnabled(response.data.settings.streamingEnabled);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchUser();
    fetchSettings();

    socket.on('new_frame', (data) => {
      setLiveImage(`data:image/jpeg;base64,${data.image}`);
      setConnectionStatus('streaming');
    });

    socket.on('stream_error', (data) => {
      alert(data.message);
      socket.emit('admin_stop_stream');
      setIsStreaming(false);
      setLiveImage('');
      setConnectionStatus('error');
    });

    return () => {
      socket.emit('admin_stop_stream');
      socket.off('new_frame');
      socket.off('stream_error');
    };
  }, [userId]);

  const startStream = () => {
    if (!user || !user.isOnline) {
      alert('User must be online');
      return;
    }
    if (!streamingEnabled) {
      alert('Streaming is disabled in system settings');
      return;
    }
    setShowStreamModal(true);
    setConnectionStatus('connecting');
    socket.emit('request_stream', { targetDeviceId: user.deviceId });
    setIsStreaming(true);
  };

  const stopStream = () => {
    socket.emit('admin_stop_stream');
    setIsStreaming(false);
    setLiveImage('');
    setConnectionStatus('idle');
    setShowStreamModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-xl mb-4">User not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${user.isOnline ? 'bg-secondary' : 'bg-gray-400'} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{user.username || 'Unknown User'}</h1>
                <p className="text-xs text-gray-600">{user.isOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info Card */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">User Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Email</p>
                  <p className="text-gray-900">{user.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Machine Name</p>
                  <p className="text-gray-900">{user.machineName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Device ID</p>
                  <p className="text-gray-900 font-mono text-xs break-all">{user.deviceId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    user.isOnline 
                      ? 'bg-secondary/20 text-secondary border border-secondary/30'
                      : 'bg-gray-200 text-gray-600 border border-gray-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 ${user.isOnline ? 'bg-secondary' : 'bg-gray-500'} rounded-full mr-1.5 ${user.isOnline && 'animate-pulse'}`}></span>
                    {user.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Last Seen</p>
                  <p className="text-gray-900 text-sm">
                    {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={startStream}
                  disabled={!user.isOnline || !streamingEnabled}
                  className="w-full flex items-center justify-between px-4 py-3 bg-accent hover:bg-accent/70 text-gray-900 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent disabled:hover:border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <span className="block">Live Stream</span>
                      {(!user.isOnline || !streamingEnabled) && (
                        <span className="text-xs text-gray-500">
                          {!user.isOnline ? 'User offline' : 'Streaming disabled in settings'}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate(`/user/${userId}/screenshots`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-accent hover:bg-accent/70 text-gray-900 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-primary"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span>Screenshots</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate(`/user/${userId}/mouse-tracking`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-accent hover:bg-accent/70 text-gray-900 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-primary"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-error/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <span>Mouse Tracking</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate(`/user/${userId}/app-usage`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-accent hover:bg-accent/70 text-gray-900 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-primary"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span>App Usage</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Activity Stats / Additional Info */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-sm">Screenshots</p>
                      <p className="text-gray-500 text-xs">Captured images</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/user/${userId}/screenshots`)}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    View
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-error/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-sm">Mouse Activity</p>
                      <p className="text-gray-500 text-xs">Tracking data</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/user/${userId}/mouse-tracking`)}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    View
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-sm">App Usage</p>
                      <p className="text-gray-500 text-xs">Application statistics</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/user/${userId}/app-usage`)}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stream Modal */}
      {showStreamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${user.isOnline ? 'bg-secondary' : 'bg-gray-400'} rounded-full flex items-center justify-center text-white font-bold`}>
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Live Stream - {user.username}</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="flex items-center text-secondary">
                      <span className="w-2 h-2 bg-secondary rounded-full mr-1.5 animate-pulse"></span>
                      {connectionStatus === 'streaming' ? 'Streaming' : 'Connecting...'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={stopStream}
                className="p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-gray-50">
              <div 
                ref={streamContainerRef}
                className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center"
              >
                {connectionStatus === 'connecting' ? (
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white">Connecting to stream...</p>
                  </div>
                ) : liveImage ? (
                  <img src={liveImage} alt="Live stream" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white">Waiting for stream...</p>
                  </div>
                )}
              </div>

              {/* Stream Controls */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Machine: <span className="font-medium text-gray-900">{user.machineName || 'Unknown'}</span>
                  </span>
                </div>
                <button
                  onClick={stopStream}
                  className="px-6 py-2 bg-error hover:bg-error/80 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span>Stop Stream</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDetails;
