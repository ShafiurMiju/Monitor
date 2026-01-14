// admin-dashboard/src/pages/UserDetails.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://103.130.11.114:3001";

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
  const [doubleScreenEnabled, setDoubleScreenEnabled] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [totalScreens, setTotalScreens] = useState(1);
  const streamContainerRef = useRef(null);
  const [summaryData, setSummaryData] = useState({
    mouse: [],
    keystroke: [],
    appUsage: []
  });

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const today = new Date();
        // Format date as YYYY-MM-DD
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Fetch data from all three APIs with date filtering
        const [mouseResponse, keystrokeResponse, appUsageResponse] = await Promise.all([
          axios.get(`${SERVER_URL}/api/mouse-tracking/${userId}?limit=1&startDate=${todayStr}&endDate=${todayStr}`).catch(err => ({ data: { success: false, trackingData: [] } })),
          axios.get(`${SERVER_URL}/api/keystroke-tracking/${userId}?limit=50&startDate=${todayStr}&endDate=${todayStr}`).catch(err => ({ data: { success: false, data: [] } })),
          axios.get(`${SERVER_URL}/api/app-usage/${userId}?limit=100&startDate=${todayStr}`).catch(err => ({ data: { success: false, appUsageData: [] } }))
        ]);

        console.log('Mouse data:', mouseResponse.data);
        console.log('Keystroke data:', keystrokeResponse.data);
        console.log('App usage data:', appUsageResponse.data);

        // Get today's date range for filtering
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filter data for today
        const filterTodayData = (data) => {
          if (!data || !Array.isArray(data)) return [];
          return data.filter(item => {
            const itemDate = new Date(item.timestamp || item.startTime || item.createdAt);
            return itemDate >= today && itemDate < tomorrow;
          });
        };

        // Process keystroke data - extract individual keystrokes from sessions
        const processKeystrokeData = (sessions) => {
          if (!sessions || !Array.isArray(sessions)) return [];
          const allKeystrokes = [];
          sessions.forEach(session => {
            if (session.keystrokes && Array.isArray(session.keystrokes)) {
              session.keystrokes.forEach(keystroke => {
                const keystrokeDate = new Date(keystroke.timestamp);
                if (keystrokeDate >= today && keystrokeDate < tomorrow) {
                  allKeystrokes.push({
                    ...keystroke,
                    sessionId: session.sessionId,
                    appName: keystroke.appName
                  });
                }
              });
            }
          });
          return allKeystrokes;
        };

        // Process mouse tracking data - extract individual clicks from sessions
        const processMouseTrackingData = (sessions) => {
          if (!sessions || !Array.isArray(sessions)) return [];
          const allClicks = [];
          sessions.forEach(session => {
            if (session.clicks && Array.isArray(session.clicks)) {
              session.clicks.forEach(click => {
                const clickDate = new Date(click.timestamp);
                if (clickDate >= today && clickDate < tomorrow) {
                  allClicks.push({
                    ...click,
                    sessionId: session.sessionId
                  });
                }
              });
            }
          });
          return allClicks;
        };

        setSummaryData({
          mouse: mouseResponse.data.success ? processMouseTrackingData(mouseResponse.data.trackingData) : [],
          keystroke: keystrokeResponse.data.success ? processKeystrokeData(keystrokeResponse.data.data) : [],
          appUsage: appUsageResponse.data.success ? filterTodayData(appUsageResponse.data.appUsageData) : []
        });
      } catch (error) {
        console.error('Error fetching summary data:', error);
      }
    };

    fetchSummaryData();
  }, [userId]);

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
          setDoubleScreenEnabled(response.data.settings.doubleScreenEnabled || false);
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
      if (data.totalScreens !== undefined) {
        setTotalScreens(data.totalScreens);
      }
      if (data.screenIndex !== undefined) {
        setCurrentScreen(data.screenIndex);
      }
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
    setCurrentScreen(0);
    setTotalScreens(1);
  };

  const switchScreen = (screenIndex) => {
    setCurrentScreen(screenIndex);
    socket.emit('request_switch_screen', { 
      targetDeviceId: user.deviceId,
      screenIndex: screenIndex 
    });
  };

  // Prepare combined chart data for all activities
  const getCombinedChartData = () => {
    const hourlyMouse = {};
    const hourlyKeystroke = {};
    const hourlyAppUsage = {};
    const allHours = new Set();

    // Process mouse data - count individual clicks
    if (summaryData.mouse && summaryData.mouse.length > 0) {
      summaryData.mouse.forEach(click => {
        const timestamp = click.timestamp;
        if (timestamp) {
          const hour = new Date(timestamp).getHours();
          const label = `${hour.toString().padStart(2, '0')}:00`;
          hourlyMouse[label] = (hourlyMouse[label] || 0) + 1;
          allHours.add(label);
        }
      });
    }

    // Process keystroke data
    if (summaryData.keystroke && summaryData.keystroke.length > 0) {
      summaryData.keystroke.forEach(item => {
        const timestamp = item.timestamp;
        if (timestamp) {
          const hour = new Date(timestamp).getHours();
          const label = `${hour.toString().padStart(2, '0')}:00`;
          hourlyKeystroke[label] = (hourlyKeystroke[label] || 0) + 1;
          allHours.add(label);
        }
      });
    }

    // Process app usage data
    if (summaryData.appUsage && summaryData.appUsage.length > 0) {
      summaryData.appUsage.forEach(item => {
        const timestamp = item.timestamp || item.startTime || item.createdAt;
        if (timestamp) {
          const hour = new Date(timestamp).getHours();
          const label = `${hour.toString().padStart(2, '0')}:00`;
          const minutes = (item.duration || 0) / 60;
          hourlyAppUsage[label] = (hourlyAppUsage[label] || 0) + minutes;
          allHours.add(label);
        }
      });
    }

    const labels = Array.from(allHours).sort();

    return {
      labels,
      datasets: [
        {
          label: 'Mouse Events',
          data: labels.map(label => hourlyMouse[label] || 0),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        },
        {
          label: 'Keystrokes',
          data: labels.map(label => hourlyKeystroke[label] || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        },
        {
          label: 'App Usage (minutes)',
          data: labels.map(label => Math.round(hourlyAppUsage[label] || 0)),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  // Analyze performance based on activity data
  const analyzePerformance = () => {
    const totalMouse = summaryData.mouse?.reduce((acc, item) => {
      return acc + (item.clicks || item.clickCount || 0);
    }, 0) || 0;
    
    // For keystrokes, just count each keystroke entry as 1
    const totalKeystrokes = summaryData.keystroke?.length || 0;
    
    const totalAppMinutes = summaryData.appUsage?.reduce((acc, item) => {
      return acc + ((item.duration || 0) / 60);
    }, 0) || 0;

    // Define thresholds
    const mouseThreshold = { good: 500, average: 200 };
    const keystrokeThreshold = { good: 1000, average: 400 };
    const appUsageThreshold = { good: 120, average: 60 }; // minutes

    // Calculate individual scores
    let mouseScore = 0;
    if (totalMouse >= mouseThreshold.good) mouseScore = 3;
    else if (totalMouse >= mouseThreshold.average) mouseScore = 2;
    else if (totalMouse > 0) mouseScore = 1;

    let keystrokeScore = 0;
    if (totalKeystrokes >= keystrokeThreshold.good) keystrokeScore = 3;
    else if (totalKeystrokes >= keystrokeThreshold.average) keystrokeScore = 2;
    else if (totalKeystrokes > 0) keystrokeScore = 1;

    let appUsageScore = 0;
    if (totalAppMinutes >= appUsageThreshold.good) appUsageScore = 3;
    else if (totalAppMinutes >= appUsageThreshold.average) appUsageScore = 2;
    else if (totalAppMinutes > 0) appUsageScore = 1;

    // Calculate average score
    const avgScore = (mouseScore + keystrokeScore + appUsageScore) / 3;

    let performance = 'No Activity';
    let performanceColor = 'gray';
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-700';
    let borderColor = 'border-gray-300';

    if (avgScore >= 2.5) {
      performance = 'Good';
      performanceColor = 'green';
      bgColor = 'bg-secondary/10';
      textColor = 'text-secondary';
      borderColor = 'border-secondary';
    } else if (avgScore >= 1.5) {
      performance = 'Average';
      performanceColor = 'yellow';
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-700';
      borderColor = 'border-yellow-400';
    } else if (avgScore > 0) {
      performance = 'Low';
      performanceColor = 'red';
      bgColor = 'bg-error/10';
      textColor = 'text-error';
      borderColor = 'border-error';
    }

    return {
      performance,
      performanceColor,
      bgColor,
      textColor,
      borderColor,
      totalMouse,
      totalKeystrokes,
      totalAppMinutes: Math.round(totalAppMinutes),
      mouseScore,
      keystrokeScore,
      appUsageScore
    };
  };

  const performanceData = analyzePerformance();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
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
                  <p className="text-gray-900">{user.computerName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Device ID</p>
                  <p className="text-gray-900 font-mono text-xs truncate" title={user.deviceId}>
                    {user.deviceId ? `${user.deviceId.substring(0, 40)}...` : 'N/A'}
                  </p>
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

                <button
                  onClick={() => navigate(`/user/${userId}/keystroke-tracking`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-accent hover:bg-accent/70 text-gray-900 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-primary"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <span>Keystroke Tracking</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Total Summary Section */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Total Summary - Today</h2>
              
              {/* Performance Analysis */}
              <div className={`mb-6 p-4 rounded-lg border-2 ${performanceData.borderColor} ${performanceData.bgColor}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Overall Performance</h3>
                    <div className={`text-3xl font-bold ${performanceData.textColor}`}>
                      {performanceData.performance}
                    </div>
                  </div>
                  <div className={`w-16 h-16 rounded-full ${performanceData.bgColor} border-2 ${performanceData.borderColor} flex items-center justify-center`}>
                    {performanceData.performance === 'Good' && (
                      <svg className="w-8 h-8 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {performanceData.performance === 'Average' && (
                      <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                    )}
                    {performanceData.performance === 'Low' && (
                      <svg className="w-8 h-8 text-error" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {performanceData.performance === 'No Activity' && (
                      <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Mouse Events</p>
                    <p className="text-lg font-bold text-gray-900">{performanceData.totalMouse.toLocaleString()}</p>
                    <div className="flex items-center justify-center mt-1">
                      {performanceData.mouseScore === 3 && <span className="text-xs text-secondary">● ● ●</span>}
                      {performanceData.mouseScore === 2 && <span className="text-xs text-yellow-600">● ● ○</span>}
                      {performanceData.mouseScore === 1 && <span className="text-xs text-error">● ○ ○</span>}
                      {performanceData.mouseScore === 0 && <span className="text-xs text-gray-400">○ ○ ○</span>}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Keystrokes</p>
                    <p className="text-lg font-bold text-gray-900">{performanceData.totalKeystrokes.toLocaleString()}</p>
                    <div className="flex items-center justify-center mt-1">
                      {performanceData.keystrokeScore === 3 && <span className="text-xs text-secondary">● ● ●</span>}
                      {performanceData.keystrokeScore === 2 && <span className="text-xs text-yellow-600">● ● ○</span>}
                      {performanceData.keystrokeScore === 1 && <span className="text-xs text-error">● ○ ○</span>}
                      {performanceData.keystrokeScore === 0 && <span className="text-xs text-gray-400">○ ○ ○</span>}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">App Usage</p>
                    <p className="text-lg font-bold text-gray-900">{performanceData.totalAppMinutes} min</p>
                    <div className="flex items-center justify-center mt-1">
                      {performanceData.appUsageScore === 3 && <span className="text-xs text-secondary">● ● ●</span>}
                      {performanceData.appUsageScore === 2 && <span className="text-xs text-yellow-600">● ● ○</span>}
                      {performanceData.appUsageScore === 1 && <span className="text-xs text-error">● ○ ○</span>}
                      {performanceData.appUsageScore === 0 && <span className="text-xs text-gray-400">○ ○ ○</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Activity Chart */}
              <div className="h-96">
                <Line data={getCombinedChartData()} options={chartOptions} />
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
                    Machine: <span className="font-medium text-gray-900">{user.computerName || 'Unknown'}</span>
                  </span>
                  
                  {/* Screen Info and Switcher - Only show if double screen is enabled */}
                  {doubleScreenEnabled && (
                    <div className="flex items-center space-x-3 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200">
                      {totalScreens > 1 ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              {totalScreens} Screens Available
                            </span>
                          </div>
                          <div className="h-4 w-px bg-gray-300"></div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600">Viewing:</span>
                            {[...Array(totalScreens)].map((_, index) => (
                              <button
                                key={index}
                                onClick={() => switchScreen(index)}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm inline-flex items-center space-x-1 ${
                                  currentScreen === index
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Screen {index + 1}</span>
                                {currentScreen === index && (
                                  <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">Single Screen Detected</span>
                        </div>
                      )}
                    </div>
                  )}
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
