import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const [busy, setBusy] = useState(false);
  const [attemptFinished, setAttemptFinished] = useState(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const feedbackPage = () => window.location.assign("/guest-feedback");
  const refresh = useCallback(async () => {
    try {
      const status = await trialApi<TrialStatus>({ action: "status" }, true);
      setTrial(status);
      if (
        status.phase === "complete" ||
        (!selectedRef.current && status.phase === "review")
      ) {
        feedbackPage();
        return;
      }
      if (status.accessClosed) {
        setSelected(null);
        feedbackPage();
      }
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
        setSelected(null);
        feedbackPage();
      },
      Math.max(0, Date.parse(trial.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [trial?.expiresAt]);
  async function leave() {
    setBusy(true);
    try {
      await trialApi({ action: "request-review" }, true);
      feedbackPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  const finished = useCallback(async (feedbackReady: boolean) => {
    setAttemptFinished(true);
    try {
      const status = await trialApi<TrialStatus>({ action: "status" }, true);
      setTrial(status);
      // Keep the transcript and retry controls visible if assessment generation failed.
      if (status.phase !== "practice" && feedbackReady) feedbackPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to check your trial");
    }
  }, []);
  return (
    <MedicineTheme live={!!selected}>
      <main className="min-h-screen bg-background px-4 py-6 pb-28 text-foreground">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <span className="font-display text-xl font-semibold">
              MMI Practice
            </span>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>Private guest trial</span>
              <Button
                variant="outline"
                disabled={busy || !trial || closed}
                onClick={() => void leave()}
              >
                Finish trial & give feedback
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
                    disabled={busy}
                    onClick={() => {
                      setSelected(null);
                      selectedRef.current = null;
                      void refresh();
                    }}
                  >
                    {attemptFinished
                      ? trial.remaining === 0
                        ? "Continue to trial feedback"
                        : "Continue to your next interview"
                      : "Back to interviews"}
                  </Button>
                  <InterviewPlatform
                    key={selected.id}
                    selectedInterviewType={selected}
                    onAttemptFinished={(ready) => void finished(ready)}
                    onBusyChange={setBusy}
                  />
                </>
              ) : (
                <>
                  <p className="mb-6 max-w-2xl text-muted-foreground">
                    Your invitation includes two attempts. Choose a focused
                    station or a full circuit. End the interview using its End
                    Interview button to save your transcript and receive
                    feedback. Your host can review the saved results.
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
                            {id === 'medicine-mmi-practice'
                              ? 'Full MMI · 6 stations · 1 min reading + 5 min answering each'
                              : '7-minute mini interview · 1 min reading + 5 min answering'}
                          </p>
                          <h2 className="text-xl font-semibold">{type.name}</h2>
                          <p className="mb-6 mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {type.description}
                          </p>
                          <Button
                            disabled={trial.remaining < 1 || !!error}
                            onClick={() => {
                              setAttemptFinished(false);
                              setSelected(type);
                            }}
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
