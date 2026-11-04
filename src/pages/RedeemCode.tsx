import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  CREATOR_LIMITS, PLATFORM_SITE, creatorApi, isValidReferralCode, normaliseCode, referralUrl, rememberReferral,
  type AttachResult, type ReferralOffer,
} from "@/lib/creatorProgramme";
import { isMedicineSite, siteName, siteProduct } from "@/lib/site";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { CodeOutcome } from "@/components/creators/CodeOutcome";

type Outcome =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "elsewhere"; offer: ReferralOffer; url: string }
  | { kind: "saved"; offer: ReferralOffer }
  | { kind: "applied"; result: AttachResult };

/** Where a code belongs, when it's for the other product's own site. */
export function codeElsewhere(offer: ReferralOffer, here = siteProduct()): string | null {
  if (here === "combined" || here === offer.platform) return null;
  return `${new URL(referralUrl(offer.platform, offer.code)).origin}/redeem?code=${encodeURIComponent(offer.code)}`;
}

/**
 * /redeem: enter a creator's code for money off a first purchase. Signed in, it's added to the
 * account straight away; signed out, it's kept in this browser and added after sign-in or sign-up.
 */
export default function RedeemCode() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const medicine = isMedicineSite();

  const apply = useCallback(async (value: string) => {
    const clean = normaliseCode(value.trim());
    if (!isValidReferralCode(clean)) {
      setOutcome({ kind: "error", message: `Codes are ${CREATOR_LIMITS.codeMin} to ${CREATOR_LIMITS.codeMax} letters, numbers or hyphens.` });
      return;
    }
    setOutcome({ kind: "checking" });
    try {
      const offer = await creatorApi.lookup(clean);
      if (!offer) { setOutcome({ kind: "applied", result: { attached: false, reason: "unavailable" } }); return; }
      const url = codeElsewhere(offer);
      if (url) { setOutcome({ kind: "elsewhere", offer, url }); return; }
      if (!user) {
        rememberReferral(offer.code);
        setOutcome({ kind: "saved", offer });
        return;
      }
      setOutcome({ kind: "applied", result: await creatorApi.attach(offer.code) });
    } catch {
      setOutcome({ kind: "error", message: "We couldn't check that code. Please try again." });
    }
  }, [user]);

  // A code in the link (/redeem?code=…) is applied once the sign-in state is known.
  const autoApplied = useRef(false);
  useEffect(() => {
    if (loading || autoApplied.current || !params.get("code")) return;
    autoApplied.current = true;
    void apply(params.get("code")!);
  }, [loading, params, apply]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void apply(code);
  };
  // After signing in they come back here and the code is applied to the account.
  const authLink = (saved: string) => `/auth?${medicine ? "mode=medicine&" : ""}returnTo=${encodeURIComponent(`/redeem?code=${saved}`)}`;

  return (
    <MedicineTheme enabled={medicine}>
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <div className="w-full max-w-lg space-y-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"><Ticket className="h-4 w-4" aria-hidden /> Creator code</p>
            <h1 className="text-3xl font-bold leading-tight">Have a creator code?</h1>
            <p className="text-muted-foreground">Enter the code from a creator you follow for money off your first purchase on {siteName()}.</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Label htmlFor="creator-code">Code</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input id="creator-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. studywithsam"
                autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={40} className="sm:flex-1" />
              <Button type="submit" disabled={!code.trim() || outcome.kind === "checking"} className="gap-2">
                {outcome.kind === "checking" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Apply code
              </Button>
            </div>
          </form>

          {outcome.kind === "error" && <p role="alert" className="text-sm text-destructive">{outcome.message}</p>}
          {outcome.kind === "elsewhere" && (
            <div role="status" className="space-y-3 rounded-xl border bg-muted/40 p-4">
              <p><strong className="block">This code is for {PLATFORM_SITE[outcome.offer.platform]}</strong>
                <span className="text-sm text-muted-foreground">It's {outcome.offer.creator}'s code for {outcome.offer.platform === "medicine" ? "Medicine interview practice" : "11+ interview practice"}. Use it on that site.</span></p>
              <Button asChild variant="outline" className="gap-2"><a href={outcome.url}>Use it on {PLATFORM_SITE[outcome.offer.platform]} <ArrowRight className="h-4 w-4" aria-hidden /></a></Button>
            </div>
          )}
          {outcome.kind === "saved" && (
            <div role="status" className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p><strong className="block">{outcome.offer.discountPercent > 0 ? `${outcome.offer.discountPercent}% off your first purchase` : `${outcome.offer.creator}'s code is saved`}</strong>
                <span className="text-sm text-muted-foreground">Sign in or create a free account on this browser and {outcome.offer.creator}'s code is added to it.</span></p>
              <Button asChild className="gap-2"><a href={authLink(outcome.offer.code)}>Sign in or create an account <ArrowRight className="h-4 w-4" aria-hidden /></a></Button>
            </div>
          )}
          {outcome.kind === "applied" && (
            <div className="space-y-3">
              <CodeOutcome result={outcome.result} />
              {outcome.result.attached && (
                <Button asChild className="gap-2"><a href="/?view=credits">See credit packs <ArrowRight className="h-4 w-4" aria-hidden /></a></Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            One creator code per account, for your first purchase. <a href="/" className="underline underline-offset-2 hover:text-foreground">Back to {siteName()}</a>
          </p>
        </div>
      </main>
    </MedicineTheme>
  );
}
