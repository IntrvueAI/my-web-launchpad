import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { creatorApi, forgetReferral, isValidReferralCode, storedReferral } from "@/lib/creatorProgramme";
import { isGuestDocument } from "@/lib/site";

const triedKey = (userId: string) => `intrvue:referral-tried:${userId}`;

/**
 * After sign-in, attaches the creator link this account arrived with: the code remembered in this
 * browser, or the one saved with the account at sign-up (for confirmation emails opened on another
 * device). The server decides whether it counts (new accounts only, never the creator's own).
 */
export function useReferralAttachment() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || isGuestDocument()) return;
    const local = storedReferral();
    const saved = user.user_metadata?.referral_code;
    let tried = false;
    try { tried = localStorage.getItem(triedKey(user.id)) === "1"; } catch { /* Optional. */ }
    const code = local ?? (!tried && typeof saved === "string" && isValidReferralCode(saved) ? saved : null);
    if (!code) return;
    creatorApi.attach(code).then(() => {
      forgetReferral();
      try { localStorage.setItem(triedKey(user.id), "1"); } catch { /* Optional. */ }
    }).catch(() => {
      /* Kept for the next sign-in when the service could not be reached. */
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
