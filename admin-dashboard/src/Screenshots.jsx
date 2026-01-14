import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Screenshots.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://103.130.11.114:3001";

function Screenshots({ user, onClose }) {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const fetchScreenshots = async (skipCount = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${SERVER_URL}/api/screenshots/${user._id}?limit=${limit}&skip=${skipCount}`
      );

      if (response.data.success) {
        if (skipCount === 0) {
          setScreenshots(response.data.screenshots);
        } else {
          setScreenshots(prev => [...prev, ...response.data.screenshots]);
        }
        setHasMore(response.data.hasMore);
        setSkip(skipCount + response.data.screenshots.length);
      }
    } catch (error) {
      alert('Failed to fetch screenshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, [user]);

  const loadMore = () => {
    fetchScreenshots(skip);
  };

  const viewScreenshot = async (screenshot) => {
    try {
      setSelectedScreenshot(screenshot);
      setViewingImage(null);

      const response = await axios.get(
        `${SERVER_URL}/api/screenshots/image/${screenshot._id}`
      );

      if (response.data.success) {
        setViewingImage(response.data.screenshot.imageData);
      }
    } catch (error) {
      alert('Failed to load screenshot image');
    }
  };

  const closeViewer = () => {
    setSelectedScreenshot(null);
    setViewingImage(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const downloadScreenshot = () => {
    if (!viewingImage) return;

    const link = document.createElement('a');
    link.href = viewingImage;
    link.download = `screenshot-${selectedScreenshot.username}-${new Date(selectedScreenshot.timestamp).getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="screenshots-modal">
      <div className="screenshots-container">
        <div className="screenshots-header">
          <h2>📸 Screenshots - {user.username}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="screenshots-content">
          {loading && screenshots.length === 0 ? (
            <div className="screenshots-loading">
              <div className="loading-spinner"></div>
              <p>Loading screenshots...</p>
            </div>
          ) : screenshots.length === 0 ? (
            <div className="no-screenshots">
              <p>📭 No screenshots available for this user yet</p>
            </div>
          ) : (
            <>
              <div className="screenshots-grid">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot._id}
                    className="screenshot-card"
                    onClick={() => viewScreenshot(screenshot)}
                  >
                    <div className="screenshot-placeholder">
                      <span className="screenshot-icon">🖼️</span>
                      <span className="screenshot-time">
                        {formatDate(screenshot.timestamp)}
                      </span>
                      {screenshot.totalScreens > 1 && (
                        <span className="screen-badge">
                          Screen {(screenshot.screenIndex || 0) + 1}/{screenshot.totalScreens}
                        </span>
                      )}
                    </div>
                    <div className="screenshot-info">
                      <p className="screenshot-device">{screenshot.computerName}</p>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="load-more-container">
                  <button 
                    className="load-more-btn" 
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedScreenshot && (
        <div className="screenshot-viewer-modal" onClick={closeViewer}>
          <div className="screenshot-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <div className="viewer-info">
                <h3>{user.username}</h3>
                <p>{formatDate(selectedScreenshot.timestamp)}</p>
                {selectedScreenshot.totalScreens > 1 && (
                  <p className="screen-info">
                    Screen {(selectedScreenshot.screenIndex || 0) + 1} of {selectedScreenshot.totalScreens}
                  </p>
                )}
              </div>
              <div className="viewer-actions">
                {viewingImage && (
                  <button className="download-btn" onClick={downloadScreenshot}>
                    ⬇️ Download
                  </button>
                )}
                <button className="close-viewer-btn" onClick={closeViewer}>
                  ✕
                </button>
              </div>
            </div>

            <div className="viewer-content">
              {!viewingImage ? (
                <div className="viewer-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading image...</p>
                </div>
              ) : (
                <img
                  src={viewingImage}
                  alt="Screenshot"
                  className="viewer-image"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Screenshots;
