// Secure error handling utilities
export interface SecureError {
  userMessage: string;
  logMessage: string;
  statusCode: number;
}

export const createSecureError = (
  userMessage: string,
  logMessage: string,
  statusCode: number = 500
): SecureError => ({
  userMessage,
  logMessage,
  statusCode
});

// Sanitize error messages to prevent information disclosure
export const sanitizeErrorMessage = (error: any): string => {
  // Common secure error messages for users
  const secureMessages = {
    authentication: 'Authentication failed. Please check your credentials.',
    authorization: 'You do not have permission to access this resource.',
    validation: 'The provided data is invalid. Please check your input.',
    network: 'A network error occurred. Please try again later.',
    server: 'An internal error occurred. Please try again later.',
    rateLimit: 'Too many requests. Please wait before trying again.',
    notFound: 'The requested resource was not found.',
    timeout: 'The request timed out. Please try again.',
  };

  // Log the actual error for debugging
  console.error('Full error details:', error);

  // Return sanitized message based on error type
  if (error?.message?.includes('auth') || error?.status === 401) {
    return secureMessages.authentication;
  }
  
  if (error?.status === 403) {
    return secureMessages.authorization;
  }
  
  if (error?.status === 400) {
    return secureMessages.validation;
  }
  
  if (error?.status === 404) {
    return secureMessages.notFound;
  }
  
  if (error?.status === 429) {
    return secureMessages.rateLimit;
  }
  
  if (error?.status === 408 || error?.message?.includes('timeout')) {
    return secureMessages.timeout;
  }
  
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
    return secureMessages.network;
  }

  // Default secure message
  return secureMessages.server;
};

// Rate limiting utility for client-side
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    // Update the attempts array
    this.attempts.set(identifier, recentAttempts);
    
    return recentAttempts.length >= this.maxAttempts;
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    attempts.push(now);
    this.attempts.set(identifier, attempts);
  }

  getRemainingAttempts(identifier: string): number {
    const attempts = this.attempts.get(identifier) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  getTimeUntilReset(identifier: string): number {
    const attempts = this.attempts.get(identifier) || [];
    if (attempts.length === 0) return 0;
    
    const now = Date.now();
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    
    return Math.max(0, resetTime - now);
  }
}

// Global rate limiter instances
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const apiRateLimiter = new RateLimiter(10, 60 * 1000); // 10 attempts per minute

// Secure logging utility
export const secureLog = {
  info: (message: string, metadata?: object) => {
    console.log(`[INFO] ${message}`, metadata ? sanitizeLogData(metadata) : '');
  },
  
  warn: (message: string, metadata?: object) => {
    console.warn(`[WARN] ${message}`, metadata ? sanitizeLogData(metadata) : '');
  },
  
  error: (message: string, error?: any, metadata?: object) => {
    console.error(`[ERROR] ${message}`, {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      ...metadata ? sanitizeLogData(metadata) : {}
    });
  }
};

// Sanitize sensitive data from logs
const sanitizeLogData = (data: any): any => {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  });
  
  return sanitized;
};