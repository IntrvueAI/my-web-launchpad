import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { guestSupabase } from "@/integrations/supabase/client";
import { trialApi, type TrialInvite } from "@/lib/guestTrials";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";

export default function GuestWelcome() {
  const { code: pathCode } = useParams();
  const [code] = useState(() => {
    try {
      const fragment = pathCode || window.location.hash.slice(1);
      if (fragment) {
        sessionStorage.setItem("mmi:trial-invite", fragment);
        window.history.replaceState({}, "", "/try");
      }
      return fragment || sessionStorage.getItem("mmi:trial-invite") || "";
    } catch {
      return "";
    }
  });
  const [invite, setInvite] = useState<TrialInvite | null>(null);
  const [name, setName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!code) {
      setError("Open the private invitation link your host shared with you.");
      return;
    }
    trialApi<{ invite: TrialInvite }>({ action: "inspect", code }, true)
      .then((result) => {
        if (!cancelled) setInvite(result.invite);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);
  async function begin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Stable across a network retry, unique to this invite and tab.
      const key = `mmi:trial-nonce:${invite!.id}`;
      const nonce = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, nonce);
      const result = await trialApi<{
        session: { access_token: string; refresh_token: string };
      }>({ action: "redeem", code, name, acknowledged, nonce }, true);
      const { error } = await guestSupabase.auth.setSession(result.session);
      if (error)
        throw new Error("We could not open your trial. Please try again.");
      window.location.assign("/guest-session");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-5 py-10 pb-28 text-foreground">
        <a
          href="/"
          className="mx-auto block max-w-5xl font-display text-xl font-semibold"
        >
          MMI Practice
        </a>
        <div className="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
          <section className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              A personal invitation
            </p>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Welcome to your
              <br />
              practice room.
            </h1>
            <p className="text-lg text-muted-foreground">
              Thanks for helping us test MMI Practice. Your private invitation
              includes {invite?.max_interviews ?? 2} interview attempts and a
              short feedback form at the end. Enter your name to begin. No
              email, password or signup needed.
            </p>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Ethics, communication, reasoning and more</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <span>A full MMI or a seven-minute mini interview</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Independent MMI practice covering skills shared across medical school interviews.
            </p>
          </section>
          <section
            className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
            aria-label="Join your trial"
          >
            <h2 className="font-display text-2xl font-semibold">
              Make yourself at home
            </h2>
            {invite && (
              <p className="mt-2 text-sm text-muted-foreground">
                {invite.max_interviews} interviews · up to {invite.guest_hours}{" "}
                hours · no payment required
              </p>
            )}
            {invite && (
              <p className="mt-3 text-sm text-muted-foreground">
                {invite.max_guests === 1
                  ? "This link admits one tester."
                  : "This is your private tester invitation."}{" "}
                Use this browser tab for your interviews; refreshing keeps your
                remaining attempts. A short product-feedback form completes your
                trial.
              </p>
            )}
            {!invite && !error && (
              <p role="status" className="mt-6">
                Checking your invitation…
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="my-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
              >
                {error}
              </p>
            )}
            {invite && (
              <form onSubmit={begin} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="guest-name"
                    className="mb-2 block font-medium"
                  >
                    What should we call you?
                  </label>
                  <Input
                    id="guest-name"
                    autoComplete="given-name"
                    placeholder="Your name or nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={80}
                    disabled={busy}
                  />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your host can see your name, interview transcript, scores and
                  feedback to help improve the product. Your microphone is used
                  for the live interview. Please avoid sharing patient details
                  or other sensitive information.
                </p>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                    type="checkbox"
                    required
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    I understand how my trial results will be shared with my
                    host.
                  </span>
                </label>
                <Button
                  className="min-h-12 w-full gap-2"
                  disabled={busy || !acknowledged}
                >
                  {busy ? "Opening your room…" : "Enter practice room"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </section>
        </div>
      </main>
    </MedicineTheme>
  );
}
