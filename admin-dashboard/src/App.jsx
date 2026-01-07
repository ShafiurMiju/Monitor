// admin-dashboard/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import UserDetails from './pages/UserDetails';
import ScreenshotsPage from './pages/ScreenshotsPage';
import MouseTrackingPage from './pages/MouseTrackingPage';
import AppUsagePage from './pages/AppUsagePage';
import KeystrokeTrackingPage from './pages/KeystrokeTrackingPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/user/:userId" element={<UserDetails />} />
      <Route path="/user/:userId/screenshots" element={<ScreenshotsPage />} />
      <Route path="/user/:userId/mouse-tracking" element={<MouseTrackingPage />} />
      <Route path="/user/:userId/app-usage" element={<AppUsagePage />} />
      <Route path="/user/:userId/keystroke-tracking" element={<KeystrokeTrackingPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;
