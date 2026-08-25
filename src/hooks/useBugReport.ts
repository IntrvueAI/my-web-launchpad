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
      // Get session first to verify it exists
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error('Bug report session check failed:', sessionError.message);

      if (!session || !session.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Get user details
      const { data: { user } } = await supabase.auth.getUser();

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

      await FeedbackService.submitBugReport(data);

      authRateLimiter.recordAttempt(rateLimitKey);
      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve! We'll investigate this issue.",
      });
      return true;
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught));
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
