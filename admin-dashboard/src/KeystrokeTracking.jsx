import React, { useEffect, useState, useRef } from 'react';
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

function KeystrokeTracking({ user, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    fetchSessions();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (dateRange.startDate || dateRange.endDate) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SERVER_URL}/api/keystroke-tracking/${user._id}?limit=20`);
      if (response.data.success) {
        setSessions(response.data.data);
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
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await axios.get(`${SERVER_URL}/api/keystroke-tracking/${user._id}/stats`, { params });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Prepare line chart data for keystroke timeline
  const getTimelineChartData = () => {
    if (!stats || !stats.timeSeries || stats.timeSeries.length === 0) {
      return null;
    }

    const labels = stats.timeSeries.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit' 
      });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Keystrokes',
          data: stats.timeSeries.map(item => item.count),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  // Prepare bar chart data for app breakdown
  const getAppBreakdownChartData = () => {
    if (!stats || !stats.appBreakdown || stats.appBreakdown.length === 0) {
      return null;
    }

    return {
      labels: stats.appBreakdown.map(app => app.appName),
      datasets: [
        {
          label: 'Keystrokes per App',
          data: stats.appBreakdown.map(app => app.count),
          backgroundColor: [
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
          ],
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e5e7eb'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: '#4b5563',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        }
      },
      y: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        }
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>Keystroke Tracking - {user.username}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="modal-body">
          {/* Date Range Filter */}
          <div className="date-filter">
            <label>
              Start Date:
              <input
                type="datetime-local"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </label>
            <label>
              End Date:
              <input
                type="datetime-local"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </label>
            <button
              onClick={() => {
                setDateRange({ startDate: '', endDate: '' });
                fetchStats();
              }}
              className="clear-filter-btn"
            >
              Clear Filter
            </button>
          </div>

          {/* Statistics Overview */}
          {stats && (
            <div className="stats-overview">
              <div className="stat-card">
                <h3>Total Keystrokes</h3>
                <p className="stat-value">{stats.totalKeystrokes.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <h3>Total Sessions</h3>
                <p className="stat-value">{stats.sessionCount}</p>
              </div>
              <div className="stat-card">
                <h3>Avg per Session</h3>
                <p className="stat-value">{stats.avgKeystrokesPerSession.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Charts */}
          {stats && (
            <div className="charts-container">
              {/* Timeline Chart */}
              {getTimelineChartData() && (
                <div className="chart-section">
                  <h3>Keystroke Timeline</h3>
                  <div className="chart-wrapper" style={{ height: '300px' }}>
                    <Line data={getTimelineChartData()} options={chartOptions} />
                  </div>
                </div>
              )}

              {/* App Breakdown Chart */}
              {getAppBreakdownChartData() && (
                <div className="chart-section">
                  <h3>Keystrokes by Application</h3>
                  <div className="chart-wrapper" style={{ height: '400px' }}>
                    <Bar data={getAppBreakdownChartData()} options={chartOptions} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sessions List */}
          <div className="sessions-section">
            <h3>Recent Sessions</h3>
            {loading ? (
              <div className="loading">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="no-data">No keystroke tracking data available</div>
            ) : (
              <div className="sessions-list">
                <table className="sessions-table">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>Date</th>
                      <th>Total Keystrokes</th>
                      <th>Apps Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session._id}>
                        <td>{session.sessionId.substring(0, 20)}...</td>
                        <td>{formatDate(session.createdAt)}</td>
                        <td>{session.totalCount.toLocaleString()}</td>
                        <td>{session.appBreakdown.length} apps</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* App Breakdown Table */}
          {stats && stats.appBreakdown && stats.appBreakdown.length > 0 && (
            <div className="app-breakdown-section">
              <h3>Detailed App Breakdown</h3>
              <table className="app-breakdown-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Total Keystrokes</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.appBreakdown.map((app, index) => (
                    <tr key={index}>
                      <td>{app.appName}</td>
                      <td>{app.count.toLocaleString()}</td>
                      <td>
                        {((app.count / stats.totalKeystrokes) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1f2937;
          border-radius: 12px;
          width: 90%;
          max-width: 1400px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #374151;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          color: #f3f4f6;
          font-size: 1.5rem;
        }

        .close-btn {
          background: #374151;
          border: none;
          color: #9ca3af;
          font-size: 1.5rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #4b5563;
          color: #f3f4f6;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .date-filter {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .date-filter label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: #9ca3af;
        }

        .date-filter input {
          padding: 8px 12px;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 6px;
          color: #f3f4f6;
        }

        .clear-filter-btn {
          padding: 8px 16px;
          background: #4b5563;
          border: none;
          border-radius: 6px;
          color: #f3f4f6;
          cursor: pointer;
          align-self: flex-end;
        }

        .clear-filter-btn:hover {
          background: #6b7280;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: #374151;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 10px 0;
          color: #9ca3af;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .stat-value {
          margin: 0;
          color: #3b82f6;
          font-size: 2rem;
          font-weight: bold;
        }

        .charts-container {
          display: flex;
          flex-direction: column;
          gap: 30px;
          margin-bottom: 30px;
        }

        .chart-section {
          background: #374151;
          padding: 20px;
          border-radius: 8px;
        }

        .chart-section h3 {
          margin: 0 0 15px 0;
          color: #f3f4f6;
          font-size: 1.1rem;
        }

        .chart-wrapper {
          position: relative;
        }

        .sessions-section,
        .app-breakdown-section {
          margin-top: 30px;
        }

        .sessions-section h3,
        .app-breakdown-section h3 {
          color: #f3f4f6;
          margin-bottom: 15px;
        }

        .sessions-list {
          overflow-x: auto;
        }

        .sessions-table,
        .app-breakdown-table {
          width: 100%;
          border-collapse: collapse;
          background: #374151;
          border-radius: 8px;
          overflow: hidden;
        }

        .sessions-table th,
        .sessions-table td,
        .app-breakdown-table th,
        .app-breakdown-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #4b5563;
        }

        .sessions-table th,
        .app-breakdown-table th {
          background: #4b5563;
          color: #f3f4f6;
          font-weight: 600;
        }

        .sessions-table td,
        .app-breakdown-table td {
          color: #d1d5db;
        }

        .sessions-table tbody tr:hover,
        .app-breakdown-table tbody tr:hover {
          background: #4b5563;
        }

        .loading,
        .no-data {
          text-align: center;
          padding: 40px;
          color: #9ca3af;
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            max-height: 95vh;
          }

          .stats-overview {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default KeystrokeTracking;
