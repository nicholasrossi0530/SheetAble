import React, { useState } from "react";
import axios from "axios";

import "./Thumbnail.css";

const Thumbnail = ({ sheet, width = 150 }) => {
  const [error, setError] = useState(false);

  const thumbnailUrl = `${axios.defaults.baseURL}/sheet/thumbnail/${sheet.safe_sheet_name}`;
  const isMusicXml = sheet.extension && (sheet.extension === '.xml' || sheet.extension === '.mxl' || sheet.extension === '.musicxml');

  if (error) {
    const bgColor = isMusicXml ? '#f3f0ff' : '#f8f9fa';
    const textColor = isMusicXml ? '#5f3dc4' : '#6c757d';
    const label = isMusicXml ? 'MusicXML' : 'PDF';

    return (
      <div className="thumbnail-no-preview" style={{ 
        width: `${width}px`, 
        backgroundColor: bgColor,
        color: textColor,
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '5px',
          opacity: 0.8 
        }}>
          {isMusicXml ? '♪' : '📄'}
        </div>
        <span style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>No Preview</span>
      </div>
    );
  }

  return (
    <img
      className="thumbnail-image"
      src={thumbnailUrl}
      alt={sheet.sheet_name}
      onError={() => setError(true)}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
};

export default Thumbnail;
