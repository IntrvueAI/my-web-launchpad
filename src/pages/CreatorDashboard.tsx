import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorDashboardView, type CreatorActions } from "@/components/creators/CreatorDashboardView";
import { creatorApi, type CreatorView } from "@/lib/creatorProgramme";
import { siteName } from "@/lib/site";

type Load = { state: "loading" } | { state: "ready"; view: CreatorView } | { state: "not_creator" } | { state: "error"; message: string };

/** /creator: a creator's links, sign-ups, earnings and Stripe payouts. */
export default function CreatorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState<CreatorActions["busy"]>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      await creatorApi.claim();
      const view = await creatorApi.dashboard();
      setLoad(view ? { state: "ready", view } : { state: "not_creator" });
    } catch (e) {
      setLoad({ state: "error", message: e instanceof Error ? e.message : "Your dashboard could not be loaded." });
    }
  }, []);

  const stripe = useCallback(async (action: "connect" | "status" | "stripe_dashboard") => {
    setBusy(action);
    setNotice("");
    try {
      const result = await creatorApi.stripe(action);
      if (action === "connect" && result.url) { window.location.assign(result.url); return; }
      if (action === "stripe_dashboard" && result.url) { window.open(result.url, "_blank", "noopener"); }
      if (action === "status") {
        setNotice(result.payoutStatus === "verified" ? "Payouts are ready. Stripe will pay you when your earnings are released."
          : result.due ? `Stripe still needs ${result.due} detail${result.due === 1 ? "" : "s"}. Continue setup to finish.`
          : "Stripe is checking your details. This usually takes a few minutes.");
        await refresh();
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Stripe could not be reached. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  useEffect(() => {
    if (loading || !user) return;
    void refresh();
  }, [loading, user, refresh]);

  // Returning from Stripe: check the account; an expired onboarding link starts a fresh one.
  useEffect(() => {
    const from = params.get("stripe");
    if (!from || load.state !== "ready") return;
    setParams((p) => { p.delete("stripe"); return p; }, { replace: true });
    void stripe(from === "refresh" ? "connect" : "status");
  }, [params, load.state, setParams, stripe]);

  if (loading || (user && load.state === "loading"))
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" /></main>;

  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Creator dashboard</h1>
          <p className="text-muted-foreground">Sign in with the email address your invitation was sent to.</p>
          <Button onClick={() => navigate(`/auth?returnTo=${encodeURIComponent("/creator")}`)}>Sign in</Button>
        </div>
      </main>
    );

  if (load.state === "not_creator" || load.state === "error")
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">{load.state === "error" ? "Something went wrong" : "No creator account here"}</h1>
          <p className="text-muted-foreground">
            {load.state === "error" ? load.message
              : `This page is for ${siteName()} creators. Sign in with the email your invitation was sent to, or email founders@intrvue.ai to join the programme.`}
          </p>
          <Button asChild variant="outline"><Link to="/">Back to {siteName()}</Link></Button>
        </div>
      </main>
    );

  if (load.state !== "ready") return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-foreground">
      <CreatorDashboardView view={load.view} actions={{
        onConnect: () => void stripe("connect"),
        onRefresh: () => void stripe("status"),
        onStripeDashboard: () => void stripe("stripe_dashboard"),
        busy,
        notice,
      }} />
    </main>
  );
}
