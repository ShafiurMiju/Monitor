// admin-dashboard/src/pages/AppUsagePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const APP_MAPPING = {
  'chrome': { name: 'Google Chrome', icon: '🌐' },
  'msedge': { name: 'Microsoft Edge', icon: '🌐' },
  'firefox': { name: 'Mozilla Firefox', icon: '🦊' },
  'Code': { name: 'Visual Studio Code', icon: '💻' },
  'explorer': { name: 'File Explorer', icon: '📁' },
  'notepad': { name: 'Notepad', icon: '📝' },
  'EXCEL': { name: 'Microsoft Excel', icon: '📊' },
  'WINWORD': { name: 'Microsoft Word', icon: '📄' },
  'OUTLOOK': { name: 'Microsoft Outlook', icon: '📧' },
  'Teams': { name: 'Microsoft Teams', icon: '👥' },
  'Slack': { name: 'Slack', icon: '💬' },
  'Discord': { name: 'Discord', icon: '🎮' },
  'Spotify': { name: 'Spotify', icon: '🎵' },
};

const getAppInfo = (processName) => {
  return APP_MAPPING[processName] || { name: processName, icon: '📱' };
};

function AppUsagePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [allStats, setAllStats] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsageTime, setTotalUsageTime] = useState('');
  const [sortBy, setSortBy] = useState('usage');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'list', 'charts'
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    searchQuery: '',
    startDate: '',
    endDate: '',
    minUsageTime: '',
    maxUsageTime: '',
    minUsageCount: '',
    selectedApps: [],
    lastHours: ''
  });

  const [activeQuickFilter, setActiveQuickFilter] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchAppUsageStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sortBy, sortOrder, filters.startDate, filters.endDate]);

  // Quick filter functions
  const applyQuickFilter = (filterType) => {
    const now = new Date();
    let startDate;

    // Format date helper
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (filterType) {
      case 'today':
        // Get today's date only
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        setFilters({
          ...filters,
          startDate: formatDate(startDate),
          endDate: '', // Clear end date
          lastHours: ''
        });
        break;
      case 'yesterday':
        // Get yesterday's date only
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        setFilters({
          ...filters,
          startDate: formatDate(startDate),
          endDate: '', // Clear end date
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
    
    // Format dates for input fields
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

  const fetchAppUsageStats = async () => {
    try {
      setLoading(true);
      
      // Build query params with filters
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const statsUrl = `${SERVER_URL}/api/app-usage/${userId}/stats${params.toString() ? '?' + params.toString() : ''}`;
      const timelineUrl = `${SERVER_URL}/api/app-usage/${userId}?limit=100${params.toString() ? '&' + params.toString() : ''}`;
      
      const [statsResponse, timelineResponse] = await Promise.all([
        axios.get(statsUrl),
        axios.get(timelineUrl)
      ]);
      
      if (statsResponse.data.success) {
        console.log('Stats response:', statsResponse.data);
        console.log('First app:', statsResponse.data.stats[0]);
        const sortedStats = sortStats(statsResponse.data.stats, sortBy, sortOrder);
        setAllStats(sortedStats);
        setStats(applyClientFilters(sortedStats));
        setTotalUsageTime(statsResponse.data.totalUsageTimeFormatted);
      }
      
      if (timelineResponse.data.success) {
        setTimeline(timelineResponse.data.appUsageData);
      }
    } catch (error) {
      console.error('Error fetching app usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyClientFilters = (data) => {
    let filtered = [...data];

    // Date filtering is now handled by backend - no client-side date filtering needed

    // Search filter
    if (filters.searchQuery) {
      filtered = filtered.filter(app =>
        getAppInfo(app.appName).name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        app.appName.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    // Min usage time filter (in seconds)
    if (filters.minUsageTime) {
      const minSeconds = parseInt(filters.minUsageTime) * 60;
      filtered = filtered.filter(app => app.totalUsageTime >= minSeconds);
    }

    // Max usage time filter (in seconds)
    if (filters.maxUsageTime) {
      const maxSeconds = parseInt(filters.maxUsageTime) * 60;
      filtered = filtered.filter(app => app.totalUsageTime <= maxSeconds);
    }

    // Min usage count filter
    if (filters.minUsageCount) {
      filtered = filtered.filter(app => app.usageCount >= parseInt(filters.minUsageCount));
    }

    return filtered;
  };

  useEffect(() => {
    if (allStats.length > 0) {
      setStats(applyClientFilters(allStats));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery, filters.minUsageTime, filters.maxUsageTime, filters.minUsageCount]);

  const sortStats = (data, sortField, order) => {
    return [...data].sort((a, b) => {
      let compareA, compareB;
      
      switch (sortField) {
        case 'usage':
          compareA = a.totalUsageTime;
          compareB = b.totalUsageTime;
          break;
        case 'count':
          compareA = a.usageCount;
          compareB = b.usageCount;
          break;
        case 'name':
          compareA = getAppInfo(a.appName).name.toLowerCase();
          compareB = getAppInfo(b.appName).name.toLowerCase();
          break;
        default:
          compareA = a.totalUsageTime;
          compareB = b.totalUsageTime;
      }
      
      if (order === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
  };

  const formatDuration = (value) => {
    // Backend stores duration in seconds, so use it directly
    const seconds = Math.floor(value);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Prepare chart data
  const prepareBarChartData = () => {
    const topApps = stats.slice(0, 10);
    return {
      labels: topApps.map(app => getAppInfo(app.appName).name),
      datasets: [
        {
          label: 'Usage Time (minutes)',
          data: topApps.map(app => (app.totalUsageTime / 60).toFixed(2)),
          backgroundColor: 'rgba(255, 206, 86, 0.8)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const prepareDoughnutChartData = () => {
    const topApps = stats.slice(0, 8);
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
    ];
    
    return {
      labels: topApps.map(app => getAppInfo(app.appName).name),
      datasets: [
        {
          label: 'Usage Time Distribution',
          data: topApps.map(app => (app.totalUsageTime / 60).toFixed(2)),
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 2,
        },
      ],
    };
  };

  const prepareLineChartData = () => {
    if (!timeline || timeline.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Group by date and aggregate usage per app
    const dateMap = {};
    const appNames = new Set();

    timeline.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      appNames.add(entry.appName);
      
      if (!dateMap[date]) {
        dateMap[date] = {};
      }
      if (!dateMap[date][entry.appName]) {
        dateMap[date][entry.appName] = 0;
      }
      dateMap[date][entry.appName] += entry.usageTime || 0;
    });

    const dates = Object.keys(dateMap).sort();
    const topAppNames = Array.from(appNames).slice(0, 5);
    
    const colors = [
      { bg: 'rgba(255, 99, 132, 0.5)', border: 'rgba(255, 99, 132, 1)' },
      { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' },
      { bg: 'rgba(255, 206, 86, 0.5)', border: 'rgba(255, 206, 86, 1)' },
      { bg: 'rgba(75, 192, 192, 0.5)', border: 'rgba(75, 192, 192, 1)' },
      { bg: 'rgba(153, 102, 255, 0.5)', border: 'rgba(153, 102, 255, 1)' },
    ];

    const datasets = topAppNames.map((appName, index) => ({
      label: getAppInfo(appName).name,
      data: dates.map(date => ((dateMap[date][appName] || 0) / 60).toFixed(2)),
      borderColor: colors[index]?.border || 'rgba(0, 0, 0, 1)',
      backgroundColor: colors[index]?.bg || 'rgba(0, 0, 0, 0.5)',
      tension: 0.3,
      fill: false,
    }));

    return {
      labels: dates,
      datasets: datasets,
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Time (minutes)',
        },
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
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
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">App Usage</h1>
                  <p className="text-xs text-gray-600">{user?.username || 'Loading...'}</p>
                </div>
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
                        minUsageTime: '',
                        maxUsageTime: '',
                        minUsageCount: '',
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
                      Search Apps
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                        placeholder="Search by app name..."
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
                      Date Range (End date optional)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => {
                          setFilters({ ...filters, startDate: e.target.value });
                          setActiveQuickFilter(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => {
                          setFilters({ ...filters, endDate: e.target.value });
                          setActiveQuickFilter(null);
                        }}
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Usage Time Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Usage Time (minutes)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={filters.minUsageTime}
                        onChange={(e) => setFilters({ ...filters, minUsageTime: e.target.value })}
                        placeholder="Min (minutes)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={filters.maxUsageTime}
                        onChange={(e) => setFilters({ ...filters, maxUsageTime: e.target.value })}
                        placeholder="Max (minutes)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Usage Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Sessions
                    </label>
                    <input
                      type="number"
                      value={filters.minUsageCount}
                      onChange={(e) => setFilters({ ...filters, minUsageCount: e.target.value })}
                      placeholder="Min usage count"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Active Filters Summary */}
                  {(filters.searchQuery || filters.startDate || filters.endDate || filters.minUsageTime || filters.maxUsageTime || filters.minUsageCount || activeQuickFilter) && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Active Filters:</p>
                      <div className="space-y-1">
                        {activeQuickFilter && (
                          <div className="text-xs bg-primary/10 text-gray-700 px-2 py-1 rounded font-semibold">
                            Quick: {activeQuickFilter === 'today' ? '📅 Today' : activeQuickFilter === 'yesterday' ? '🕒 Yesterday' : `⏰ Last ${filters.lastHours}h`}
                          </div>
                        )}
                        {filters.searchQuery && (
                          <div className="text-xs bg-primary/10 text-gray-700 px-2 py-1 rounded">
                            Search: {filters.searchQuery}
                          </div>
                        )}
                        {(filters.startDate || filters.endDate) && !activeQuickFilter && (
                          <div className="text-xs bg-primary/10 text-gray-700 px-2 py-1 rounded">
                            Date: {filters.startDate || 'Start'} → {filters.endDate || 'End'}
                          </div>
                        )}
                        {(filters.minUsageTime || filters.maxUsageTime) && (
                          <div className="text-xs bg-primary/10 text-gray-700 px-2 py-1 rounded">
                            Time: {filters.minUsageTime || '0'}m - {filters.maxUsageTime || '∞'}m
                          </div>
                        )}
                        {filters.minUsageCount && (
                          <div className="text-xs bg-primary/10 text-gray-700 px-2 py-1 rounded">
                            Min Sessions: {filters.minUsageCount}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-primary rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Total Apps</p>
                <p className="text-3xl font-bold text-gray-900">{stats.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-secondary rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Total Usage Time</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsageTime || '0h 0m'}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-secondary rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Most Used</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.length > 0 ? getAppInfo(stats[0].appName).name : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-3xl">
                {stats.length > 0 ? getAppInfo(stats[0].appName).icon : '📱'}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'overview' ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
              }`}
            >
              📋 List View
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'charts' ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
              }`}
            >
              📈 Charts
            </button>
          </div>
        </div>

        {/* Sorting Controls */}
        {viewMode === 'list' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-gray-600 text-sm">Sort by:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSortBy('usage'); setSortOrder('desc'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'usage' ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                  }`}
                >
                  Usage Time
                </button>
                <button
                  onClick={() => { setSortBy('count'); setSortOrder('desc'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'count' ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                  }`}
                >
                  Count
                </button>
                <button
                  onClick={() => { setSortBy('name'); setSortOrder('asc'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'name' ? 'bg-primary text-gray-900' : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                  }`}
                >
                  Name
                </button>
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className={`w-4 h-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Content based on view mode */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600 text-lg">No app usage data available</p>
          </div>
        ) : (
          <>
            {/* Overview Mode - Show charts grid */}
            {viewMode === 'overview' && (
              <div className="space-y-6">
                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Top 5 Apps by Usage</h3>
                    <div className="space-y-3">
                      {stats.slice(0, 5).map((app, index) => {
                        const appInfo = getAppInfo(app.appName);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{appInfo.icon}</span>
                              <div>
                                <p className="font-medium text-gray-900">{appInfo.name}</p>
                                <p className="text-sm text-gray-600">{formatDuration(app.totalUsageTime)}</p>
                                {app.lastUsed && (
                                  <p className="text-xs text-gray-500">
                                    Last: {new Date(app.lastUsed).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                            {app.percentage && (
                              <span className="text-sm font-semibold text-primary px-3 py-1 bg-primary/20 rounded-full">
                                {app.percentage}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Usage Statistics</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Usage Time</p>
                        <p className="text-2xl font-bold text-gray-900">{totalUsageTime || '0h 0m'}</p>
                      </div>
                      <div className="p-4 bg-secondary/10 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Average per App</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.length > 0 
                            ? formatDuration(stats.reduce((acc, app) => acc + app.totalUsageTime, 0) / stats.length)
                            : '0m 0s'
                          }
                        </p>
                      </div>
                      <div className="p-4 bg-accent/50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.reduce((acc, app) => acc + app.usageCount, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Doughnut Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 Usage Distribution (Top 8 Apps)</h3>
                  <div style={{ height: '400px' }}>
                    <Doughnut data={prepareDoughnutChartData()} options={{ ...chartOptions, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
            )}

            {/* List Mode */}
            {viewMode === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((app, index) => {
                  const appInfo = getAppInfo(app.appName);
                  return (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-4xl">{appInfo.icon}</div>
                          <h3 className="text-gray-900 font-semibold truncate">{appInfo.name}</h3>
                        </div>
                      </div>
                      
                      {/* Total Usage Time - Large and Prominent */}
                      <div className="bg-primary/10 rounded-lg p-4 mb-3">
                        <p className="text-xs text-gray-600 mb-1">Total Time Used</p>
                        <p className="text-3xl font-bold text-gray-900">{formatDuration(app.totalUsageTime)}</p>
                      </div>

                      {/* Last Used Time */}
                      {app.lastUsed && (
                        <div className="bg-secondary/10 rounded-lg p-3 mb-3">
                          <p className="text-xs text-gray-600 mb-1">Last Used</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(app.lastUsed).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}

                      {/* Additional Stats */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <span className="text-gray-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                            Usage Count:
                          </span>
                          <span className="text-gray-900 font-semibold">{app.usageCount}</span>
                        </div>
                        {app.percentage && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">% of Total Time</span>
                              <span className="text-sm font-bold text-primary">{app.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${app.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Charts Mode */}
            {viewMode === 'charts' && (
              <div className="space-y-6">
                {/* Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Top 10 Apps by Usage Time</h3>
                  <div style={{ height: '400px' }}>
                    <Bar data={prepareBarChartData()} options={chartOptions} />
                  </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Usage Over Time (Top 5 Apps)</h3>
                  <div style={{ height: '400px' }}>
                    <Line data={prepareLineChartData()} options={lineChartOptions} />
                  </div>
                </div>

                {/* Doughnut Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 Usage Distribution (Top 8 Apps)</h3>
                  <div style={{ height: '400px' }}>
                    <Doughnut data={prepareDoughnutChartData()} options={{ ...chartOptions, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppUsagePage;
