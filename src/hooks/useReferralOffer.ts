import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { creatorApi, type CreatorPlatform } from "@/lib/creatorProgramme";

/** A referred customer's first-purchase discount on this platform, if they still have one. */
export function useReferralOffer(platform: CreatorPlatform) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["referral-offer", user?.id, platform],
    queryFn: () => creatorApi.myOffer(platform),
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });
  return query.data ?? null;
}
