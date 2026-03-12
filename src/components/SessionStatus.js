import React, { useState, useEffect } from 'react';
import sessionManager from '../utils/sessionManager';

const SessionStatus = ({ showDetails = false }) => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // Update session info every second for real-time countdown
    const updateSessionInfo = () => {
      const info = sessionManager.getSessionInfo();
      setSessionInfo(info);

      if (info.isValid && info.timeUntilExpiry > 0) {
        const minutes = Math.floor(info.timeUntilExpiry / (1000 * 60));
        const seconds = Math.floor((info.timeUntilExpiry % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('Expired');
      }
    };

    // Update immediately
    updateSessionInfo();

    // Set up interval to update every second for smooth countdown
    const interval = setInterval(updateSessionInfo, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  if (!sessionInfo) return null;

  const handleExtendSession = () => {
    sessionManager.resetSessionTimeout();
    // Force update
    const info = sessionManager.getSessionInfo();
    setSessionInfo(info);
  };

  const handleLogout = () => {
    sessionManager.logout();
  };

  if (!showDetails) {
    // Only show if less than 5 minutes remaining
    if (sessionInfo.timeUntilExpiry > 5 * 60 * 1000) {
      return null;
    }

    // Simple status display in bottom left corner
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: sessionInfo.isValid ? '#2196F3' : '#f44336',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontFamily: 'Arial, sans-serif'
      }}>
        Session: {sessionInfo.isValid ? timeLeft : 'Expired'}
      </div>
    );
  }

  // Detailed status display
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      minWidth: '250px',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Session Status</h4>

      <div style={{ marginBottom: '8px' }}>
        <strong>Status:</strong> {sessionInfo.isValid ? 'Active' : 'Expired'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Time Left:</strong> {timeLeft}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Tenant:</strong> {sessionInfo.tenant.tenant_name || 'N/A'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Timeout:</strong> {sessionInfo.tenant.tenant_timeout || 30} minutes
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>User:</strong> {sessionInfo.user.username || 'N/A'}
      </div>

      {sessionInfo.expiryTime && (
        <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666' }}>
          <strong>Expires:</strong> {sessionInfo.expiryTime.toLocaleString()}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleExtendSession}
          style={{
            padding: '6px 12px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Extend Session
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default SessionStatus; 