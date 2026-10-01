import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { BetaPortalNav } from "@/components/admin/BetaPortalNav";
import {
  trialApi,
  type TrialInvite,
  type TrialGuest,
  type TrialFeedback,
  type TrialReview,
  trialInvitationPath,
} from "@/lib/guestTrials";
import { MEDICINE_ORIGIN } from "@/lib/site";

export default function AdminGuestTrials() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading } = useAdminStatus();
  const [invites, setInvites] = useState<TrialInvite[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<{
    guests: TrialGuest[];
    feedback: TrialFeedback[];
    reviews: TrialReview[];
  } | null>(null);
  const [label, setLabel] = useState("Private product preview");
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
    if (!isAdmin) return;
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
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
          reviews: TrialReview[];
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
    `${import.meta.env.DEV ? window.location.origin : MEDICINE_ORIGIN}${trialInvitationPath(invite)}`;
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
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground">
        <div className="mx-auto max-w-6xl">
          <a href="/" className="text-sm font-semibold underline">
            ← Back to dashboard
          </a>
          <h1 className="mb-3 mt-7 font-display text-4xl font-semibold">
            Beta testing portal
          </h1>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            Create a private link for each tester. They enter their name and get
            two interviews, with no email, password or signup. Their results and
            product feedback are saved in your private feedback hub.
          </p>
          <BetaPortalNav />
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
                className="mb-8 grid items-end gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-3"
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
                <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
                  One tester per new link · two interview attempts · six hours
                  from joining · required product feedback. The link closes to
                  new testers once claimed. Interview attempts count when
                  started, including attempts ended early.
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
                            : invite.link_code
                              ? invite.review_count
                                ? "Complete · feedback received"
                                : invite.guest_count
                                  ? `Claimed · ${invite.attempts_used || 0}/2 attempts used`
                                  : "Ready to share · one tester"
                              : `Earlier invitation · up to ${invite.max_guests} guests`}{" "}
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
                                disabled={
                                  (invite.guest_count || 0) >= invite.max_guests
                                }
                                onClick={() => void copy(invite)}
                              >
                                {(invite.guest_count || 0) >= invite.max_guests
                                  ? "Already claimed"
                                  : "Copy link"}
                              </Button>
                              {(invite.guest_count || 0) <
                                invite.max_guests && (
                                <Button size="sm" variant="outline" asChild>
                                  <a
                                    href={`mailto:?subject=${encodeURIComponent("Your private MMI Practice beta invitation")}&body=${encodeURIComponent(`I'd love your feedback on MMI Practice. This private link gives you two interview attempts, followed by a short feedback form. Enter your name to begin; no signup or payment needed. Please keep the link for yourself.\n\n${link(invite)}`)}`}
                                  >
                                    Draft email
                                  </a>
                                </Button>
                              )}
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
                        const review = results.reviews?.find(
                          (r) => r.trial_id === guest.id,
                        );
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
                              {guest.interviews_started} attempts used ·{" "}
                              {feedback.length} saved results
                            </p>
                            <p className="mb-4 text-sm text-muted-foreground">
                              {review
                                ? `${review.rating}/5 usefulness · Product review received`
                                : "Awaiting product feedback"}
                            </p>
                            <Button
                              asChild
                              variant="outline"
                              className="rounded-xl"
                            >
                              <Link
                                to={`/admin/guest-feedback?invite=${selected}&trial=${guest.id}`}
                              >
                                View interviews & product feedback
                              </Link>
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </MedicineTheme>
  );
}
