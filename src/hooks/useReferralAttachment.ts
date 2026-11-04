import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { attachOutcome, creatorApi, forgetReferral, isValidReferralCode, storedReferral } from "@/lib/creatorProgramme";
import { isGuestDocument } from "@/lib/site";

const triedKey = (userId: string) => `intrvue:referral-tried:${userId}`;

/**
 * After sign-in, attaches the creator link this account arrived with: the code remembered in this
 * browser, or the one saved with the account at sign-up (for confirmation emails opened on another
 * device). The server decides whether it counts (until the account's first purchase on that
 * platform, never the creator's own), and the person is told either way.
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
    creatorApi.attach(code).then((result) => {
      forgetReferral();
      // A creator signing in, a paused link or a repeat of the same link needs no message.
      const quiet = "reason" in result ? result.reason === "own_link" || result.reason === "unavailable" : result.already;
      if (!quiet) {
        const { title, text } = attachOutcome(result);
        toast({ title, description: text });
      }
      try { localStorage.setItem(triedKey(user.id), "1"); } catch { /* Optional. */ }
    }).catch(() => {
      /* Kept for the next sign-in when the service could not be reached. */
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
