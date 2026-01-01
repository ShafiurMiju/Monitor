import React from 'react';
import './FilterPanel.css';

const FilterPanel = ({ isOpen, onClose, title = "Filter", children, onClearAll }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="filter-overlay" onClick={onClose}></div>}
      
      {/* Side Panel */}
      <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
        <div className="filter-panel-header">
          <h2>{title}</h2>
          <button className="filter-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="filter-panel-body">
          {children}
        </div>
        
        {onClearAll && (
          <div className="filter-panel-footer">
            <button className="clear-all-btn" onClick={onClearAll}>
              Clear All
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default FilterPanel;
