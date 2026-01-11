import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AppUsage.css';
import DateRangeFilter from './components/DateRangeFilter';
import SortControls from './components/SortControls';
import FilterPanel from './components/FilterPanel';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

// App name and icon mapping
const APP_MAPPING = {
  'chrome': { name: 'Google Chrome', icon: '🌐' },
  'msedge': { name: 'Microsoft Edge', icon: '🌐' },
  'firefox': { name: 'Mozilla Firefox', icon: '🦊' },
  'brave': { name: 'Brave Browser', icon: '🦁' },
  'opera': { name: 'Opera', icon: '🎭' },
  'Code': { name: 'Visual Studio Code', icon: '💻' },
  'explorer': { name: 'File Explorer', icon: '📁' },
  'mstsc': { name: 'Remote Desktop', icon: '🖥️' },
  'notepad': { name: 'Notepad', icon: '📝' },
  'notepad++': { name: 'Notepad++', icon: '📝' },
  'EXCEL': { name: 'Microsoft Excel', icon: '📊' },
  'WINWORD': { name: 'Microsoft Word', icon: '📄' },
  'POWERPNT': { name: 'Microsoft PowerPoint', icon: '📽️' },
  'OUTLOOK': { name: 'Microsoft Outlook', icon: '📧' },
  'Teams': { name: 'Microsoft Teams', icon: '👥' },
  'Slack': { name: 'Slack', icon: '💬' },
  'Discord': { name: 'Discord', icon: '🎮' },
  'Spotify': { name: 'Spotify', icon: '🎵' },
  'VLC': { name: 'VLC Media Player', icon: '🎬' },
  'Photoshop': { name: 'Adobe Photoshop', icon: '🎨' },
  'cmd': { name: 'Command Prompt', icon: '⌨️' },
  'powershell': { name: 'PowerShell', icon: '⚡' },
  'WindowsTerminal': { name: 'Windows Terminal', icon: '⌨️' },
  'git': { name: 'Git', icon: '📦' },
  'docker': { name: 'Docker', icon: '🐋' },
  'postman': { name: 'Postman', icon: '📮' },
  'SnippingTool': { name: 'Snipping Tool', icon: '✂️' },
  'Calculator': { name: 'Calculator', icon: '🔢' },
  'Paint': { name: 'Paint', icon: '🎨' },
  'Zoom': { name: 'Zoom', icon: '📹' },
  'LockApp': { name: 'LockApp', icon: '🔒' },
};

// Function to get app display info
const getAppInfo = (processName) => {
  const appInfo = APP_MAPPING[processName];
  if (appInfo) {
    return appInfo;
  }
  // Default for unknown apps
  return { name: processName, icon: '📱' };
};

