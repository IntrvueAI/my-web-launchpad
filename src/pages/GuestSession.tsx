import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { guestSupabase } from "@/integrations/supabase/client";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { InterviewPlatform } from "@/components/InterviewPlatform";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPES, type InterviewType } from "@/config/interviewTypes";
import {
  GUEST_INTERVIEW_IDS,
  trialApi,
  TrialError,
  type TrialStatus,
} from "@/lib/guestTrials";

export default function GuestSession() {
  const { user, loading } = useAuth();
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [selected, setSelected] = useState<InterviewType | null>(null);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const status = await trialApi<TrialStatus>({ action: "status" }, true);
      setTrial(status);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to check your trial");
      if (e instanceof TrialError && [401, 403].includes(e.status || 0)) {
        setClosed(true);
        setSelected(null);
      }
    }
  }, []);
  useEffect(() => {
    if (!user?.app_metadata?.mmi_guest_trial) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [user?.id, refresh]);
  useEffect(() => {
    if (!trial) return;
    const timer = setTimeout(
      () => {
        setClosed(true);
        setSelected(null);
        setError(
          "Your guest trial has expired. Thanks for trying MMI Practice.",
        );
      },
      Math.max(0, Date.parse(trial.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [trial?.expiresAt]);
  async function leave() {
    setSelected(null);
    await guestSupabase.auth.signOut({ scope: "local" });
    // Normal account storage is untouched. A document reload selects the normal client.
    window.location.assign("/try");
  }
  return (
    <MedicineTheme live={!!selected}>
      <main className="min-h-screen bg-background px-4 py-6 pb-28 text-foreground">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <a href="/" className="font-display text-xl font-semibold">
              MMI Practice
            </a>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>Private guest trial</span>
              <Button variant="outline" onClick={() => void leave()}>
                Leave trial
              </Button>
            </div>
          </header>
          {loading && <p role="status">Opening your trial…</p>}
          {!loading && !user?.app_metadata?.mmi_guest_trial && (
            <section className="rounded-2xl border bg-card p-8">
              <h1 className="text-2xl font-semibold">
                Your invitation opens this room
              </h1>
              <p className="my-3">
                Use the private link your host sent you to enter your name and
                begin.
              </p>
              <a className="underline" href="/try">
                Return to invitation
              </a>
            </section>
          )}
          {error && (
            <div role="alert" className="mb-5 rounded-xl border bg-card p-4">
              {error}
              {!closed && (
                <Button variant="ghost" onClick={() => void refresh()}>
                  Retry
                </Button>
              )}
            </div>
          )}
          {trial && !closed && (
            <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Welcome, {trial.name}
                  </p>
                  <h1 className="font-display text-3xl font-semibold">
                    {selected
                      ? selected.name
                      : "What would you like to practise?"}
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {trial.remaining} new interviews left · available until{" "}
                  {new Date(trial.expiresAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {selected ? (
                <>
                  <Button
                    variant="outline"
                    className="mb-5"
                    onClick={() => {
                      setSelected(null);
                      void refresh();
                    }}
                  >
                    End this attempt and choose another
                  </Button>
                  <InterviewPlatform
                    key={selected.id}
                    selectedInterviewType={selected}
                  />
                </>
              ) : (
                <>
                  <p className="mb-6 max-w-2xl text-muted-foreground">
                    Start small or try a complete circuit. End the interview
                    using its End Interview button to save your transcript and
                    receive feedback. Your host can review the saved results.
                  </p>
                  {trial.remaining === 0 && (
                    <p role="status" className="mb-5 rounded-xl border p-4">
                      You’ve used the interviews included in this invitation.
                      Thank you for testing with us.
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {GUEST_INTERVIEW_IDS.map((id) => {
                      const type = INTERVIEW_TYPES[id];
                      return (
                        <article
                          key={id}
                          className="flex flex-col rounded-2xl border bg-card p-6"
                        >
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                            {id.endsWith("-pilot")
                              ? "Pilot preview"
                              : id.endsWith("-practice")
                                ? "Focused station"
                                : "Full circuit"}{" "}
                            ·{" "}
                            {id.endsWith("-practice")
                              ? "5 min + 30 sec reading"
                              : `up to ${type.duration} minutes`}
                          </p>
                          <h2 className="text-xl font-semibold">{type.name}</h2>
                          <p className="mb-6 mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {type.description}
                          </p>
                          <Button
                            disabled={trial.remaining < 1 || !!error}
                            onClick={() => setSelected(type)}
                          >
                            Try this interview
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </MedicineTheme>
  );
}
