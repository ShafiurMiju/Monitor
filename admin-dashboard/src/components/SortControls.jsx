import React from 'react';
import './SortControls.css';

const SortControls = ({ sortBy, sortOrder, onSortChange }) => {
  const sortOptions = [
    { value: 'usage', label: '⏱️ Usage Time', icon: '⏱️' },
    { value: 'count', label: '🔢 Usage Count', icon: '🔢' },
    { value: 'lastUsed', label: '📅 Last Used', icon: '📅' },
    { value: 'name', label: '📝 App Name', icon: '📝' },
    { value: 'percentage', label: '📊 Percentage', icon: '📊' }
  ];

  const handleSortChange = (value) => {
    if (sortBy === value) {
      // Toggle order if clicking same sort option
      onSortChange(value, sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // Default to descending for new sort option
      onSortChange(value, 'desc');
    }
  };

  return (
    <div className="sort-controls">
      <div className="sort-label">
        <span>🔄 Sort by:</span>
      </div>
      <div className="sort-buttons">
        {sortOptions.map(option => (
          <button
            key={option.value}
            className={`sort-btn ${sortBy === option.value ? 'active' : ''}`}
            onClick={() => handleSortChange(option.value)}
          >
            {option.icon} {option.label}
            {sortBy === option.value && (
              <span className="sort-arrow">
                {sortOrder === 'desc' ? ' ▼' : ' ▲'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SortControls;
