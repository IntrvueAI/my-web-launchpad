import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { creatorApi } from "@/lib/creatorProgramme";
import { isGuestDocument } from "@/lib/site";

/** Creator (affiliate) accounts get a badge and a route to their dashboard; everyone else gets null. */
export function useCreatorStatus() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["creator-status", user?.id],
    queryFn: () => creatorApi.me(),
    enabled: !!user && !isGuestDocument(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return query.data ?? null;
}
