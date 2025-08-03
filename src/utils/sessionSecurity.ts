// Session security utilities
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const INTERVIEW_MAX_DURATION_MS = 45 * 60 * 1000; // 45 minutes max interview

interface SessionData {
  timestamp: number;
  userId: string;
  sessionId: string;
  interviewType?: string;
}

// Secure session storage utilities
export const sessionSecurity = {
  // Store session data with encryption in localStorage
  setSessionData: (key: string, data: SessionData): void => {
    try {
      const dataWithTimestamp = {
        ...data,
        timestamp: Date.now(),
        expiresAt: Date.now() + SESSION_TIMEOUT_MS
      };
      
      // Simple obfuscation (not real encryption, but better than plain text)
      const encoded = btoa(JSON.stringify(dataWithTimestamp));
      localStorage.setItem(`secure_${key}`, encoded);
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  },

  // Retrieve and validate session data
  getSessionData: (key: string): SessionData | null => {
    try {
      const encoded = localStorage.getItem(`secure_${key}`);
      if (!encoded) return null;

      const data = JSON.parse(atob(encoded));
      
      // Check if session has expired
      if (Date.now() > data.expiresAt) {
        sessionSecurity.clearSessionData(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      return null;
    }
  },

  // Clear session data
  clearSessionData: (key: string): void => {
    try {
      localStorage.removeItem(`secure_${key}`);
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  },

  // Clear all session data
  clearAllSessionData: (): void => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all session data:', error);
    }
  },

  // Check if interview has been running too long
  isInterviewExpired: (startTime: number): boolean => {
    return Date.now() - startTime > INTERVIEW_MAX_DURATION_MS;
  },

  // Generate secure session ID
  generateSessionId: (): string => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}`;
  },

  // Validate session ID format
  isValidSessionId: (sessionId: string): boolean => {
    if (!sessionId || typeof sessionId !== 'string') return false;
    
    // Check format: timestamp_randomstring
    const parts = sessionId.split('_');
    if (parts.length !== 2) return false;
    
    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) return false;
    
    // Check if timestamp is reasonable (not too old or in future)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return timestamp > (now - maxAge) && timestamp <= now;
  }
};

// CSRF protection utility
export const csrfProtection = {
  // Generate CSRF token
  generateToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Store CSRF token
  setToken: (token: string): void => {
    sessionStorage.setItem('csrf_token', token);
  },

  // Get CSRF token
  getToken: (): string | null => {
    return sessionStorage.getItem('csrf_token');
  },

  // Clear CSRF token
  clearToken: (): void => {
    sessionStorage.removeItem('csrf_token');
  },

  // Validate CSRF token
  validateToken: (token: string): boolean => {
    const storedToken = csrfProtection.getToken();
    return storedToken === token && token.length === 64;
  }
};

// Content Security Policy helper
export const cspViolationHandler = (event: SecurityPolicyViolationEvent): void => {
  console.warn('CSP Violation:', {
    blockedURI: event.blockedURI,
    documentURI: event.documentURI,
    effectiveDirective: event.effectiveDirective,
    originalPolicy: event.originalPolicy,
    referrer: event.referrer,
    violatedDirective: event.violatedDirective
  });
  
  // In production, you might want to report this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Report CSP violation to monitoring service
    // fetch('/api/security/csp-violation', { method: 'POST', body: JSON.stringify(event) });
  }
};