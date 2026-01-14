import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://103.130.11.114:3001";

function Settings({ onClose }) {
  const [settings, setSettings] = useState({
    screenshotEnabled: true,
    screenshotInterval: 6000,
    streamingEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Convert milliseconds to seconds for display
  const intervalInSeconds = Math.round(settings.screenshotInterval / 1000);

  const fetchSettings = React.useCallback(async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/settings`);
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${SERVER_URL}/api/settings`, settings);
      if (response.data.success) {
        showMessage('Settings saved successfully!', 'success');
      }
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleIntervalChange = (seconds) => {
    const milliseconds = seconds * 1000;
    if (milliseconds >= 1000 && milliseconds <= 3600000) {
      setSettings({ ...settings, screenshotInterval: milliseconds });
    }
  };

  const getIntervalDescription = () => {
    const seconds = intervalInSeconds;
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.round(seconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  const getScreenshotsPerMinute = () => {
    const perMinute = Math.round(60 / intervalInSeconds);
    return perMinute > 0 ? perMinute : 0;
  };

  if (loading) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="settings-loading">
            <div className="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ System Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-content">
          {/* Screenshot Settings */}
          <div className="setting-section">
            <h3>📸 Screenshot Settings</h3>
            
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.screenshotEnabled}
                    onChange={(e) => setSettings({ ...settings, screenshotEnabled: e.target.checked })}
                  />
                  <span>Enable Screenshot Capture</span>
                </label>
              </div>
              <p className="setting-description">
                When enabled, clients will automatically capture and upload screenshots
              </p>
            </div>

            <div className={`setting-item ${!settings.screenshotEnabled ? 'disabled' : ''}`}>
              <div className="setting-header">
                <label className="setting-label">Screenshot Interval</label>
                <span className="interval-display">{getIntervalDescription()}</span>
              </div>
              
              <input
                type="range"
                min="1"
                max="300"
                value={intervalInSeconds}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                disabled={!settings.screenshotEnabled}
                className="interval-slider"
              />
              
              <div className="interval-markers">
                <span>1s</span>
                <span>30s</span>
                <span>1m</span>
                <span>2m</span>
                <span>5m</span>
              </div>

              <div className="interval-info">
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={intervalInSeconds}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  disabled={!settings.screenshotEnabled}
                  className="interval-input"
                />
                <span className="interval-unit">seconds</span>
                <span className="interval-rate">
                  ≈ {getScreenshotsPerMinute()} screenshots/min
                </span>
              </div>
              
              <p className="setting-description">
                How often clients should capture screenshots
              </p>
            </div>

            <div className="quick-presets">
              <p className="presets-label">Quick Presets:</p>
              <div className="preset-buttons">
                <button 
                  onClick={() => handleIntervalChange(3)}
                  disabled={!settings.screenshotEnabled}
                  className="preset-btn"
                >
                  Fast (3s)
                </button>
                <button 
                  onClick={() => handleIntervalChange(6)}
                  disabled={!settings.screenshotEnabled}
                  className="preset-btn"
                >
                  Normal (6s)
                </button>
                <button 
                  onClick={() => handleIntervalChange(15)}
                  disabled={!settings.screenshotEnabled}
                  className="preset-btn"
                >
                  Moderate (15s)
                </button>
                <button 
                  onClick={() => handleIntervalChange(30)}
                  disabled={!settings.screenshotEnabled}
                  className="preset-btn"
                >
                  Slow (30s)
                </button>
                <button 
                  onClick={() => handleIntervalChange(60)}
                  disabled={!settings.screenshotEnabled}
                  className="preset-btn"
                >
                  Very Slow (1m)
                </button>
              </div>
            </div>
          </div>

          {/* Streaming Settings */}
          <div className="setting-section">
            <h3>📺 Live Streaming Settings</h3>
            
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.streamingEnabled}
                    onChange={(e) => setSettings({ ...settings, streamingEnabled: e.target.checked })}
                  />
                  <span>Enable Live Streaming</span>
                </label>
              </div>
              <p className="setting-description">
                When enabled, admins can view live streams from connected clients
              </p>
            </div>
          </div>

          {/* Warning Messages */}
          <div className="settings-warnings">
            {!settings.screenshotEnabled && !settings.streamingEnabled && (
              <div className="warning-box error">
                ⚠️ Both screenshot capture and live streaming are disabled. Clients will not capture any data.
              </div>
            )}
            {intervalInSeconds < 5 && settings.screenshotEnabled && (
              <div className="warning-box warning">
                ⚠️ Very short intervals may impact client performance and increase server storage usage.
              </div>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
