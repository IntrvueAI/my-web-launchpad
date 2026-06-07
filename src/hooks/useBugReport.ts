import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { authRateLimiter } from '@/utils/secureErrorHandler';
import { FeedbackService } from '@/services/FeedbackService';
import { supabase } from '@/integrations/supabase/client';

interface BugReportData {
  subject: string;
  category: string;
  description: string;
  stepsToReproduce?: string;
  currentUrl: string;
}

export const useBugReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const submitBugReport = async (data: BugReportData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('🐛 [BugReport] Starting bug report submission...');
      
      // Get session first to verify it exists
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🐛 [BugReport] Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenPreview: session?.access_token?.substring(0, 20) + '...',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
        sessionError: sessionError?.message
      });

      if (!session || !session.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Get user details
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🐛 [BugReport] User check:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userError: userError?.message
      });

      if (!user) {
        throw new Error('You must be logged in to report a bug');
      }

      // Rate limiting check
      const rateLimitKey = `bug-report-${user.id}`;
      if (authRateLimiter.isRateLimited(rateLimitKey)) {
        toast({
          title: "Too many bug reports",
          description: "Please wait before submitting another bug report. You can submit up to 5 reports per hour.",
          variant: "destructive",
        });
        return false;
      }

      console.log('🐛 [BugReport] Invoking edge function with data:', {
        subject: data.subject,
        category: data.category,
        descriptionLength: data.description.length,
        currentUrl: data.currentUrl
      });

      await FeedbackService.submitBugReport(data);

      authRateLimiter.recordAttempt(rateLimitKey);
      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve! We'll investigate this issue.",
      });
      return true;
    } catch (error: any) {
      console.error('🐛 [BugReport] Submission failed:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      
      toast({
        title: "Failed to submit bug report",
        description: error.message || "An error occurred while submitting your bug report. Please try again.",
        variant: "destructive",
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitBugReport,
    isLoading,
  };
};
