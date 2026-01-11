// admin-dashboard/src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    screenshotEnabled: true,
    screenshotInterval: 6000,
    streamingEnabled: true,
    doubleScreenEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const intervalInSeconds = Math.round(settings.screenshotInterval / 1000);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/settings`);
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch {
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
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
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h1 className="text-lg font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            <p className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {message.text}
            </p>
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Screenshot Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Screenshot Settings
            </h2>

            <div className="space-y-6">
              {/* Enable Screenshots */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 font-medium mb-1">Enable Screenshots</h3>
                  <p className="text-gray-600 text-sm">Capture screenshots from client agents</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, screenshotEnabled: !settings.screenshotEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.screenshotEnabled ? 'bg-primary' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.screenshotEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Screenshot Interval */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-900 font-medium">Screenshot Interval</h3>
                  <span className="text-primary font-medium">{getIntervalDescription()}</span>
                </div>
                <p className="text-gray-600 text-sm mb-4">How often to capture screenshots (1 second - 1 hour)</p>
                
                <input
                  type="range"
                  min="1"
                  max="300"
                  value={intervalInSeconds}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
                  disabled={!settings.screenshotEnabled}
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1s</span>
                  <span>5min</span>
                </div>

                <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Capture Rate:</span> ~{Math.round(60 / intervalInSeconds)} per minute
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <h3 className="text-gray-900 font-medium mb-3">Quick Presets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleIntervalChange(5)}
                    className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-400/50 text-gray-900 rounded-lg transition-colors text-sm"
                  >
                    5 seconds
                  </button>
                  <button
                    onClick={() => handleIntervalChange(10)}
                    className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-400/50 text-gray-900 rounded-lg transition-colors text-sm"
                  >
                    10 seconds
                  </button>
                  <button
                    onClick={() => handleIntervalChange(30)}
                    className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-400/50 text-gray-900 rounded-lg transition-colors text-sm"
                  >
                    30 seconds
                  </button>
                  <button
                    onClick={() => handleIntervalChange(60)}
                    className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-400/50 text-gray-900 rounded-lg transition-colors text-sm"
                  >
                    1 minute
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Streaming Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Streaming Settings
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 font-medium mb-1">Enable Live Streaming</h3>
                  <p className="text-gray-600 text-sm">Allow real-time screen streaming from client agents</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, streamingEnabled: !settings.streamingEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.streamingEnabled ? 'bg-primary' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.streamingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 font-medium mb-1">Enable Double Screen Support</h3>
                  <p className="text-gray-600 text-sm">Allow users to switch between multiple monitors during streaming</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, doubleScreenEnabled: !settings.doubleScreenEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.doubleScreenEnabled ? 'bg-primary' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.doubleScreenEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-primary hover:bg-primary/80 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
