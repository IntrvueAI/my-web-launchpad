import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthEmailOptions {
  email: string;
  type: 'signup' | 'reset' | 'magic_link';
  confirmationUrl?: string;
  resetUrl?: string;
  from?: string;
}

export const useAuthEmail = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendAuthEmail = async (options: AuthEmailOptions) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-auth-email', {
        body: options,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email sent successfully",
        description: `${options.type === 'signup' ? 'Confirmation' : 'Reset'} email sent to ${options.email}`,
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Auth email sending failed:', error);
      
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
    sendAuthEmail,
    isLoading,
  };
};