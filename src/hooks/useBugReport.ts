import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { authRateLimiter } from '@/utils/secureErrorHandler';

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
      // Rate limiting check (max 5 bug reports per hour)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to report a bug');
      }

      const rateLimitKey = `bug-report-${user.id}`;
      if (authRateLimiter.isRateLimited(rateLimitKey)) {
        toast({
          title: "Too many bug reports",
          description: "Please wait before submitting another bug report. You can submit up to 5 reports per hour.",
          variant: "destructive",
        });
        return false;
      }

      // Call the edge function
      const { data: result, error } = await supabase.functions.invoke('send-bug-report', {
        body: data,
      });

      if (error) {
        throw error;
      }

      // Record attempt for rate limiting
      authRateLimiter.recordAttempt(rateLimitKey);

      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve! We'll investigate this issue.",
      });

      return true;
    } catch (error: any) {
      console.error('Bug report submission failed:', error);
      
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
