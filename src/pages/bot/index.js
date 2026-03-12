import React, { useEffect, useState } from 'react';

const Bot = () => {
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    setFileName(localStorage.getItem('fileName') || '');
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '16px',
      margin: '8px 12px',
      borderRadius: '20px',
      position: 'relative'
    }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Welcome to DataPX1</h1>
      {fileName && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 16,
          background: '#f0f0f0',
          padding: '6px 14px',
          borderRadius: '12px',
          fontSize: '0.95rem',
          fontWeight: 500,
          color: '#333',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
        }}>
         Selected File: {fileName}
        </div>
      )}
    </div>
  );
};

export default Bot;