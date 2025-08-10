import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdminStatus = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["admin-status", user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('No user found, returning false');
        return false;
      }
      
      console.log('Checking admin status for user:', user.email, 'User ID:', user.id);
      
      // Check if user is authenticated properly
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('No valid session found:', sessionError);
        return false;
      }
      
      console.log('Session valid, checking admin status...');
      
      // Try the basic admin check first
      const { data: basicCheck, error: basicError } = await supabase.rpc('is_current_user_admin');
      
      if (basicError) {
        console.error("Failed basic admin check:", basicError);
        return false;
      }
      
      console.log('Basic admin check result:', basicCheck, 'for user:', user.email);
      
      return basicCheck as boolean;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    isAdmin: query.data ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
    error: query.error,
  };
};