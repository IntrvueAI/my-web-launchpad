import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FeedbackVersions } from "@/components/FeedbackVersions";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
import {
  trialApi,
  type TrialInvite,
  type TrialGuest,
  type TrialFeedback,
} from "@/lib/guestTrials";
import { MEDICINE_DOMAIN_LIVE, MEDICINE_ORIGIN } from "@/lib/site";

export default function AdminGuestTrials() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading } = useAdminStatus();
  const [invites, setInvites] = useState<TrialInvite[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<{
    guests: TrialGuest[];
    feedback: TrialFeedback[];
  } | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [label, setLabel] = useState("Private product preview");
  const [maxGuests, setMaxGuests] = useState(10);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const data = await trialApi<{ invites: TrialInvite[] }>({
        action: "list",
      });
      setInvites(data.invites);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load invitations");
    }
  }, []);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);
  useEffect(() => {
    if (!selected) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setResults(null);
    const refresh = async () => {
      try {
        const data = await trialApi<{
          guests: TrialGuest[];
          feedback: TrialFeedback[];
        }>({ action: "guests", inviteId: selected });
        if (!cancelled) setResults(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unable to load results");
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selected]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { invite } = await trialApi<{ invite: TrialInvite }>({
        action: "create",
        label,
        maxGuests,
        days,
      });
      setSelected(invite.id);
      await load();
      setMessage("Invitation created. Copy its private link below.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create invitation");
    } finally {
      setBusy(false);
    }
  }
  const link = (invite: TrialInvite) =>
    `${MEDICINE_DOMAIN_LIVE ? MEDICINE_ORIGIN : window.location.origin}/try#${invite.code}`;
  async function copy(invite: TrialInvite) {
    try {
      await navigator.clipboard.writeText(link(invite));
      setMessage("Private invitation copied. Share it only with your testers.");
    } catch {
      setMessage("Copy the link from the field below.");
    }
  }
  async function revoke(invite: TrialInvite) {
    setBusy(true);
    setError("");
    try {
      await trialApi({ action: "revoke", inviteId: invite.id });
      await load();
      setMessage(
        "Invitation closed. New interview requests are blocked; open trial pages will close within 30 seconds.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to close invitation");
    } finally {
      setBusy(false);
    }
  }
  async function showFeedback(item: TrialFeedback) {
    try {
      const result = await trialApi<{ feedback: Record<string, unknown> }>({
        action: "feedback",
        inviteId: selected,
        feedbackId: item.id,
      });
      setDetail(result.feedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load feedback");
    }
  }
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground">
        <div className="mx-auto max-w-6xl">
          <a href="/" className="text-sm font-semibold underline">
            ← Back to dashboard
          </a>
          <h1 className="mb-3 mt-7 font-display text-4xl font-semibold">
            Your guest trials
          </h1>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            Invite testers to try MMI Practice and follow their results here.
            Guest interviews are sponsored by the invitation; they do not spend
            your personal credits.
          </p>
          {loading || isLoading ? (
            <p role="status">Checking founder access…</p>
          ) : !user ? (
            <a
              className="underline"
              href="/auth?mode=medicine&returnTo=/admin/guest-trials"
            >
              Sign into your founder account
            </a>
          ) : !isAdmin ? (
            <p>Founder access is required to manage trial invitations.</p>
          ) : (
            <>
              {error && (
                <p
                  role="alert"
                  className="mb-5 rounded-xl border border-destructive/30 p-4"
                >
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="mb-5 rounded-xl border bg-card p-4">
                  {message}
                </p>
              )}
              <form
                onSubmit={create}
                className="mb-8 grid items-end gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                <label className="space-y-2 text-sm font-medium">
                  Invitation label
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    maxLength={100}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Number of guests
                  <Input
                    type="number"
                    value={maxGuests}
                    min={1}
                    max={50}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Link valid for (days)
                  <Input
                    type="number"
                    value={days}
                    min={1}
                    max={14}
                    onChange={(e) => setDays(Number(e.target.value))}
                    required
                  />
                </label>
                <Button disabled={busy}>Create private invitation</Button>
                <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
                  Each guest gets up to 12 interviews across all nine Medicine
                  modes and six hours from joining, ending earlier if the link
                  expires. Closing an invitation blocks further use.
                </p>
              </form>
              <div className="grid gap-7 lg:grid-cols-[340px_1fr]">
                <section aria-label="Invitations" className="space-y-3">
                  <h2 className="mb-3 text-xl font-semibold">Invitations</h2>
                  {!invites.length && (
                    <p className="text-muted-foreground">
                      Create your first invitation above.
                    </p>
                  )}
                  {invites.map((invite) => (
                    <article
                      key={invite.id}
                      className={`rounded-2xl border bg-card p-5 ${selected === invite.id ? "ring-2 ring-primary" : ""}`}
                    >
                      <button
                        className="mb-2 text-left font-semibold underline"
                        onClick={() => setSelected(invite.id)}
                      >
                        {invite.label}
                      </button>
                      <p className="mb-3 text-xs text-muted-foreground">
                        {invite.revoked_at
                          ? "Closed"
                          : Date.parse(invite.expires_at) <= Date.now()
                            ? "Expired"
                            : `Up to ${invite.max_guests} guests`}{" "}
                        · expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                      {!invite.revoked_at &&
                        Date.parse(invite.expires_at) > Date.now() && (
                          <>
                            <label className="text-xs">
                              Private invitation link
                              <Input
                                readOnly
                                value={link(invite)}
                                onFocus={(e) => e.target.select()}
                                className="my-2 text-xs"
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => void copy(invite)}
                              >
                                Copy link
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void revoke(invite)}
                                disabled={busy}
                              >
                                Close invitation
                              </Button>
                            </div>
                          </>
                        )}
                    </article>
                  ))}
                </section>
                <section aria-label="Guest results">
                  <h2 className="mb-3 text-xl font-semibold">Guest results</h2>
                  {!selected ? (
                    <p>Select an invitation to see your testers.</p>
                  ) : !results ? (
                    <p role="status">Loading testers…</p>
                  ) : !results.guests.length ? (
                    <p className="rounded-2xl border p-6 text-muted-foreground">
                      No one has joined this invitation yet. This page refreshes
                      every 30 seconds.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {results.guests.map((guest) => {
                        const feedback = results.feedback.filter(
                          (f) => f.user_id === guest.guest_user_id,
                        );
                        return (
                          <article
                            key={guest.id}
                            className="rounded-2xl border bg-card p-5"
                          >
                            <h3 className="text-lg font-semibold">
                              {guest.display_name}
                            </h3>
                            <p className="mb-4 text-xs text-muted-foreground">
                              Joined{" "}
                              {new Date(guest.created_at).toLocaleString()} ·{" "}
                              {feedback.length} saved results
                            </p>
                            {!feedback.length && (
                              <p className="text-sm text-muted-foreground">
                                Feedback will appear after they finish an
                                interview.
                              </p>
                            )}
                            {feedback.map((f) => (
                              <div key={f.id} className="border-t py-4">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <h4 className="font-medium">
                                    {INTERVIEW_TYPES[f.interview_type]?.name ||
                                      f.interview_type}
                                  </h4>
                                  <span className="font-semibold">
                                    {f.total_score === null
                                      ? "Not scored"
                                      : `${f.total_score}/20`}
                                  </span>
                                </div>
                                <p className="my-2 text-sm text-muted-foreground">
                                  {f.detailed_feedback?.overall ||
                                    "Open this result to read the assessment."}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void showFeedback(f)}
                                >
                                  View feedback & transcript
                                </Button>
                              </div>
                            ))}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          <Dialog
            open={!!detail}
            onOpenChange={(open) => {
              if (!open) setDetail(null);
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogTitle>Guest interview feedback</DialogTitle>
              {detail && (
                <FeedbackVersions
                  feedback={detail}
                  interviewType={String(detail.interview_type)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </MedicineTheme>
  );
}
