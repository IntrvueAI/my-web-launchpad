import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowRight, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { creatorApi, normaliseCode, referralUrl, rememberReferral, type CreatorPlatform } from "@/lib/creatorProgramme";
import { siteProduct } from "@/lib/site";

const SITE: Record<CreatorPlatform, { name: string; signUp: string; what: string }> = {
  medicine: { name: "MMI Practice", signUp: "/auth?mode=medicine", what: "Practise Medicine MMI stations with Clara, an AI interviewer, and get written feedback on what you said." },
  "11plus": { name: "intrvue.ai", signUp: "/auth", what: "Practise the 11+ interview out loud with Clara, an AI interviewer, and get feedback written for parents and children." },
};

type State = { state: "loading" } | { state: "invalid" } | { state: "ready"; creator: string; discount: number; platform: CreatorPlatform };

/** /r/:code: counts the visit, remembers the referral in this browser and invites the visitor in. */
export default function ReferralLanding() {
  const { code = "" } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState<State>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const clean = normaliseCode(code);
    creatorApi.recordVisit(clean).then((offer) => {
      if (cancelled) return;
      if (!offer) { setState({ state: "invalid" }); return; }
      // Links are per site: send a Medicine link opened on intrvue.ai (or the reverse) to its own site,
      // where the referral is remembered. Local development stays on one host.
      const here = siteProduct();
      if (offer.platform !== here && !window.location.hostname.endsWith("localhost")) {
        window.location.replace(referralUrl(offer.platform, offer.code));
        return;
      }
      rememberReferral(offer.code);
      setState({ state: "ready", creator: offer.creator, discount: offer.discountPercent, platform: offer.platform });
    }).catch(() => !cancelled && setState({ state: "invalid" }));
    return () => { cancelled = true; };
  }, [code]);

  if (state.state === "loading")
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" /></main>;

  if (state.state === "invalid")
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">This link isn't active</h1>
          <p className="text-muted-foreground">It may have been paused or mistyped. You can still look around.</p>
          <Button asChild><a href="/">Continue to the site</a></Button>
        </div>
      </main>
    );

  const site = SITE[state.platform];
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">A personal recommendation</p>
        <h1 className="text-3xl font-bold leading-tight">{state.creator} invited you to {site.name}</h1>
        <p className="text-muted-foreground">{site.what}</p>
        {state.discount > 0 && (
          <p className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <Gift className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span><strong>{state.discount}% off your first purchase.</strong> Applied automatically at checkout.</span>
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <a href={user ? "/" : site.signUp}>{user ? "Continue" : "Create your free account"} <ArrowRight className="h-4 w-4" aria-hidden /></a>
          </Button>
          {!user && <Button asChild variant="outline"><a href="/">Look around first</a></Button>}
        </div>
        <p className="text-xs text-muted-foreground">
          The offer applies to a new account created in this browser within 30 days. {state.creator} may earn a share of what you buy.
        </p>
      </div>
    </main>
  );
}
