import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { guestSupabase } from "@/integrations/supabase/client";
import { FeedbackVersions } from "@/components/FeedbackVersions";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
import {
  trialApi,
  trialReviewExperience,
  type TrialStatus,
  type TrialReview,
} from "@/lib/guestTrials";

export default function GuestTrialFeedback() {
  const { user, loading } = useAuth();
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [rating, setRating] = useState(0);
  const [experience, setExperience] = useState<TrialReview["experience"] | "">(
    "",
  );
  const [improvement, setImprovement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [assessmentError, setAssessmentError] = useState("");
  const open = useCallback(async () => {
    setError("");
    try {
      const status = await trialApi<TrialStatus>({ action: "status" }, true);
      if (status.phase === "practice") {
        window.location.assign("/guest-session");
        return;
      }
      // Prevent starting another attempt in a second tab once the survey is open.
      setTrial(
        status.phase === "complete"
          ? status
          : await trialApi<TrialStatus>({ action: "request-review" }, true),
      );
      try {
        const draft = JSON.parse(
          sessionStorage.getItem(`mmi:review:${status.trialId}`) || "null",
        );
        if (draft) {
          setRating(draft.rating || 0);
          setExperience(draft.experience || "");
          setImprovement(draft.improvement || "");
        }
      } catch {
        /* The form remains usable without storage. */
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to open feedback. Please retry.",
      );
    }
  }, []);
  useEffect(() => {
    if (user?.app_metadata?.mmi_guest_trial) void open();
  }, [user?.id, open]);
  useEffect(() => {
    if (trial?.phase !== "complete" || !user) return;
    let cancelled = false;
    void guestSupabase
      .from("feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error)
          setAssessmentError(
            "Your product feedback is saved. Reload to try loading your interview results again.",
          );
        else
          setAssessments((data || []) as unknown as Record<string, unknown>[]);
      });
    return () => {
      cancelled = true;
    };
  }, [trial?.phase, user?.id]);
  useEffect(() => {
    if (!trial || trial.phase === "complete") return;
    try {
      sessionStorage.setItem(
        `mmi:review:${trial.trialId}`,
        JSON.stringify({ rating, experience, improvement }),
      );
    } catch {
      /* Optional draft recovery. */
    }
  }, [trial, rating, experience, improvement]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const status = await trialApi<TrialStatus>(
        { action: "submit-review", rating, experience, improvement },
        true,
      );
      setTrial(status);
      try {
        sessionStorage.removeItem(`mmi:review:${status.trialId}`);
      } catch {
        /* Optional draft. */
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your feedback was not saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-5 py-10 pb-28 text-foreground">
        <div className="mx-auto max-w-xl">
          <p className="mb-10 font-display text-xl font-semibold">
            MMI Practice
          </p>
          {loading || (!trial && !error && user) ? (
            <p role="status">Opening your feedback form…</p>
          ) : null}
          {!loading && !user && (
            <section className="rounded-3xl border bg-card p-8">
              <h1 className="text-2xl font-semibold">
                Open your private invitation
              </h1>
              <p className="mt-3 text-muted-foreground">
                Your trial and feedback form are available in the browser tab
                where you joined.
              </p>
            </section>
          )}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-destructive/30 bg-card p-4"
            >
              <p>{error}</p>
              {!trial && (
                <Button
                  variant="outline"
                  onClick={() => void open()}
                  className="mt-3"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          {trial?.phase === "complete" ? (
            <section className="rounded-3xl border bg-card p-8 text-center sm:p-10">
              <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-primary" />
              <h1 className="font-display text-3xl font-semibold">
                Thank you, {trial.name}.
              </h1>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Your feedback has been sent to the team alongside your trial
                results. Your beta trial is complete.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                You can close this tab. For another trial, ask your host for a
                new invitation.
              </p>
              <Button asChild className="mt-7">
                <a href="/">Explore MMI Practice</a>
              </Button>
            </section>
          ) : (
            trial && (
              <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                  One final step · about 30 seconds
                </p>
                <h1 className="font-display text-3xl font-semibold">
                  Help shape MMI Practice.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Thanks for testing, {trial.name}. Complete this short form to
                  finish your trial. Your host sees your responses with your
                  name and interview results.
                </p>
                <form onSubmit={submit} className="mt-8 space-y-7">
                  <fieldset disabled={busy}>
                    <legend className="mb-3 font-semibold">
                      How useful was the experience?
                    </legend>
                    <div
                      className="flex gap-2"
                      role="radiogroup"
                      aria-label="Usefulness rating"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={rating === value}
                          aria-label={`${value} out of 5`}
                          onClick={() => setRating(value)}
                          className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl border p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${rating >= value ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground"}`}
                        >
                          <Star
                            className="h-5 w-5"
                            fill={rating >= value ? "currentColor" : "none"}
                          />
                          <span className="text-xs">{value}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Not useful</span>
                      <span>Very useful</span>
                    </div>
                  </fieldset>
                  <fieldset disabled={busy} className="space-y-2">
                    <legend className="mb-3 font-semibold">
                      Did the interview work smoothly?
                    </legend>
                    {Object.entries(trialReviewExperience).map(
                      ([value, label]) => (
                        <label
                          key={value}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${experience === value ? "border-primary bg-primary/5" : "bg-background"}`}
                        >
                          <input
                            type="radio"
                            name="experience"
                            value={value}
                            checked={experience === value}
                            onChange={() =>
                              setExperience(value as TrialReview["experience"])
                            }
                            required
                            className="h-4 w-4 accent-teal-700"
                          />
                          {label}
                        </label>
                      ),
                    )}
                  </fieldset>
                  <div>
                    <label
                      htmlFor="improvement"
                      className="mb-3 block font-semibold"
                    >
                      What should we keep or improve?
                    </label>
                    <Textarea
                      id="improvement"
                      value={improvement}
                      onChange={(e) => setImprovement(e.target.value)}
                      required
                      minLength={5}
                      maxLength={1500}
                      disabled={busy}
                      rows={4}
                      placeholder="A useful moment, something confusing, or an issue you noticed…"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      A short sentence is enough. Please avoid sensitive
                      personal information.
                    </p>
                  </div>
                  <Button
                    className="min-h-12 w-full"
                    disabled={
                      busy ||
                      !rating ||
                      !experience ||
                      improvement.trim().length < 5
                    }
                  >
                    {busy ? "Sending feedback…" : "Send feedback & finish"}
                  </Button>
                </form>
              </section>
            )
          )}
          {trial?.phase === "complete" && (
            <section className="mt-8 space-y-4">
              <h2 className="font-display text-2xl font-semibold">
                Your interview results
              </h2>
              {assessmentError && (
                <p role="status" className="text-sm text-muted-foreground">
                  {assessmentError}
                </p>
              )}
              {assessments.map((item) => (
                <details
                  key={String(item.id)}
                  className="rounded-2xl border bg-card p-5"
                >
                  <summary className="cursor-pointer font-semibold">
                    {INTERVIEW_TYPES[String(item.interview_type)]?.name ||
                      "Medicine interview"}{" "}
                    ·{" "}
                    {typeof item.total_score === "number"
                      ? `${item.total_score}/20`
                      : "Not scored"}
                  </summary>
                  <div className="mt-5">
                    <FeedbackVersions
                      feedback={item}
                      interviewType={String(item.interview_type)}
                    />
                  </div>
                </details>
              ))}
              {!assessments.length && !assessmentError && (
                <p className="text-sm text-muted-foreground">
                  Completed interview assessments will appear here when
                  available. Your host can also review saved results.
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </MedicineTheme>
  );
}
