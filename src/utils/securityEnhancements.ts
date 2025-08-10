// Enhanced security utilities for admin operations
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced admin verification with additional security checks
 */
export const verifyAdminWithSecurity = async (): Promise<boolean> => {
  try {
    // Use the enhanced verification function that includes logging
    const { data: isAdmin, error } = await supabase.rpc('verify_admin_access_with_logging');
    
    if (error) {
      console.error('Admin verification error:', error);
      return false;
    }
    
    return Boolean(isAdmin);
  } catch (error) {
    console.error('Security check failed:', error);
    return false;
  }
};

/**
 * Rate limiting for admin operations
 */
class AdminRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts = 10;
  private readonly windowMs = 60000; // 1 minute

  isRateLimited(adminEmail: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(adminEmail) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return true;
    }
    
    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(adminEmail, recentAttempts);
    
    return false;
  }
}

export const adminRateLimiter = new AdminRateLimiter();

/**
 * Secure data sanitization for admin operations
 */
export const sanitizeAdminInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.replace(/[<>'"&]/g, '');
  }
  
  if (typeof input === 'number') {
    // Ensure reasonable bounds
    return Math.max(0, Math.min(input, 10000));
  }
  
  return input;
};

/**
 * Log admin security events
 */
export const logAdminSecurityEvent = async (
  event: string,
  details: Record<string, any>,
  adminUserId?: string,
  adminEmail?: string
): Promise<void> => {
  try {
    // If no admin info provided, try to get current user info
    if (!adminUserId || !adminEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      adminUserId = user?.id || 'unknown';
      adminEmail = user?.email || 'unknown';
    }

    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        action: event,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          security_event: true
        }
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};