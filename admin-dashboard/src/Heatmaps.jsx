import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './Heatmaps.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

function Heatmaps({ user, onClose }) {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap', 'clicks', 'all'
  const [dateRange, setDateRange] = useState('today'); // 'today', 'week', 'month', 'all'
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    fetchMouseActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange]);

  useEffect(() => {
    if (activities.length > 0) {
      drawHeatmap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, viewMode, resolution]);

  const fetchMouseActivity = async () => {
    try {
      setLoading(true);
      setError('');

      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // Build query params
      const params = {
        limit: 10000
      };
      
      if (startDate) {
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      // Fetch activities
      const response = await axios.get(
        `${SERVER_URL}/api/mouse-activity/${user._id}`,
        { params }
      );

      if (response.data.success) {
        setActivities(response.data.activities);
        
        // Detect most common resolution
        if (response.data.activities.length > 0) {
          const resolutions = {};
          response.data.activities.forEach(act => {
            const key = `${act.screenWidth}x${act.screenHeight}`;
            resolutions[key] = (resolutions[key] || 0) + 1;
          });
          
          const mostCommon = Object.entries(resolutions).sort((a, b) => b[1] - a[1])[0];
          if (mostCommon) {
            const [width, height] = mostCommon[0].split('x').map(Number);
            setResolution({ width, height });
          }
        }
      }

      // Fetch statistics
      const statsResponse = await axios.get(
        `${SERVER_URL}/api/mouse-activity/${user._id}/stats`,
        { 
          params: startDate ? {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          } : {}
        }
      );

      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }

    } catch {
      setError('Failed to load mouse activity data');
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    
    if (!canvas || !overlayCanvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    // Set canvas size to match detected resolution
    const canvasWidth = 1200;
    const canvasHeight = Math.round((resolution.height / resolution.width) * canvasWidth);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    overlayCanvas.width = canvasWidth;
    overlayCanvas.height = canvasHeight;

    // Clear canvases
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Add background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#ddd';
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    if (activities.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No mouse activity data available', canvasWidth / 2, canvasHeight / 2);
      return;
    }

    console.log('Drawing heatmap with', activities.length, 'activities');
    console.log('Resolution:', resolution);
    console.log('Canvas size:', canvasWidth, 'x', canvasHeight);

    // Filter activities based on view mode
    let filteredActivities = activities;
    if (viewMode === 'clicks') {
      filteredActivities = activities.filter(act => 
        act.eventType === 'click' || act.eventType === 'rightclick' || act.eventType === 'doubleclick'
      );
    } else if (viewMode === 'heatmap') {
      filteredActivities = activities.filter(act => act.eventType === 'move');
    }

    console.log('Filtered activities:', filteredActivities.length, 'for mode:', viewMode);
    console.log('Sample activity:', filteredActivities[0]);

    // Create heatmap data
    const scaleX = canvasWidth / resolution.width;
    const scaleY = canvasHeight / resolution.height;

    console.log('Scale factors:', scaleX, scaleY);

    if (viewMode === 'heatmap' || viewMode === 'all') {
      // Draw heatmap for movements
      const moveActivities = filteredActivities.filter(act => act.eventType === 'move');
      console.log('Drawing heatmap with', moveActivities.length, 'move events');
      
      if (moveActivities.length > 0) {
        const heatmapData = createHeatmapData(
          moveActivities,
          canvasWidth,
          canvasHeight,
          scaleX,
          scaleY
        );

        console.log('Heatmap data created, grid size:', heatmapData.length, 'x', heatmapData[0]?.length);
        drawHeatmapLayer(ctx, heatmapData);
      } else {
        console.log('No move activities to draw');
      }
    }

    // Draw clicks as circles on overlay
    if (viewMode === 'clicks' || viewMode === 'all') {
      const clickActivities = activities.filter(act => 
        act.eventType === 'click' || act.eventType === 'rightclick' || act.eventType === 'doubleclick'
      );

      clickActivities.forEach(act => {
        const x = Math.round(act.x * scaleX);
        const y = Math.round(act.y * scaleY);

        overlayCtx.beginPath();
        overlayCtx.arc(x, y, 8, 0, 2 * Math.PI);
        
        if (act.eventType === 'rightclick') {
          overlayCtx.fillStyle = 'rgba(255, 165, 0, 0.6)'; // Orange for right click
        } else if (act.eventType === 'doubleclick') {
          overlayCtx.fillStyle = 'rgba(138, 43, 226, 0.6)'; // Purple for double click
        } else {
          overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.6)'; // Red for regular click
        }
        
        overlayCtx.fill();
        overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        overlayCtx.lineWidth = 2;
        overlayCtx.stroke();
      });
    }
  };

  const createHeatmapData = (movements, width, height, scaleX, scaleY) => {
    const gridSize = 20; // pixels
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);
    const grid = Array(rows).fill().map(() => Array(cols).fill(0));

    console.log('Creating heatmap grid:', rows, 'rows x', cols, 'cols');

    movements.forEach((act, index) => {
      const x = Math.round(act.x * scaleX);
      const y = Math.round(act.y * scaleY);
      const col = Math.floor(x / gridSize);
      const row = Math.floor(y / gridSize);

      if (index < 5) {
        console.log('Activity', index, '- Original:', act.x, act.y, '| Scaled:', x, y, '| Grid:', row, col);
      }

      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col]++;
      }
    });

    // Log some statistics
    let maxValue = 0;
    let totalCells = 0;
    grid.forEach(row => {
      row.forEach(val => {
        if (val > 0) totalCells++;
        if (val > maxValue) maxValue = val;
      });
    });
    console.log('Grid stats - Max value:', maxValue, '| Active cells:', totalCells);

    return grid;
  };

  const drawHeatmapLayer = (ctx, heatmapData) => {
    const gridSize = 20;
    const rows = heatmapData.length;
    const cols = heatmapData[0].length;

    // Find max value for normalization
    let maxValue = 0;
    heatmapData.forEach(row => {
      row.forEach(val => {
        if (val > maxValue) maxValue = val;
      });
    });

    if (maxValue === 0) return;

    // Draw heatmap
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = heatmapData[row][col];
        if (value > 0) {
          const intensity = value / maxValue;
          const color = getHeatmapColor(intensity);
          
          ctx.fillStyle = color;
          ctx.fillRect(col * gridSize, row * gridSize, gridSize, gridSize);
        }
      }
    }
  };

  const getHeatmapColor = (intensity) => {
    // Gradient from blue (low) to red (high)
    const colors = [
      { r: 0, g: 0, b: 255 },      // Blue
      { r: 0, g: 255, b: 255 },    // Cyan
      { r: 0, g: 255, b: 0 },      // Green
      { r: 255, g: 255, b: 0 },    // Yellow
      { r: 255, g: 165, b: 0 },    // Orange
      { r: 255, g: 0, b: 0 }       // Red
    ];

    const index = intensity * (colors.length - 1);
    const i1 = Math.floor(index);
    const i2 = Math.min(i1 + 1, colors.length - 1);
    const ratio = index - i1;

    const c1 = colors[i1];
    const c2 = colors[i2];

    const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  };

  return (
    <div className="heatmaps-modal">
      <div className="heatmaps-content">
        <div className="heatmaps-header">
          <h2>🔥 Mouse Activity Heatmaps - {user.username}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="heatmaps-controls">
          <div className="control-group">
            <label>View Mode:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <option value="heatmap">Heatmap (Movements)</option>
              <option value="clicks">Click Map</option>
              <option value="all">All Activity</option>
            </select>
          </div>

          <div className="control-group">
            <label>Date Range:</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <button className="refresh-btn" onClick={fetchMouseActivity} disabled={loading}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading mouse activity data...</p>
          </div>
        ) : (
          <>
            <div className="stats-panel">
              <div className="stat-item">
                <span className="stat-label">Total Events:</span>
                <span className="stat-value">{activities.length.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Mouse Moves:</span>
                <span className="stat-value">{(stats.move || 0).toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Clicks:</span>
                <span className="stat-value">{(stats.click || 0).toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Right Clicks:</span>
                <span className="stat-value">{(stats.rightclick || 0).toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Scrolls:</span>
                <span className="stat-value">{(stats.scroll || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="legend">
              {viewMode === 'heatmap' && (
                <div className="legend-item">
                  <span className="legend-text">
                    <strong>Heatmap:</strong> Blue = Low Activity, Red = High Activity
                  </span>
                </div>
              )}
              {(viewMode === 'clicks' || viewMode === 'all') && (
                <>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: 'rgba(255, 0, 0, 0.6)' }}></span>
                    <span className="legend-text">Left Click</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: 'rgba(255, 165, 0, 0.6)' }}></span>
                    <span className="legend-text">Right Click</span>
                  </div>
                </>
              )}
            </div>

            <div className="canvas-container">
              <canvas ref={canvasRef} className="heatmap-canvas"></canvas>
              <canvas ref={overlayCanvasRef} className="overlay-canvas"></canvas>
            </div>

            <div className="resolution-info">
              Screen Resolution: {resolution.width} × {resolution.height}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Heatmaps;
