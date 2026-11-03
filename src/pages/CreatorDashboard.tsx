import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorDashboardView, type CreatorActions } from "@/components/creators/CreatorDashboardView";
import { creatorApi, type CreatorView } from "@/lib/creatorProgramme";
import { isMedicineSite, siteName } from "@/lib/site";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";

type Load = { state: "loading" } | { state: "ready"; view: CreatorView } | { state: "not_creator" } | { state: "error"; message: string };
const SIGN_IN = `/auth?returnTo=${encodeURIComponent("/creator")}`;
export const ACCESS_REDIRECT_SECONDS = 10;

/** Signed in, but not as the invited creator: say so, then go home. */
function NoAccess({ email }: { email?: string | null }) {
  const { signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(ACCESS_REDIRECT_SECONDS);
  useEffect(() => {
    if (seconds <= 0) { navigate("/", { replace: true }); return; }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div role="alert" className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">You don't have access to this page</h1>
        <p className="text-muted-foreground">
          Creator dashboards open only for the email address the invitation was sent to.
          {email ? <> You're signed in as <strong className="text-foreground">{email}</strong>.</> : null}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => void signOut().then(() => navigate(SIGN_IN, { replace: true }))}>Sign in with a different account</Button>
          <Button asChild variant="outline"><Link to="/" replace>Go to the home page</Link></Button>
        </div>
        {isAdmin && <p className="text-sm"><Link to="/admin/creators" className="underline">Admins: manage creators in Admin</Link></p>}
        <p className="text-xs text-muted-foreground" aria-live="polite">Taking you to the home page in {seconds}s.</p>
      </div>
    </main>
  );
}

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
    if (loading) return;
    // Signed out: straight to sign-in, then back here.
    if (!user) { navigate(SIGN_IN, { replace: true }); return; }
    void refresh();
  }, [loading, user?.id, refresh, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Returning from Stripe: check the account; an expired onboarding link starts a fresh one.
  useEffect(() => {
    const from = params.get("stripe");
    if (!from || load.state !== "ready") return;
    setParams((p) => { p.delete("stripe"); return p; }, { replace: true });
    void stripe(from === "refresh" ? "connect" : "status");
  }, [params, load.state, setParams, stripe]);

  const themed = (node: JSX.Element) => <MedicineTheme enabled={isMedicineSite()}>{node}</MedicineTheme>;
  if (loading || !user || load.state === "loading")
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" /></main>;

  if (load.state === "not_creator") return themed(<NoAccess email={user.email} />);

  if (load.state === "error")
    return themed(
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">{load.message}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => { setLoad({ state: "loading" }); void refresh(); }}>Try again</Button>
            <Button asChild variant="outline"><Link to="/">Back to {siteName()}</Link></Button>
          </div>
        </div>
      </main>
    );

  if (load.state !== "ready") return null;
  return themed(
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
