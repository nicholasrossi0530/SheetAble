import React from 'react';

const SkeletonSheet = ({ width, height }) => {
  // Styles for the skeleton container
  const containerStyle = {
    width: width || '100%',
    height: height || '800px',
    backgroundColor: 'white',
    padding: '40px 60px',
    boxSizing: 'border-box',
    border: '1px solid #eee',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'hidden',
  };

  // Create an array of "staves" to render
  const staves = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div style={containerStyle} className="skeleton-sheet">
        {/* Shimmer effect overlay */}
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          .skeleton-sheet::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
            animation: shimmer 2s infinite linear;
            pointer-events: none;
          }
          .skeleton-staff {
            margin-bottom: 40px;
          }
          .skeleton-line {
            height: 1px;
            background-color: #e0e0e0;
            margin-bottom: 6px;
            width: 100%;
          }
           .skeleton-line:last-child {
            margin-bottom: 0;
          }
        `}
      </style>

      {/* Header placeholders */}
      <div style={{ width: '40%', height: '24px', background: '#f0f0f0', margin: '0 auto 10px', borderRadius: '4px' }}></div>
      <div style={{ width: '25%', height: '18px', background: '#f5f5f5', margin: '0 auto 40px', borderRadius: '4px' }}></div>

      {staves.map((staff) => (
        <div key={staff} className="skeleton-staff">
          {/* 5 lines for a staff */}
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonSheet;
