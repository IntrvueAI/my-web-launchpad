import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { verifyAdminWithSecurity, adminRateLimiter, logAdminSecurityEvent } from '@/utils/securityEnhancements';

interface SecureAdminState {
  isAdmin: boolean;
  isVerifying: boolean;
  isRateLimited: boolean;
  securityCheck: () => Promise<boolean>;
}

/**
 * Enhanced admin hook with security features
 */
export const useSecureAdmin = (): SecureAdminState => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const securityCheck = async (): Promise<boolean> => {
    if (!user?.email) {
      return false;
    }

    // Check rate limiting
    if (adminRateLimiter.isRateLimited(user.email)) {
      setIsRateLimited(true);
      await logAdminSecurityEvent('admin_rate_limited', {
        admin_email: user.email,
        user_id: user.id
      });
      return false;
    }

    setIsVerifying(true);
    
    try {
      const adminStatus = await verifyAdminWithSecurity();
      setIsAdmin(adminStatus);
      
      if (!adminStatus && user) {
        await logAdminSecurityEvent('admin_access_denied', {
          admin_email: user.email,
          user_id: user.id
        });
      }
      
      return adminStatus;
    } catch (error) {
      console.error('Admin security check failed:', error);
      await logAdminSecurityEvent('admin_security_check_failed', {
        admin_email: user.email,
        user_id: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (user) {
      securityCheck();
    } else {
      setIsAdmin(false);
      setIsVerifying(false);
    }
  }, [user]);

  return {
    isAdmin,
    isVerifying,
    isRateLimited,
    securityCheck
  };
};