// Session Management Utility
import axios from 'axios';
import { API_URL } from '../const';

class SessionManager {
  constructor() {
    this.sessionCheckInterval = null;
    this.activityListeners = [];
    this.warningTimeout = null;
    this.warningShown = false;
    this.currentSessionId = null;
  }

  // Get device information
  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";
    
    // Detect browser
    if (userAgent.includes("Chrome")) {
      browser = "Chrome";
    } else if (userAgent.includes("Firefox")) {
      browser = "Firefox";
    } else if (userAgent.includes("Safari")) {
      browser = "Safari";
    } else if (userAgent.includes("Edge")) {
      browser = "Edge";
    }
    
    // Detect OS
    if (userAgent.includes("Windows")) {
      os = "Windows";
    } else if (userAgent.includes("Mac")) {
      os = "Mac";
    } else if (userAgent.includes("Linux")) {
      os = "Linux";
    } else if (userAgent.includes("Android")) {
      os = "Android";
    } else if (userAgent.includes("iOS")) {
      os = "iOS";
    }
    
    return `${browser}/${os}`;
  }

  // Create session on login
  async createSession(userData) {
    try {
      // Fetch public IP address
      let ipAddress = 'Unknown';
      try {
        const ipRes = await axios.get('https://api.ipify.org?format=json');
        ipAddress = ipRes.data.ip || 'Unknown';
      } catch (ipErr) {
        console.warn('Could not fetch public IP address:', ipErr);
      }
      const formData = new URLSearchParams();
      formData.append('deviceInfo', this.getDeviceInfo());
      formData.append('loginTime', new Date().toISOString());
      formData.append('status', 'active');
      formData.append('userId', userData.id);
      formData.append('userName', userData.username);
      formData.append('userEmail', userData.email);
      formData.append('ipAddress', ipAddress); 
      if (userData.organization?.organization_id) {
        formData.append('orgId', userData.organization.organization_id);
      }

      const response = await axios.post(`${API_URL}/sessions`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      
      if (response.data && response.data.session_details) {
        this.currentSessionId = response.data.session_details.session_id;
        localStorage.setItem('currentSessionId', this.currentSessionId);
        console.log('Session created successfully:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  // Update session on logout
  async updateSession(sessionId, isCompleted = true) {
    try {
      if (!sessionId) {
        sessionId = this.currentSessionId || localStorage.getItem('currentSessionId');
      }
      
      if (!sessionId) {
        console.warn('No session ID found to update');
        return;
      }

      const formData = new URLSearchParams();
      formData.append('logoutTime', new Date().toISOString());
      formData.append('status', isCompleted ? "completed" : "expired");

      const response = await axios.post(`${API_URL}/sessions/${sessionId}`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      console.log('Session updated successfully:', response.data);
      
      // Clear session ID from storage
      localStorage.removeItem('currentSessionId');
      this.currentSessionId = null;
      
      return response.data;
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }

  // Initialize session timeout monitoring
  initializeSessionTimeout() {
    try {
      console.log('SessionManager: Initializing session timeout monitoring...');
      
      // Clear any existing session check interval
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
      }
      
      // Start session monitoring - check every minute
      this.sessionCheckInterval = setInterval(() => this.checkSessionExpiry(), 60000);
      console.log('SessionManager: Session check interval set up');
      
      // Add activity listeners to reset session timeout
      this.addActivityListeners();
      console.log('SessionManager: Activity listeners added');
      
      // Do an initial check
      this.checkSessionExpiry();
      console.log('SessionManager: Initial session check completed');
      
    } catch (error) {
      console.error('SessionManager: Error initializing session timeout:', error);
    }
  }

  // Check if session has expired
  checkSessionExpiry() {
    try {
      const sessionExpiryTime = localStorage.getItem('sessionExpiryTime');
      if (!sessionExpiryTime) {
        console.log('SessionManager: No session expiry time found');
        return;
      }

      const currentTime = Date.now();
      const expiryTime = parseInt(sessionExpiryTime);
      const timeUntilExpiry = expiryTime - currentTime;

      console.log('SessionManager: Session check -', {
        currentTime: new Date(currentTime),
        expiryTime: new Date(expiryTime),
        timeUntilExpiry: Math.floor(timeUntilExpiry / 60000) + ' minutes'
      });

      // Show warning 5 minutes before expiry
      if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0 && !this.warningShown) {
        console.log('SessionManager: Showing session warning');
        this.showSessionWarning(Math.ceil(timeUntilExpiry / 60000));
      }

      // Session has expired
      if (currentTime > expiryTime) {
        console.log('SessionManager: Session has expired');
        this.handleSessionExpiry();
      }
    } catch (error) {
      console.error('SessionManager: Error checking session expiry:', error);
    }
  }

  // Show session warning before expiry
  showSessionWarning(minutesLeft) {
    this.warningShown = true;
    const extendSession = window.confirm(
      `Your session will expire in ${minutesLeft} minute(s). Would you like to extend your session?`
    );
    
    if (extendSession) {
      this.resetSessionTimeout();
      this.warningShown = false;
    } else {
      // User chose not to extend, let it expire naturally
      this.warningTimeout = setTimeout(() => {
        this.handleSessionExpiry();
      }, minutesLeft * 60 * 1000);
    }
  }

  // Handle session expiry
  async handleSessionExpiry() {
    // Update session as expired
    await this.updateSession(null, false);
    
    // Clear intervals and timeouts
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
    
    // Remove activity listeners
    this.removeActivityListeners();
    
    // Clear all session data
    localStorage.clear();
    
    // Show alert and redirect to login
    alert('Your session has expired. Please log in again.');
    window.location.href = '/login';
  }

  // Reset session timeout based on tenant configuration
  resetSessionTimeout() {
    try {
      const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
      const timeoutMinutes = tenant.tenant_timeout || 30;
      const newExpiryTime = Date.now() + (timeoutMinutes * 60 * 1000);
      localStorage.setItem('sessionExpiryTime', newExpiryTime.toString());
      
      console.log('SessionManager: Session timeout reset to:', new Date(newExpiryTime));
      
      // Reset warning state
      this.warningShown = false;
      if (this.warningTimeout) {
        clearTimeout(this.warningTimeout);
      }
    } catch (error) {
      console.error('SessionManager: Error resetting session timeout:', error);
    }
  }

  // Add activity listeners to reset session timeout
  addActivityListeners() {
    try {
      const resetSessionTimeout = () => this.resetSessionTimeout();
      
      // Listen for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, resetSessionTimeout, true);
      });
      
      // Store reference to listeners for cleanup
      this.activityListeners = events.map(event => ({
        event,
        handler: resetSessionTimeout
      }));
      
      console.log('SessionManager: Activity listeners added for events:', events);
    } catch (error) {
      console.error('SessionManager: Error adding activity listeners:', error);
    }
  }

  // Remove activity listeners
  removeActivityListeners() {
    this.activityListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler, true);
    });
    this.activityListeners = [];
  }

  // Check if session is valid
  isSessionValid() {
    const sessionExpiryTime = localStorage.getItem('sessionExpiryTime');
    const token = localStorage.getItem('token');
    
    if (!sessionExpiryTime || !token) {
      return false;
    }
    
    return Date.now() < parseInt(sessionExpiryTime);
  }

  // Get time until session expiry
  getTimeUntilExpiry() {
    const sessionExpiryTime = localStorage.getItem('sessionExpiryTime');
    if (!sessionExpiryTime) return 0;
    
    const timeLeft = parseInt(sessionExpiryTime) - Date.now();
    return Math.max(0, timeLeft);
  }

  // Get session info
  getSessionInfo() {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sessionExpiryTime = localStorage.getItem('sessionExpiryTime');
    
    return {
      tenant,
      user,
      isValid: this.isSessionValid(),
      timeUntilExpiry: this.getTimeUntilExpiry(),
      expiryTime: sessionExpiryTime ? new Date(parseInt(sessionExpiryTime)) : null
    };
  }

  // Manual logout
  async logout() {
    // Update session as completed
    await this.updateSession(null, true);
    
    // Clear intervals and timeouts
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
    
    // Remove activity listeners
    this.removeActivityListeners();
    
    // Clear all session data
    localStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  }

  // Cleanup method
  cleanup() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
    this.removeActivityListeners();
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export both the class and the singleton instance
export { SessionManager, sessionManager };
export default sessionManager; 