// Secure session management hook
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionSecurity, csrfProtection } from '@/utils/sessionSecurity';
import { useToast } from '@/hooks/use-toast';

export const useSecureSession = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Initialize session security
  useEffect(() => {
    if (user) {
      // Generate and store CSRF token
      const csrfToken = csrfProtection.generateToken();
      csrfProtection.setToken(csrfToken);
      
      // Store user session data securely
      sessionSecurity.setSessionData('user_session', {
        timestamp: Date.now(),
        userId: user.id,
        sessionId: sessionSecurity.generateSessionId()
      });
    }
  }, [user]);

  // Session timeout handler
  const handleSessionTimeout = useCallback(async () => {
    toast({
      title: "Session Expired",
      description: "Your session has expired for security reasons. Please sign in again.",
      variant: "destructive",
    });
    
    // Clear all session data
    sessionSecurity.clearAllSessionData();
    csrfProtection.clearToken();
    
    // Sign out user
    await signOut();
  }, [signOut, toast]);

  // Check session validity
  const validateSession = useCallback(() => {
    if (!user) return true;

    const sessionData = sessionSecurity.getSessionData('user_session');
    
    if (!sessionData || sessionData.userId !== user.id) {
      handleSessionTimeout();
      return false;
    }

    return true;
  }, [user, handleSessionTimeout]);

  // Periodic session validation
  useEffect(() => {
    const interval = setInterval(() => {
      validateSession();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [validateSession]);

  // Security event listeners
  useEffect(() => {
    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs - could be a security concern for sensitive operations
        console.log('Tab hidden - pausing sensitive operations');
      } else {
        // User returned - validate session
        validateSession();
      }
    };

    // Handle page beforeunload
    const handleBeforeUnload = () => {
      // Clear sensitive session data on page unload
      sessionSecurity.clearSessionData('sensitive_data');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [validateSession]);

  // Secure logout
  const secureSignOut = useCallback(async () => {
    try {
      // Clear all session data
      sessionSecurity.clearAllSessionData();
      csrfProtection.clearToken();
      
      // Sign out from Supabase
      await signOut();
      
      toast({
        title: "Signed Out Successfully",
        description: "You have been securely signed out.",
      });
    } catch (error) {
      console.error('Error during secure sign out:', error);
      toast({
        title: "Sign Out Error",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  }, [signOut, toast]);

  // Get CSRF token for API requests
  const getCsrfToken = useCallback(() => {
    return csrfProtection.getToken();
  }, []);

  // Refresh session
  const refreshSession = useCallback(() => {
    if (user) {
      sessionSecurity.setSessionData('user_session', {
        timestamp: Date.now(),
        userId: user.id,
        sessionId: sessionSecurity.generateSessionId()
      });
    }
  }, [user]);

  return {
    validateSession,
    secureSignOut,
    getCsrfToken,
    refreshSession,
    isSessionValid: validateSession()
  };
};