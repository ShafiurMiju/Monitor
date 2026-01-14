// admin-dashboard/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://103.130.11.114:3001";

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
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ username: '', email: '', computerName: '', screenShowEnabled: true });
  const [globalSettings, setGlobalSettings] = useState({ screenshotEnabled: true });

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

  const handleDeleteUser = async (userId, username, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      try {
        const response = await axios.delete(`${SERVER_URL}/api/users/${userId}`);
        if (response.data.success) {
          alert('User deleted successfully');
          fetchUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEditUser = (user, e) => {
    e.stopPropagation();
    setEditingUser(user);
    setEditFormData({
      username: user.username || '',
      email: user.email || '',
      computerName: user.computerName || '',
      screenShowEnabled: user.screenShowEnabled !== undefined ? user.screenShowEnabled : true
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const response = await axios.put(`${SERVER_URL}/api/users/${editingUser._id}`, editFormData);
      if (response.data.success) {
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGlobalSettings();

    socket.on('user_status_changed', () => {
      fetchUsers();
    });

    return () => {
      socket.off('user_status_changed');
    };
  }, []);

  const fetchGlobalSettings = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/settings`);
      if (response.data.success) {
        setGlobalSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.computerName?.toLowerCase().includes(searchQuery.toLowerCase())
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
                          {user.computerName || 'Unknown Machine'}
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
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handleEditUser(user, e)}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteUser(user._id, user.username, e)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
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
                          {user.computerName || 'Unknown Machine'}
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
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handleEditUser(user, e)}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteUser(user._id, user.username, e)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
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

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Computer Name</label>
                <input
                  type="text"
                  value={editFormData.computerName}
                  onChange={(e) => setEditFormData({ ...editFormData, computerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="flex items-center justify-between cursor-pointer p-4 border-2 border-gray-200 rounded-xl hover:border-primary/30 hover:bg-gray-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${editFormData.screenShowEnabled ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <svg className={`w-5 h-5 ${editFormData.screenShowEnabled ? 'text-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-gray-900">Enable Screenshots</span>
                      <span className="block text-xs text-gray-500 mt-0.5">Allow screenshot capture for this user</span>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={editFormData.screenShowEnabled}
                      onChange={(e) => setEditFormData({ ...editFormData, screenShowEnabled: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out ${editFormData.screenShowEnabled ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-gray-300'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ease-in-out ${editFormData.screenShowEnabled ? 'translate-x-7' : 'translate-x-0.5'} mt-0.5 flex items-center justify-center`}>
                        {editFormData.screenShowEnabled ? (
                          <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
                
                {/* Global Screenshot Disabled Warning */}
                {!globalSettings.screenshotEnabled && (
                  <div className="mt-3 flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">Global Screenshots Disabled</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Screenshots are currently disabled globally. This user setting will only take effect when global screenshots are enabled in Settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleUpdateUser}
                className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
