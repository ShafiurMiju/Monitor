// admin-dashboard/src/pages/KeystrokeTrackingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

function KeystrokeTrackingPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState('today');
  const [timeRange, setTimeRange] = useState('1D');
  
  const [filters, setFilters] = useState(() => {
    // Set default filter to today
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    return {
      searchQuery: '',
      startDate: todayDate,
      endDate: todayDate,
      minKeystrokes: '',
      maxKeystrokes: '',
      minApps: '',
      selectedApps: [],
      lastHours: ''
    };
  });

  useEffect(() => {
    fetchUser();
    fetchSessions();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (allSessions.length > 0) {
      setSessions(applyClientFilters(allSessions));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery, filters.minKeystrokes, filters.maxKeystrokes, filters.minApps]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/users`);
      if (response.data.success) {
        const foundUser = response.data.users.find(u => u._id === userId);
        setUser(foundUser);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${SERVER_URL}/api/keystroke-tracking/${userId}`, { params });
      if (response.data.success) {
        setAllSessions(response.data.data);
        setSessions(applyClientFilters(response.data.data));
      }
    } catch (error) {
      console.error('Failed to fetch keystroke sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await axios.get(`${SERVER_URL}/api/keystroke-tracking/${userId}/stats`, { params });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Quick filter functions
  const applyQuickFilter = (filterType) => {
    const now = new Date();
    let startDate, endDate;

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (filterType) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = startDate;
        setFilters({
          ...filters,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          lastHours: ''
        });
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        endDate = startDate;
        setFilters({
          ...filters,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          lastHours: ''
        });
        break;
      default:
        return;
    }

    setActiveQuickFilter(filterType);
  };

  const applyHoursFilter = () => {
    if (!filters.lastHours || filters.lastHours <= 0) return;
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (filters.lastHours * 60 * 60 * 1000));
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setFilters({
      ...filters,
      startDate: formatDate(startDate),
      endDate: formatDate(now)
    });
    setActiveQuickFilter('hours');
  };

  // Client-side filtering
  const applyClientFilters = (data) => {
    let filtered = [...data];

    // Search filter
    if (filters.searchQuery) {
      filtered = filtered.filter(session =>
        session.sessionId.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        session.appBreakdown.some(app => 
          app.appName.toLowerCase().includes(filters.searchQuery.toLowerCase())
        )
      );
    }

    // Min keystrokes filter
    if (filters.minKeystrokes) {
      filtered = filtered.filter(session => session.totalCount >= parseInt(filters.minKeystrokes));
    }

    // Max keystrokes filter
    if (filters.maxKeystrokes) {
      filtered = filtered.filter(session => session.totalCount <= parseInt(filters.maxKeystrokes));
    }

    // Min apps filter
    if (filters.minApps) {
      filtered = filtered.filter(session => session.appBreakdown.length >= parseInt(filters.minApps));
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimelineChartData = () => {
    if (!stats || !stats.timeSeries || stats.timeSeries.length === 0) {
      return null;
    }

    // Define time range and grouping intervals
    const timeRangeConfig = {
      '1D': { duration: 24 * 60 * 60 * 1000, interval: 60 * 60 * 1000, label: 'hour' },
      '5D': { duration: 5 * 24 * 60 * 60 * 1000, interval: 6 * 60 * 60 * 1000, label: '6-hour' },
      '1M': { duration: 30 * 24 * 60 * 60 * 1000, interval: 24 * 60 * 60 * 1000, label: 'day' },
      '1Y': { duration: 365 * 24 * 60 * 60 * 1000, interval: 7 * 24 * 60 * 60 * 1000, label: 'week' },
      '5Y': { duration: 5 * 365 * 24 * 60 * 60 * 1000, interval: 30 * 24 * 60 * 60 * 1000, label: 'month' },
      'Max': { duration: null, interval: 30 * 24 * 60 * 60 * 1000, label: 'month' }
    };

    const config = timeRangeConfig[timeRange];
    const now = new Date();
    
    // Filter data by time range
    let filteredData = stats.timeSeries;
    if (config.duration) {
      const cutoffTime = new Date(now.getTime() - config.duration);
      filteredData = stats.timeSeries.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= cutoffTime;
      });
    }

    if (filteredData.length === 0) {
      return null;
    }

    // Group data by intervals
    const groupedData = {};
    filteredData.forEach(item => {
      const itemTime = new Date(item.timestamp).getTime();
      const intervalKey = Math.floor(itemTime / config.interval) * config.interval;
      
      if (!groupedData[intervalKey]) {
        groupedData[intervalKey] = 0;
      }
      groupedData[intervalKey] += item.count;
    });

    // Convert to sorted array
    const sortedData = Object.keys(groupedData)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(key => ({
        timestamp: parseInt(key),
        count: groupedData[key]
      }));

    // Format labels based on time range
    const labels = sortedData.map(item => {
      const date = new Date(item.timestamp);
      if (timeRange === '1D') {
        return date.toLocaleString('en-US', { 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else if (timeRange === '5D') {
        return date.toLocaleString('en-US', { 
          month: 'short',
          day: 'numeric',
          hour: 'numeric'
        });
      } else if (timeRange === '1M') {
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
      } else {
        return date.toLocaleString('en-US', { 
          month: 'short',
          year: timeRange === '5Y' || timeRange === 'Max' ? 'numeric' : undefined
        });
      }
    });

    // Create canvas for green gradient
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.2)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

    return {
      labels,
      datasets: [
        {
          label: 'Keystrokes',
          data: sortedData.map(item => item.count),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: 'rgb(34, 197, 94)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3
        }
      ]
    };
  };

  const getAppBreakdownChartData = () => {
    if (!stats || !stats.appBreakdown || stats.appBreakdown.length === 0) {
      return null;
    }

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(14, 165, 233, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(168, 85, 247, 0.8)',
    ];

    return {
      labels: stats.appBreakdown.map(app => app.appName),
      datasets: [
        {
          label: 'Keystrokes',
          data: stats.appBreakdown.map(app => app.count),
          backgroundColor: colors,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        }
      ]
    };
  };

  const timelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Keystrokes: ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 11
          }
        },
        grid: {
          display: false,
          drawBorder: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          callback: function(value) {
            return value.toLocaleString();
          }
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.3)',
          drawBorder: false
        }
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#374151',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: '#4b5563',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          afterLabel: function(context) {
            const keystrokeCount = context.parsed.y;
            // Calculate average per minute based on the date filter range
            let minutes = 1;
            
            if (filters.startDate && filters.endDate) {
              const start = new Date(filters.startDate);
              const end = new Date(filters.endDate);
              end.setHours(23, 59, 59, 999);
              minutes = Math.max(1, Math.floor((end - start) / (1000 * 60)));
            } else if (filters.startDate) {
              const start = new Date(filters.startDate);
              const now = new Date();
              minutes = Math.max(1, Math.floor((now - start) / (1000 * 60)));
            } else {
              // Default to session count assumption (30 second intervals)
              minutes = stats && stats.sessionCount ? stats.sessionCount * 0.5 : 1;
            }
            
            const avgPerMinute = (keystrokeCount / minutes).toFixed(2);
            return `Avg: ${avgPerMinute} keystrokes/min`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.5)'
        }
      },
      y: {
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.5)'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(`/user/${userId}`)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to User</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Keystroke Tracking</h1>
                <p className="text-xs text-gray-600">{user?.username || 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={() => {
                      setFilters({
                        searchQuery: '',
                        startDate: '',
                        endDate: '',
                        minKeystrokes: '',
                        maxKeystrokes: '',
                        minApps: '',
                        selectedApps: [],
                        lastHours: ''
                      });
                      setActiveQuickFilter(null);
                    }}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Quick Filters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Quick Filters
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => applyQuickFilter('today')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeQuickFilter === 'today' 
                            ? 'bg-primary text-gray-900' 
                            : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                        }`}
                      >
                        📅 Today
                      </button>
                      <button
                        onClick={() => applyQuickFilter('yesterday')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeQuickFilter === 'yesterday' 
                            ? 'bg-primary text-gray-900' 
                            : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                        }`}
                      >
                        🕒 Yesterday
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-600">Last X Hours</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={filters.lastHours}
                          onChange={(e) => setFilters({ ...filters, lastHours: e.target.value })}
                          placeholder="Enter hours"
                          min="1"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <button
                          onClick={applyHoursFilter}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                            activeQuickFilter === 'hours' 
                              ? 'bg-primary text-gray-900' 
                              : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                          }`}
                        >
                          ⏰ Apply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Sessions
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                        placeholder="Search by session or app..."
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Date Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Start Date"
                      />
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="End Date"
                      />
                    </div>
                  </div>

                  {/* Keystroke Count Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keystroke Count
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={filters.minKeystrokes}
                        onChange={(e) => setFilters({ ...filters, minKeystrokes: e.target.value })}
                        placeholder="Min"
                        min="0"
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={filters.maxKeystrokes}
                        onChange={(e) => setFilters({ ...filters, maxKeystrokes: e.target.value })}
                        placeholder="Max"
                        min="0"
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Min Apps Used */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Apps Used
                    </label>
                    <input
                      type="number"
                      value={filters.minApps}
                      onChange={(e) => setFilters({ ...filters, minApps: e.target.value })}
                      placeholder="Min apps"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Filter Toggle Button */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-gray-700 font-medium">
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </span>
              </button>
              
              {sessions.length !== allSessions.length && (
                <span className="text-sm text-gray-600">
                  Showing {sessions.length} of {allSessions.length} sessions
                </span>
              )}
            </div>

            {/* Statistics Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Keystrokes</span>
                    <span className="text-2xl">⌨️</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">{stats.totalKeystrokes.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Sessions</span>
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-3xl font-bold text-secondary">{stats.sessionCount}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Avg per Session</span>
                    <span className="text-2xl">📈</span>
                  </div>
                  <p className="text-3xl font-bold text-error">{stats.avgKeystrokesPerSession.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Apps Used</span>
                    <span className="text-2xl">💻</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.appBreakdown.length}</p>
                </div>
              </div>
            )}

      {/* Charts */}
            {stats && (
              <div className="space-y-6 mb-6">
                {/* Timeline Chart */}
                {getTimelineChartData() && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Keystroke Timeline</h2>
                      <div className="flex gap-1">
                        {['1D', '5D', '1M', '1Y', '5Y', 'Max'].map((range) => (
                          <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                              timeRange === range
                                ? 'text-gray-900 border-b-2 border-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ height: '350px' }}>
                      <Line data={getTimelineChartData()} options={timelineChartOptions} />
                    </div>
                  </div>
                )}

                {/* App Breakdown Chart */}
                {getAppBreakdownChartData() && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Keystrokes by Application</h2>
                    <div style={{ height: '400px' }}>
                      <Bar data={getAppBreakdownChartData()} options={chartOptions} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* App Breakdown Table */}
            {stats && stats.appBreakdown && stats.appBreakdown.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Application</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Total Keystrokes</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.appBreakdown.map((app, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600">#{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{app.appName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{app.count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-300" 
                                  style={{ width: `${(app.count / stats.totalKeystrokes) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-gray-600 font-medium min-w-[60px]">
                                {((app.count / stats.totalKeystrokes) * 100).toFixed(2)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Sessions List */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600">No keystroke tracking data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">App Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date & Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Total Keystrokes</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Apps Used</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Screen Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 5).map((session) => (
                      <tr key={session._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {session.appBreakdown && session.appBreakdown.length > 0 
                              ? session.appBreakdown.map(app => app.appName).join(', ')
                              : 'Unknown'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(session.createdAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{session.totalCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{session.appBreakdown.length} apps</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {session.screenResolution.width} × {session.screenResolution.height}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
    );
  }

export default KeystrokeTrackingPage;
