// admin-dashboard/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

function Dashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

    socket.on('user_status_changed', () => {
      fetchUsers();
    });

    return () => {
      socket.off('user_status_changed');
    };
  }, []);

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.machineName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineUsers = filteredUsers.filter(u => u.isOnline);
  const offlineUsers = filteredUsers.filter(u => !u.isOnline);

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ODL Monitor</h1>
                <p className="text-xs text-gray-600">Admin Dashboard</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center space-x-2 px-4 py-2 bg-accent hover:bg-primary text-gray-900 hover:text-white rounded-lg transition-all duration-200 border border-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-secondary rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Online Users</p>
                <p className="text-3xl font-bold text-white">{onlineUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-500 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Offline Users</p>
                <p className="text-3xl font-bold text-white">{offlineUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-primary rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by name, email, or machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-secondary rounded-full mr-2 animate-pulse"></span>
                  Online Users ({onlineUsers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlineUsers.map(user => (
                    <div
                      key={user._id}
                      onClick={() => navigate(`/user/${user._id}`)}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary transition-all duration-200 cursor-pointer group hover:scale-[1.02] shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-semibold group-hover:text-primary transition-colors">
                              {user.username || 'Unknown User'}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/30">
                              <span className="w-1.5 h-1.5 bg-secondary rounded-full mr-1.5"></span>
                              Online
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {user.email || 'No email'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {user.machineName || 'Unknown Machine'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <span className="font-mono text-xs">{user.deviceId?.substring(0, 20)}...</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {user.lastSeen ? `Last seen: ${new Date(user.lastSeen).toLocaleString()}` : 'No activity'}
                        </span>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Users */}
            {offlineUsers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                  Offline Users ({offlineUsers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offlineUsers.map(user => (
                    <div
                      key={user._id}
                      onClick={() => navigate(`/user/${user._id}`)}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary/50 transition-all duration-200 cursor-pointer group hover:scale-[1.02] shadow-sm hover:shadow-md opacity-75"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-semibold group-hover:text-primary transition-colors">
                              {user.username || 'Unknown User'}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 border border-gray-300">
                              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5"></span>
                              Offline
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {user.email || 'No email'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {user.machineName || 'Unknown Machine'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <span className="font-mono text-xs">{user.deviceId?.substring(0, 20)}...</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {user.lastSeen ? `Last seen: ${new Date(user.lastSeen).toLocaleString()}` : 'No activity'}
                        </span>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredUsers.length === 0 && (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-600 text-lg">No users found</p>
                {searchQuery && (
                  <p className="text-gray-500 text-sm mt-2">Try adjusting your search query</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
