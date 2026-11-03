import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Gift, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { creatorApi, normaliseCode, referralUrl, rememberReferral, type CreatorPlatform } from "@/lib/creatorProgramme";
import { isMedicineSite, siteProduct } from "@/lib/site";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";

const SITE: Record<CreatorPlatform, { name: string; signUp: string; what: string }> = {
  medicine: { name: "MMI Practice", signUp: "/auth?mode=medicine", what: "Practise Medicine MMI stations with Clara, an AI interviewer, and get written feedback on what you said." },
  "11plus": { name: "intrvue.ai", signUp: "/auth", what: "Practise the 11+ interview out loud with Clara, an AI interviewer, and get feedback written for parents and children." },
};

type Offer = { code: string; platform: CreatorPlatform; creator: string; discountPercent: number };
type State =
  | { state: "loading" }
  | { state: "invalid" }
  | { state: "ready"; offer: Offer; own: boolean };

/** A visit counts once per browser tab: reloading the page doesn't count again. */
const visitKey = (code: string) => `intrvue:referral-visit:${code}`;
function seenOffer(code: string): Offer | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(visitKey(code)) || "null");
    return saved && saved.code === code ? (saved as Offer) : null;
  } catch {
    return null;
  }
}
function rememberOffer(offer: Offer) {
  try { sessionStorage.setItem(visitKey(offer.code), JSON.stringify(offer)); } catch { /* Counting again is harmless. */ }
}

/**
 * Where this link belongs, if it was opened on the other product's own domain. Never the page we're
 * already on: a link on a shared host (previews) or its own domain stays put.
 */
export function referralRedirect(offer: Offer, here = siteProduct(), current = window.location.href): string | null {
  if (here === "combined" || here === offer.platform) return null;
  const target = referralUrl(offer.platform, offer.code);
  const now = new URL(current);
  return new URL(target).origin === now.origin ? null : target;
}

/** /r/:code: counts the visit, remembers the referral in this browser and invites the visitor in. */
export default function ReferralLanding() {
  const { code = "" } = useParams();
  const { user, loading } = useAuth();
  const [state, setState] = useState<State>({ state: "loading" });

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const clean = normaliseCode(code);
    (async () => {
      const known = seenOffer(clean);
      const offer = known ?? (await creatorApi.recordVisit(clean));
      if (cancelled) return;
      if (!offer) { setState({ state: "invalid" }); return; }
      rememberOffer(offer);
      const elsewhere = referralRedirect(offer);
      if (elsewhere) { window.location.replace(elsewhere); return; }
      // The creator opening their own link: it's for sharing, not for their own account.
      const own = user ? await creatorApi.ownsLink(offer.code).catch(() => false) : false;
      if (cancelled) return;
      if (!own) rememberReferral(offer.code);
      setState({ state: "ready", offer, own });
    })().catch(() => !cancelled && setState({ state: "invalid" }));
    return () => { cancelled = true; };
  }, [code, loading, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const medicine = state.state === "ready" ? state.offer.platform === "medicine" : isMedicineSite();
  const themed = (node: JSX.Element) => <MedicineTheme enabled={medicine}>{node}</MedicineTheme>;
  if (state.state === "loading")
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" /></main>;

  if (state.state === "invalid")
    return themed(
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">This link isn't active</h1>
          <p className="text-muted-foreground">It may have been paused or mistyped. You can still look around.</p>
          <Button asChild><a href="/">Continue to the site</a></Button>
        </div>
      </main>
    );

  const { offer } = state;
  const site = SITE[offer.platform];
  if (state.own)
    return themed(
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-5 rounded-3xl border bg-card p-8 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"><Megaphone className="h-4 w-4" aria-hidden /> Your creator link</p>
          <h1 className="text-3xl font-bold leading-tight">This is your link, {offer.creator}</h1>
          <p className="text-muted-foreground">
            Share it with your audience. When someone new opens it and signs up, they
            {offer.discountPercent > 0 ? ` get ${offer.discountPercent}% off their first purchase and` : ""} count towards your earnings.
            Opening it yourself doesn't count.
          </p>
          <code className="block break-all rounded-lg bg-muted px-3 py-2 text-sm">{referralUrl(offer.platform, offer.code)}</code>
          <Button asChild className="gap-2"><Link to="/creator">Open your creator dashboard <ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
        </div>
      </main>
    );

  return themed(
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">A personal recommendation</p>
        <h1 className="text-3xl font-bold leading-tight">{offer.creator} invited you to {site.name}</h1>
        <p className="text-muted-foreground">{site.what}</p>
        {offer.discountPercent > 0 && (
          <p className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <Gift className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span><strong>{offer.discountPercent}% off your first purchase.</strong> Applied automatically at checkout.</span>
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <a href={user ? "/" : site.signUp}>{user ? "Continue" : "Create your free account"} <ArrowRight className="h-4 w-4" aria-hidden /></a>
          </Button>
          {!user && <Button asChild variant="outline"><a href="/">Look around first</a></Button>}
        </div>
        <p className="text-xs text-muted-foreground">
          The offer applies to a new account created in this browser within 30 days. {offer.creator} may earn a share of what you buy.
        </p>
      </div>
    </main>
  );
}
