import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './MouseTracking.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

function MouseTracking({ user, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap', 'movement', 'clicks', 'scrolls'
  const canvasRef = useRef(null);
  const movementChartRef = useRef(null);
  const clickChartRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (selectedSession) {
      renderVisualization();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, viewMode]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SERVER_URL}/api/mouse-tracking/${user._id}?limit=20`);
      if (response.data.success) {
        setSessions(response.data.trackingData);
        if (response.data.trackingData.length > 0) {
          setSelectedSession(response.data.trackingData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch mouse tracking sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/mouse-tracking/${user._id}/stats`);
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

    // Set canvas size
    canvas.width = 1200;
    canvas.height = (1200 * height) / width;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    if (viewMode === 'heatmap') {
      renderHeatmap(ctx, scaleX, scaleY);
    } else if (viewMode === 'movement') {
      renderMovementPath(ctx, scaleX, scaleY);
    } else if (viewMode === 'clicks') {
      renderClicks(ctx, scaleX, scaleY);
    } else if (viewMode === 'scrolls') {
      renderScrolls(ctx, scaleX, scaleY);
    }

    // Render graphs
    renderMovementGraph();
    renderClickGraph();
  };

  const renderHeatmap = (ctx, scaleX, scaleY) => {
    const { movements, clicks } = selectedSession;
    
    // Create heatmap from movements
    const heatmapData = new Map();
    const gridSize = 20;

    // Add movements to heatmap
    movements.forEach(m => {
      const gridX = Math.floor(m.x / gridSize);
      const gridY = Math.floor(m.y / gridSize);
      const key = `${gridX},${gridY}`;
      heatmapData.set(key, (heatmapData.get(key) || 0) + 1);
    });

    // Find max intensity
    let maxIntensity = 0;
    heatmapData.forEach(value => {
      if (value > maxIntensity) maxIntensity = value;
    });

    // Draw heatmap
    heatmapData.forEach((intensity, key) => {
      const [gridX, gridY] = key.split(',').map(Number);
      const alpha = intensity / maxIntensity;
      
      // Color gradient from blue (low) to red (high)
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

    // Draw clicks as bright spots
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
    ctx.globalAlpha = 0.3;
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

    // Draw start and end points
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
      
      // Different colors for different buttons
      let color;
      if (click.button === 'left') color = '#00ff88';
      else if (click.button === 'right') color = '#ff0088';
      else color = '#ffaa00';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw pulse effect
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });
  };

  const renderScrolls = (ctx, scaleX, scaleY) => {
    const { scrolls, movements } = selectedSession;
    
    // Create a map of scroll events over time
    const scrollMap = new Map();
    scrolls.forEach(scroll => {
      const time = new Date(scroll.timestamp).getTime();
      scrollMap.set(time, scroll);
    });

    // Find approximate positions for scrolls based on nearby movements
    scrolls.forEach(scroll => {
      const scrollTime = new Date(scroll.timestamp).getTime();
      
      // Find nearest movement
      let nearestMovement = movements[0];
      let minTimeDiff = Math.abs(new Date(movements[0].timestamp).getTime() - scrollTime);
      
      movements.forEach(m => {
        const timeDiff = Math.abs(new Date(m.timestamp).getTime() - scrollTime);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nearestMovement = m;
        }
      });

      if (nearestMovement) {
        const x = nearestMovement.x * scaleX;
        const y = nearestMovement.y * scaleY;
        
        // Draw scroll indicator
        const direction = scroll.deltaY > 0 ? -1 : 1;
        const arrowSize = Math.min(Math.abs(scroll.deltaY) * 0.5, 30);
        
        ctx.fillStyle = scroll.deltaY > 0 ? '#ff6b6b' : '#4ecdc4';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw arrow
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - arrowSize * direction);
        ctx.lineTo(x, y + arrowSize * direction);
        ctx.lineTo(x - 5, y + (arrowSize - 10) * direction);
        ctx.moveTo(x, y + arrowSize * direction);
        ctx.lineTo(x + 5, y + (arrowSize - 10) * direction);
        ctx.stroke();
      }
    });
  };

  const renderMovementGraph = () => {
    if (!movementChartRef.current || !selectedSession) return;

    const canvas = movementChartRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { movements } = selectedSession;
    if (movements.length === 0) return;

    // Group movements by time buckets (1 second intervals)
    const bucketSize = 1000; // 1 second
    const startTime = new Date(movements[0].timestamp).getTime();
    const endTime = new Date(movements[movements.length - 1].timestamp).getTime();
    const duration = endTime - startTime;
    const buckets = Math.ceil(duration / bucketSize);
    
    const bucketCounts = new Array(buckets).fill(0);
    
    movements.forEach(m => {
      const time = new Date(m.timestamp).getTime();
      const bucketIndex = Math.floor((time - startTime) / bucketSize);
      if (bucketIndex >= 0 && bucketIndex < buckets) {
        bucketCounts[bucketIndex]++;
      }
    });

    const maxCount = Math.max(...bucketCounts, 1);
    const barWidth = canvas.width / buckets;

    // Draw bars
    bucketCounts.forEach((count, index) => {
      const barHeight = (count / maxCount) * (canvas.height - 40);
      const x = index * barWidth;
      const y = canvas.height - barHeight - 20;

      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - 20);
      gradient.addColorStop(0, '#00ff88');
      gradient.addColorStop(1, '#00aa55');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    });

    // Draw axis labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Movement Activity Over Time', 10, 15);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(duration / 1000)}s`, canvas.width - 10, canvas.height - 5);
  };

  const renderClickGraph = () => {
    if (!clickChartRef.current || !selectedSession) return;

    const canvas = clickChartRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { clicks } = selectedSession;
    
    // Count click types
    let leftClicks = 0;
    let rightClicks = 0;
    let middleClicks = 0;

    clicks.forEach(click => {
      if (click.button === 'left') leftClicks++;
      else if (click.button === 'right') rightClicks++;
      else middleClicks++;
    });

    const total = leftClicks + rightClicks + middleClicks;
    if (total === 0) return;

    // Draw pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    let currentAngle = -Math.PI / 2;

    // Left clicks
    if (leftClicks > 0) {
      const angle = (leftClicks / total) * Math.PI * 2;
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
      ctx.closePath();
      ctx.fill();
      currentAngle += angle;
    }

    // Right clicks
    if (rightClicks > 0) {
      const angle = (rightClicks / total) * Math.PI * 2;
      ctx.fillStyle = '#ff0088';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
      ctx.closePath();
      ctx.fill();
      currentAngle += angle;
    }

    // Middle clicks
    if (middleClicks > 0) {
      const angle = (middleClicks / total) * Math.PI * 2;
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
      ctx.closePath();
      ctx.fill();
    }

    // Draw legend
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    let legendY = 20;

    ctx.fillStyle = '#00ff88';
    ctx.fillRect(10, legendY - 10, 15, 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Left: ${leftClicks}`, 30, legendY);
    legendY += 25;

    ctx.fillStyle = '#ff0088';
    ctx.fillRect(10, legendY - 10, 15, 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Right: ${rightClicks}`, 30, legendY);
    legendY += 25;

    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(10, legendY - 10, 15, 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Middle: ${middleClicks}`, 30, legendY);
  };

  const formatDuration = (startTime, endTime) => {
    const duration = new Date(endTime) - new Date(startTime);
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="mouse-tracking-modal">
      <div className="mouse-tracking-content">
        <div className="mouse-tracking-header">
          <h2>🖱️ Mouse Tracking - {user.username}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading mouse tracking data...</p>
          </div>
        ) : (
          <div className="mouse-tracking-body">
            {/* Statistics Panel */}
            {stats && (
              <div className="stats-panel">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalSessions}</div>
                    <div className="stat-label">Total Sessions</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🖱️</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalMovements.toLocaleString()}</div>
                    <div className="stat-label">Mouse Movements</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👆</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalClicks.toLocaleString()}</div>
                    <div className="stat-label">Total Clicks</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⬅️</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalLeftClicks.toLocaleString()}</div>
                    <div className="stat-label">Left Clicks</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">➡️</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalRightClicks.toLocaleString()}</div>
                    <div className="stat-label">Right Clicks</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalMiddleClicks.toLocaleString()}</div>
                    <div className="stat-label">Middle Clicks</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📜</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalScrolls.toLocaleString()}</div>
                    <div className="stat-label">Scroll Events</div>
                  </div>
                </div>
              </div>
            )}

            {/* Session List */}
            <div className="session-selector">
              <label>Select Session:</label>
              <select 
                value={selectedSession?._id || ''} 
                onChange={(e) => {
                  const session = sessions.find(s => s._id === e.target.value);
                  setSelectedSession(session);
                }}
              >
                {sessions.map(session => (
                  <option key={session._id} value={session._id}>
                    {new Date(session.startTime).toLocaleString()} - 
                    {formatDuration(session.startTime, session.endTime)} - 
                    {session.movements.length} movements, {session.clicks.length} clicks
                  </option>
                ))}
              </select>
            </div>

            {selectedSession && (
              <>
                {/* View Mode Selector */}
                <div className="view-mode-selector">
                  <button 
                    className={viewMode === 'heatmap' ? 'active' : ''}
                    onClick={() => setViewMode('heatmap')}
                  >
                    🔥 Heatmap
                  </button>
                  <button 
                    className={viewMode === 'movement' ? 'active' : ''}
                    onClick={() => setViewMode('movement')}
                  >
                    🛤️ Movement Path
                  </button>
                  <button 
                    className={viewMode === 'clicks' ? 'active' : ''}
                    onClick={() => setViewMode('clicks')}
                  >
                    👆 Clicks
                  </button>
                  <button 
                    className={viewMode === 'scrolls' ? 'active' : ''}
                    onClick={() => setViewMode('scrolls')}
                  >
                    📜 Scrolls
                  </button>
                </div>

                {/* Canvas Visualization */}
                <div className="visualization-container">
                  <canvas ref={canvasRef} className="visualization-canvas"></canvas>
                </div>

                {/* Session Details */}
                <div className="session-details">
                  <h3>Session Details</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        {formatDuration(selectedSession.startTime, selectedSession.endTime)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Resolution:</span>
                      <span className="detail-value">
                        {selectedSession.screenResolution.width} × {selectedSession.screenResolution.height}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Movements:</span>
                      <span className="detail-value">{selectedSession.movements.length.toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Left Clicks:</span>
                      <span className="detail-value">
                        {selectedSession.clicks.filter(c => c.button === 'left').length}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Right Clicks:</span>
                      <span className="detail-value">
                        {selectedSession.clicks.filter(c => c.button === 'right').length}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Scroll Events:</span>
                      <span className="detail-value">{selectedSession.scrolls.length}</span>
                    </div>
                  </div>
                </div>

                {/* Graphs */}
                <div className="graphs-container">
                  <div className="graph-card">
                    <h3>Movement Activity</h3>
                    <canvas ref={movementChartRef} className="chart-canvas"></canvas>
                  </div>
                  <div className="graph-card">
                    <h3>Click Distribution</h3>
                    <canvas ref={clickChartRef} className="chart-canvas"></canvas>
                  </div>
                </div>
              </>
            )}

            {sessions.length === 0 && (
              <div className="no-data">
                <p>No mouse tracking data available for this user yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MouseTracking;