function AppUsage({ user, onClose }) {
  console.log('AppUsage component rendered for user:', user);
  
  const [stats, setStats] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: ''
  });
  const [totalUsageTime, setTotalUsageTime] = useState('');
  const [totalApps, setTotalApps] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('stats'); // 'stats', 'timeline', or 'charts'
  const [sortBy, setSortBy] = useState('usage'); // 'usage', 'count', 'lastUsed', 'name', 'percentage'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const sortStats = (data, sortField, order) => {
    const sorted = [...data].sort((a, b) => {
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
        case 'lastUsed':
          compareA = new Date(a.lastUsed).getTime();
          compareB = new Date(b.lastUsed).getTime();
          break;
        case 'name':
          compareA = getAppInfo(a.appName).name.toLowerCase();
          compareB = getAppInfo(b.appName).name.toLowerCase();
          break;
        case 'percentage':
          compareA = parseFloat(a.percentage);
          compareB = parseFloat(b.percentage);
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
    
    return sorted;
  };

  useEffect(() => {
    const fetchAppUsageStats = async () => {
      try {
        setLoading(true);
        setError(null);

        let statsUrl = `${SERVER_URL}/api/app-usage/${user._id}/stats`;
        let timelineUrl = `${SERVER_URL}/api/app-usage/${user._id}`;
        
        const params = new URLSearchParams();
        if (dateRange.startDate) {
          let startDateTime = dateRange.startDate;
          if (dateRange.startTime) {
            startDateTime += `T${dateRange.startTime}:00`;
          }
          params.append('startDate', startDateTime);
        }
        if (dateRange.endDate) {
          let endDateTime = dateRange.endDate;
          if (dateRange.endTime) {
            endDateTime += `T${dateRange.endTime}:59`;
          }
          params.append('endDate', endDateTime);
        }
        
        if (params.toString()) {
          statsUrl += `?${params.toString()}`;
          timelineUrl += `?${params.toString()}`;
        }

        console.log('Fetching app usage from:', statsUrl);
        
        // Fetch both stats and timeline data
        const [statsResponse, timelineResponse] = await Promise.all([
          axios.get(statsUrl),
          axios.get(timelineUrl + (params.toString() ? '&' : '?') + 'limit=200')
        ]);
        
        console.log('App usage response:', statsResponse.data);
        console.log('Timeline response:', timelineResponse.data);

        if (statsResponse.data.success) {
          console.log('Stats:', statsResponse.data.stats);
          const sortedStats = sortStats(statsResponse.data.stats, sortBy, sortOrder);
          setStats(sortedStats);
          setTotalUsageTime(statsResponse.data.totalUsageTimeFormatted);
          setTotalApps(statsResponse.data.totalApps);
        } else {
          setError('Failed to fetch app usage statistics');
        }

        if (timelineResponse.data.success) {
          setTimeline(timelineResponse.data.appUsageData);
        }
      } catch (err) {
        setError('Error loading app usage data');
        console.error('Error fetching app usage stats:', err);
        console.error('Error response:', err.response?.data);
      } finally {
        setLoading(false);
      }
    };

    fetchAppUsageStats();
  }, [user._id, dateRange.startDate, dateRange.endDate, dateRange.startTime, dateRange.endTime, refreshTrigger, sortBy, sortOrder]);

  const handleFilterChange = (filters) => {
    setDateRange({
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      startTime: filters.startTime || '',
      endTime: filters.endTime || ''
    });
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearAll = () => {
    setDateRange({
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: ''
    });
    setSortBy('usage');
    setSortOrder('desc');
  };

  const renderTimeline = () => {
    if (timeline.length === 0) {
      return (
        <div className="no-data">
          <p>No timeline data available</p>
        </div>
      );
    }

    // Group timeline by date
    const groupedByDate = timeline.reduce((acc, item) => {
      const date = new Date(item.startTime).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});

    return (
      <div className="timeline-container">
        {Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} className="timeline-day">
            <h3 className="timeline-date">📅 {date}</h3>
            <div className="timeline-items">
              {items.map((item, index) => {
                const appInfo = getAppInfo(item.appName);
                const startTime = new Date(item.startTime);
                const endTime = new Date(item.endTime);
                const duration = Math.floor((endTime - startTime) / 1000);
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const seconds = duration % 60;
                const durationText = hours > 0 
                  ? `${hours}h ${minutes}m ${seconds}s` 
                  : minutes > 0 
                    ? `${minutes}m ${seconds}s` 
                    : `${seconds}s`;

                return (
                  <div key={index} className="timeline-item">
                    <div className="timeline-time">
                      {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
                    </div>
                    <div className="timeline-app">
                      <span className="timeline-app-icon">{appInfo.icon}</span>
                      <span className="timeline-app-name">{appInfo.name}</span>
                      <span className="timeline-duration">{durationText}</span>
                    </div>
                    <div className="timeline-bar" style={{ width: `${Math.min((duration / 3600) * 100, 100)}%` }}></div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCharts = () => {
    if (stats.length === 0) {
      return (
        <div className="no-data">
          <p>No data available for charts</p>
        </div>
      );
    }

    // Prepare data for bar chart
    const barChartData = {
      labels: stats.slice(0, 10).map(app => getAppInfo(app.appName).name),
      datasets: [
        {
          label: 'Usage Time (seconds)',
          data: stats.slice(0, 10).map(app => app.totalUsageTime),
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
        },
      ],
    };

    const barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Top 10 Apps by Usage Time',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const seconds = context.parsed.y;
              const hours = Math.floor(seconds / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              const secs = seconds % 60;
              const timeStr = hours > 0 
                ? `${hours}h ${minutes}m ${secs}s` 
                : minutes > 0 
                  ? `${minutes}m ${secs}s` 
                  : `${secs}s`;
              return `Usage Time: ${timeStr}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Time (seconds)',
          },
        },
      },
    };

    // Prepare data for doughnut chart
    const colors = [
      'rgba(102, 126, 234, 0.8)',
      'rgba(118, 75, 162, 0.8)',
      'rgba(237, 100, 166, 0.8)',
      'rgba(255, 154, 158, 0.8)',
      'rgba(250, 208, 196, 0.8)',
      'rgba(165, 177, 194, 0.8)',
      'rgba(52, 172, 224, 0.8)',
      'rgba(73, 213, 205, 0.8)',
      'rgba(144, 238, 144, 0.8)',
      'rgba(255, 215, 0, 0.8)',
    ];

    const doughnutChartData = {
      labels: stats.slice(0, 10).map(app => getAppInfo(app.appName).name),
      datasets: [
        {
          label: 'Usage Percentage',
          data: stats.slice(0, 10).map(app => parseFloat(app.percentage)),
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 2,
        },
      ],
    };

    const doughnutChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: {
              size: 12,
            },
            padding: 15,
          },
        },
        title: {
          display: true,
          text: 'App Usage Distribution',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed}%`;
            },
          },
        },
      },
    };

    return (
      <div className="charts-container">
        <div className="chart-wrapper">
          <div className="chart-box">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
        <div className="chart-wrapper">
          <div className="chart-box-doughnut">
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content app-usage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 App Usage Statistics - {user.username}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="app-usage-controls">
          <div className="view-mode-toggle">
            <button 
              className={`view-mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              📊 Statistics
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'charts' ? 'active' : ''}`}
              onClick={() => setViewMode('charts')}
            >
              📈 Charts
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              ⏰ Timeline
            </button>
          </div>

          <div className="action-buttons">
            <button className="filter-trigger-btn" onClick={() => setIsFilterOpen(true)}>
              🔍 Filter & Sort
            </button>
            <button className="refresh-btn" onClick={handleRefresh}>
              🔄 Refresh
            </button>
          </div>

          {!loading && (
            <div className="usage-summary">
              <div className="summary-item">
                <span className="summary-label">Total Apps:</span>
                <span className="summary-value">{totalApps}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Usage Time:</span>
                <span className="summary-value">{totalUsageTime}</span>
              </div>
              {dateRange.startDate && (
                <div className="summary-item">
                  <span className="summary-label">📅 Date Range:</span>
                  <span className="summary-value">
                    {new Date(dateRange.startDate).toLocaleDateString()}
                    {dateRange.startTime && ` ${dateRange.startTime}`}
                    {' - '}
                    {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'Now'}
                    {dateRange.endTime && ` ${dateRange.endTime}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-body app-usage-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading app usage data...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={handleRefresh}>Try Again</button>
            </div>
          ) : viewMode === 'charts' ? (
            renderCharts()
          ) : viewMode === 'timeline' ? (
            renderTimeline()
          ) : stats.length === 0 ? (
            <div className="no-data">
              <p>No app usage data available for this user</p>
              <p className="hint">Data will appear once the user starts using applications</p>
            </div>
          ) : (
            <div className="app-usage-list">
              {stats.map((app, index) => {
                const appInfo = getAppInfo(app.appName);
                return (
                  <div key={index} className="app-usage-card">
                    <div className="app-usage-header">
                      <div className="app-name-section">
                        <span className="rank">#{index + 1}</span>
                        <h3 className="app-name">{appInfo.icon} {appInfo.name}</h3>
                      </div>
                      <div className="usage-percentage">
                        {app.percentage}%
                      </div>
                    </div>
                  
                    <div className="app-usage-stats">
                      <div className="stat-item">
                        <span className="stat-label">⏱️ Total Time:</span>
                        <span className="stat-value">{app.totalUsageTimeFormatted}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">🔢 Usage Count:</span>
                        <span className="stat-value">{app.usageCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">📅 Last Used:</span>
                        <span className="stat-value">
                          {new Date(app.lastUsed).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="usage-bar-container">
                      <div 
                        className="usage-bar" 
                        style={{ width: `${app.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)}
        title="Filter & Sort"
        onClearAll={handleClearAll}
      >
        <div className="filter-section">
          <span className="filter-section-title">Date Range Filter</span>
          <DateRangeFilter onFilterChange={handleFilterChange} showTimeFilter={true} />
        </div>
        
        {viewMode === 'stats' && (
          <div className="filter-section">
            <span className="filter-section-title">Sort Options</span>
            <SortControls 
              sortBy={sortBy} 
              sortOrder={sortOrder} 
              onSortChange={handleSortChange}
            />
          </div>
        )}
      </FilterPanel>
    </div>
  );
}

export default AppUsage;
