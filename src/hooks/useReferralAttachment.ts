import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { creatorApi, forgetReferral, storedReferral } from "@/lib/creatorProgramme";
import { isGuestDocument } from "@/lib/site";

/**
 * After sign-in, attaches the creator link this browser arrived with. The server decides whether
 * it counts (new accounts only, never the creator's own); any answer clears the stored code.
 */
export function useReferralAttachment() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || isGuestDocument()) return;
    const code = storedReferral();
    if (!code) return;
    creatorApi.attach(code).then(forgetReferral).catch(() => {
      /* Kept for the next sign-in when the service could not be reached. */
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
