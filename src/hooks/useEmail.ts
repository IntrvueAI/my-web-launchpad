import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const useEmail = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendEmail = async (options: EmailOptions) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: options,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email sent successfully",
        description: `Email sent to ${options.to}`,
      });

      return { data, error: null };
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught));
      console.error('Email sending failed:', error);

      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while sending the email",
        variant: "destructive",
      });

      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendEmail,
    isLoading,
  };
};