import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';

const ProtectedRoute = ({ children }) => {
  useEffect(() => {
    // Initialize session monitoring if not already initialized
    if (sessionManager.isSessionValid()) {
      sessionManager.initializeSessionTimeout();
    }
    
    // Cleanup function to clean up session manager when component unmounts
    return () => {
      // Don't cleanup session manager here as it needs to persist across routes
      // sessionManager.cleanup();
    };
  }, []);

  // Check if user is authenticated and session is valid
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      return false;
    }
    
    // Check if session is still valid
    return sessionManager.isSessionValid();
  };

  // If not authenticated or session is invalid, redirect to login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated and session is valid, render the protected component
  return children;
};

export default ProtectedRoute; 