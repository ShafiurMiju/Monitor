// admin-dashboard/src/pages/MouseTrackingPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://103.130.11.114:3001";

function MouseTrackingPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap');
  const [sessionLimit, setSessionLimit] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchUser();
    fetchSessions();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sessionLimit]);

  useEffect(() => {
    if (selectedSession) {
      renderVisualization();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, viewMode]);

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
      const response = await axios.get(`${SERVER_URL}/api/mouse-tracking/${userId}?limit=${sessionLimit}`);
      if (response.data.success) {
        setSessions(response.data.trackingData);
        setHasMore(response.data.trackingData.length >= sessionLimit);
        if (response.data.trackingData.length > 0 && !selectedSession) {
          setSelectedSession(response.data.trackingData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch mouse tracking sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSessions = () => {
    setSessionLimit(prev => prev + 1);
  };

  const resetToLastSession = () => {
    setSessionLimit(1);
    if (sessions.length > 0) {
      setSelectedSession(sessions[0]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/mouse-tracking/${userId}/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const renderVisualization = () => {
    if (!selectedSession || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = selectedSession.screenResolution;

    canvas.width = 1200;
    canvas.height = (1200 * height) / width;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    if (viewMode === 'heatmap') {
      renderHeatmap(ctx, scaleX, scaleY);
    } else if (viewMode === 'movement') {
      renderMovementPath(ctx, scaleX, scaleY);
    } else if (viewMode === 'clicks') {
      renderClicks(ctx, scaleX, scaleY);
    }
  };

  const renderHeatmap = (ctx, scaleX, scaleY) => {
    const { movements, clicks } = selectedSession;
    const heatmapData = new Map();
    const gridSize = 20;

    movements.forEach(m => {
      const gridX = Math.floor(m.x / gridSize);
      const gridY = Math.floor(m.y / gridSize);
      const key = `${gridX},${gridY}`;
      heatmapData.set(key, (heatmapData.get(key) || 0) + 1);
    });

    let maxIntensity = 0;
    heatmapData.forEach(value => {
      if (value > maxIntensity) maxIntensity = value;
    });

    heatmapData.forEach((intensity, key) => {
      const [gridX, gridY] = key.split(',').map(Number);
      const alpha = intensity / maxIntensity;
      
      let r, g, b;
      if (alpha < 0.5) {
        r = 0;
        g = Math.floor(alpha * 2 * 255);
        b = 255;
      } else {
        r = Math.floor((alpha - 0.5) * 2 * 255);
        g = 255 - Math.floor((alpha - 0.5) * 2 * 255);
        b = 0;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`;
      ctx.fillRect(
        gridX * gridSize * scaleX,
        gridY * gridSize * scaleY,
        gridSize * scaleX,
        gridSize * scaleY
      );
    });

    clicks.forEach(click => {
      const x = click.x * scaleX;
      const y = click.y * scaleY;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
      gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 15, y - 15, 30, 30);
    });
  };

  const renderMovementPath = (ctx, scaleX, scaleY) => {
    const { movements } = selectedSession;
    if (movements.length === 0) return;

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    
    movements.forEach((m, index) => {
      const x = m.x * scaleX;
      const y = m.y * scaleY;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    const start = movements[0];
    const end = movements[movements.length - 1];
    
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(start.x * scaleX, start.y * scaleY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(end.x * scaleX, end.y * scaleY, 8, 0, Math.PI * 2);
    ctx.fill();
  };

  const renderClicks = (ctx, scaleX, scaleY) => {
    const { clicks } = selectedSession;
    
    clicks.forEach(click => {
      const x = click.x * scaleX;
      const y = click.y * scaleY;
      
      const color = click.button === 'left' ? '#00ff88' : '#ff0088';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
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
              <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Mouse Tracking</h1>
                <p className="text-xs text-gray-600">{user?.username || 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600 text-sm mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600 text-sm mb-1">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalClicks}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600 text-sm mb-1">Total Movements</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalMovements}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600 text-sm mb-1">Avg Distance</p>
              <p className="text-3xl font-bold text-gray-900">{stats.avgDistance?.toFixed(0)}px</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 font-semibold">Sessions</h2>
              {sessionLimit > 1 && (
                <button
                  onClick={resetToLastSession}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                  title="Reset to last session"
                >
                  Reset
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No sessions found</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {sessions.map((session) => (
                    <button
                      key={session._id}
                      onClick={() => setSelectedSession(session)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedSession?._id === session._id
                          ? 'bg-primary text-white'
                          : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {new Date(session.startTime).toLocaleDateString()}
                      </p>
                      <p className="text-xs opacity-75">
                        {new Date(session.startTime).toLocaleTimeString()}
                      </p>
                      <p className="text-xs opacity-75 mt-1">
                        {session.movements.length} movements, {session.clicks.length} clicks
                      </p>
                    </button>
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={loadMoreSessions}
                    className="w-full py-2 px-4 bg-accent hover:bg-accent/70 text-gray-900 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                  >
                    Load More Sessions
                  </button>
                )}
              </>
            )}
          </div>

          {/* Visualization */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 font-semibold">Visualization</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'heatmap'
                      ? 'bg-primary text-gray-900'
                      : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                  }`}
                >
                  Heatmap
                </button>
                <button
                  onClick={() => setViewMode('movement')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'movement'
                      ? 'bg-primary text-gray-900'
                      : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                  }`}
                >
                  Movement
                </button>
                <button
                  onClick={() => setViewMode('clicks')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'clicks'
                      ? 'bg-primary text-gray-900'
                      : 'bg-accent text-gray-900 hover:bg-accent/70 border border-gray-200'
                  }`}
                >
                  Clicks
                </button>
              </div>
            </div>

            {selectedSession ? (
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                <canvas 
                  ref={canvasRef}
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg flex items-center justify-center aspect-video">
                <p className="text-gray-600">Select a session to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MouseTrackingPage;
