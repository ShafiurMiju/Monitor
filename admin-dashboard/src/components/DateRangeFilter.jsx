import React, { useState, useEffect, useCallback } from 'react';
import './DateRangeFilter.css';

const DateRangeFilter = ({ onFilterChange, showTimeFilter = false }) => {
  const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'custom'
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    startTime: '00:00',
    endTime: '23:59'
  });

  const getDateRange = useCallback((type) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (type) {
      case 'today': {
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
      
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0]
        };
      }
      
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          startDate: weekAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
      
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          startDate: monthAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
      
      case 'all':
      default:
        return {
          startDate: '',
          endDate: ''
        };
    }
  }, []);

  const applyFilter = useCallback(() => {
    let filters;
    
    if (filterType === 'custom') {
      filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        startTime: showTimeFilter ? dateRange.startTime : undefined,
        endTime: showTimeFilter ? dateRange.endTime : undefined
      };
    } else {
      const range = getDateRange(filterType);
      filters = {
        ...range,
        startTime: showTimeFilter ? dateRange.startTime : undefined,
        endTime: showTimeFilter ? dateRange.endTime : undefined
      };
    }
    
    onFilterChange(filters);
  }, [filterType, dateRange, showTimeFilter, getDateRange, onFilterChange]);

  useEffect(() => {
    applyFilter();
  }, [filterType, applyFilter]);

  const handleQuickFilter = (type) => {
    setFilterType(type);
  };

  const handleCustomDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyCustom = () => {
    applyFilter();
  };

  const handleClear = () => {
    setFilterType('all');
    setDateRange({
      startDate: '',
      endDate: '',
      startTime: '00:00',
      endTime: '23:59'
    });
  };

  return (
    <div className="date-range-filter">
      <div className="quick-filters">
        <button
          className={`quick-filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleQuickFilter('all')}
        >
          📊 All Time
        </button>
        <button
          className={`quick-filter-btn ${filterType === 'today' ? 'active' : ''}`}
          onClick={() => handleQuickFilter('today')}
        >
          📅 Today
        </button>
        <button
          className={`quick-filter-btn ${filterType === 'yesterday' ? 'active' : ''}`}
          onClick={() => handleQuickFilter('yesterday')}
        >
          📆 Yesterday
        </button>
        <button
          className={`quick-filter-btn ${filterType === 'week' ? 'active' : ''}`}
          onClick={() => handleQuickFilter('week')}
        >
          📈 Last 7 Days
        </button>
        <button
          className={`quick-filter-btn ${filterType === 'month' ? 'active' : ''}`}
          onClick={() => handleQuickFilter('month')}
        >
          📊 Last 30 Days
        </button>
        <button
          className={`quick-filter-btn ${filterType === 'custom' ? 'active' : ''}`}
          onClick={() => setFilterType('custom')}
        >
          🔧 Custom Range
        </button>
      </div>

      {filterType === 'custom' && (
        <div className="custom-range-inputs">
          <div className="input-row">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              />
            </div>
            
            {showTimeFilter && (
              <div className="time-input-group">
                <label>Start Time:</label>
                <input
                  type="time"
                  value={dateRange.startTime}
                  onChange={(e) => handleCustomDateChange('startTime', e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="input-row">
            <div className="date-input-group">
              <label>End Date:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              />
            </div>
            
            {showTimeFilter && (
              <div className="time-input-group">
                <label>End Time:</label>
                <input
                  type="time"
                  value={dateRange.endTime}
                  onChange={(e) => handleCustomDateChange('endTime', e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="custom-range-actions">
            <button className="apply-btn" onClick={handleApplyCustom}>
              ✓ Apply
            </button>
            <button className="clear-btn" onClick={handleClear}>
              ✕ Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
