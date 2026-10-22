import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** MMI Practice credits: a separate balance from 11+ credits, charged by the server. */
export const useMedicineCredits = (enabled = true) => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["medicine-credits", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("medicine_credit_balances")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.credits as number | undefined) ?? 0;
    },
    enabled: !!user && enabled,
    // Interviews are charged on the server, so re-read whenever a page needs the balance.
    staleTime: 0,
  });
  return {
    credits: query.data ?? 0,
    refetchCredits: query.refetch,
    ...query,
  };
};
