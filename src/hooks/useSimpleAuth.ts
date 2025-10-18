// Simple authentication hook with basic security
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeErrorMessage, authRateLimiter } from '@/utils/secureErrorHandler';
import { recordAuthFailure, recordRateLimit } from '@/utils/securityMonitor';

export const useSimpleAuth = () => {
  const { signIn, signUp, signOut, resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const identifier = `signin_${email}`;
    
    if (authRateLimiter.isRateLimited(identifier)) {
      recordRateLimit(identifier, 'signin');
      toast({
        title: "Too Many Attempts",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      return { error: new Error('Rate limited') };
    }

    authRateLimiter.recordAttempt(identifier);
    
    try {
      const result = await signIn(email, password);
      if (result.error) {
        recordAuthFailure(email, sanitizeErrorMessage(result.error));
        toast({
          title: "Sign In Failed",
          description: sanitizeErrorMessage(result.error),
          variant: "destructive",
        });
      }
      return result;
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      toast({
        title: "Sign In Error",
        description: message,
        variant: "destructive",
      });
      return { error };
    }
  }, [signIn, toast]);

  const handleSignUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const identifier = `signup_${email}`;
    
    if (authRateLimiter.isRateLimited(identifier)) {
      recordRateLimit(identifier, 'signup');
      toast({
        title: "Too Many Attempts",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      return { error: new Error('Rate limited') };
    }

    authRateLimiter.recordAttempt(identifier);
    
    try {
      const result = await signUp(email, password, fullName);
      if (result.error) {
        recordAuthFailure(email, sanitizeErrorMessage(result.error));
        toast({
          title: "Sign Up Failed",
          description: sanitizeErrorMessage(result.error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account.",
        });
      }
      return result;
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      toast({
        title: "Sign Up Error",
        description: message,
        variant: "destructive",
      });
      return { error };
    }
  }, [signUp, toast]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Sign Out Error",
        description: "There was an error signing out.",
        variant: "destructive",
      });
    }
  }, [signOut, toast]);

  const handleResetPassword = useCallback(async (email: string) => {
    const identifier = `reset_${email}`;
    
    if (authRateLimiter.isRateLimited(identifier)) {
      recordRateLimit(identifier, 'password_reset');
      toast({
        title: "Too Many Attempts",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      return { error: new Error('Rate limited') };
    }

    authRateLimiter.recordAttempt(identifier);
    
    try {
      const result = await resetPassword(email);
      if (result.error) {
        toast({
          title: "Password Reset Failed",
          description: sanitizeErrorMessage(result.error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check Your Email",
          description: "If an account exists with this email, you will receive a password reset link.",
        });
      }
      return result;
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      toast({
        title: "Password Reset Error",
        description: message,
        variant: "destructive",
      });
      return { error };
    }
  }, [resetPassword, toast]);

  return {
    handleSignIn,
    handleSignUp,
    handleSignOut,
    handleResetPassword,
  };
};