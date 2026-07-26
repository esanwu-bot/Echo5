import React from 'react';
import './LoadingSkeleton.css';

const ProductSkeleton = () => {
  return (
    <div className="skeleton-container">
      {/* 导航栏骨架 */}
      <div className="skeleton-nav">
        <div className="skeleton-logo"></div>
        <div className="skeleton-menu">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-menu-item"></div>
          ))}
        </div>
      </div>
      
      {/* 内容区域骨架 */}
      <div className="skeleton-content">
        <div className="skeleton-banner"></div>
        <div className="skeleton-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-image"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text short"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
