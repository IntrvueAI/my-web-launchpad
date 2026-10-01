import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  MessageSquareText,
  RefreshCw,
  Search,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { BetaPortalNav } from "@/components/admin/BetaPortalNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FeedbackSummary,
  type SummaryFeedback,
} from "@/components/feedback/FeedbackSummary";
import {
  GUEST_INTERVIEW_IDS,
  trialApi,
  trialReviewExperience,
  type TrialInbox,
  type TrialInboxEntry,
  type TrialInterviewSummary,
} from "@/lib/guestTrials";
import {
  INTERVIEW_TYPES,
  getInterviewTypeConfig,
} from "@/config/interviewTypes";
import type { InterviewType } from "@/types/interview";
import { censorTranscript } from "@/interview/shared/transcript";
import { shortExcerpt } from "@/utils/feedbackSummary";

const date = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const title = (value: string) =>
  INTERVIEW_TYPES[value]?.name || "Medicine interview";
const selectClass =
  "min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export default function AdminGuestFeedback() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading } = useAdminStatus();
  const [params, setParams] = useSearchParams();
  const queryText = params.get("q") || "";
  const [search, setSearch] = useState(queryText);
  const review = params.get("review") || "all";
  const interviewType = params.get("type") || "";
  const inviteId = params.get("invite") || null;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const selectedId = params.get("trial");
  const selectedInterview = params.get("interview");
  useEffect(() => setSearch(queryText), [queryText]);
  useEffect(() => {
    if (search === queryText) return;
    const timer = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          search.trim() ? next.set("q", search.trim()) : next.delete("q");
          ["page", "trial", "interview"].forEach((key) => next.delete(key));
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, queryText, setParams]);
  function filter(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      value ? next.set(key, value) : next.delete(key);
      ["page", "trial", "interview"].forEach((name) => next.delete(name));
      return next;
    });
  }
  const inbox = useQuery({
    queryKey: [
      "beta-feedback-inbox",
      user?.id,
      queryText,
      review,
      interviewType,
      inviteId,
      page,
    ],
    queryFn: () =>
      trialApi<TrialInbox>({
        action: "feedback-inbox",
        search: queryText,
        review,
        interviewType,
        inviteId,
        page,
      }),
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
    retry: 1,
    gcTime: 0,
  });
  const entries = inbox.data?.trials || [];
  const selected = selectedId
    ? entries.find((item) => item.id === selectedId)
    : entries[0];
  const activeInterview =
    selected?.interviews.find(
      (item) =>
        item.id === selectedInterview || item.feedback_id === selectedInterview,
    ) ||
    selected?.interviews.find(
      (item) => !interviewType || item.interview_type === interviewType,
    ) ||
    selected?.interviews[0];
  function chooseTrial(id: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("trial", id);
      next.delete("interview");
      return next;
    });
    window.requestAnimationFrame(() =>
      document.getElementById("tester-feedback-heading")?.focus(),
    );
  }
  function chooseInterview(id: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (selected) next.set("trial", selected.id);
        next.set("interview", id);
        return next;
      },
      { replace: true },
    );
  }
  const filtered = !!(
    queryText ||
    interviewType ||
    inviteId ||
    review !== "all"
  );
  const total = inbox.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / (inbox.data?.pageSize || 20)));
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-4 py-6 pb-28 text-foreground sm:px-8 sm:py-9 sm:pb-28">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to
            dashboard
          </Link>
          <header className="mb-7 mt-5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Beta testing portal
              </p>
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                Interview feedback
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Review each tester’s interviews and product feedback in one
                place.
              </p>
            </div>
            {user && isAdmin && (
              <Button
                variant="outline"
                disabled={inbox.isFetching}
                onClick={() => void inbox.refetch()}
                className="gap-2 rounded-xl"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`h-4 w-4 ${inbox.isFetching ? "animate-spin" : ""}`}
                />
                {inbox.isFetching ? "Refreshing…" : "Refresh"}
              </Button>
            )}
          </header>
          <BetaPortalNav />
          {loading || isLoading ? (
            <p role="status">Checking founder access…</p>
          ) : !user ? (
            <div className="rounded-2xl border bg-card p-8">
              <h2 className="text-xl font-semibold">
                Your private feedback hub
              </h2>
              <p className="mb-5 mt-2 text-sm text-muted-foreground">
                Sign in with the founder account that created your tester
                invitations.
              </p>
              <Button asChild>
                <Link to="/auth?mode=medicine&returnTo=/admin/guest-feedback">
                  Sign into your founder account
                </Link>
              </Button>
            </div>
          ) : !isAdmin ? (
            <p>Founder access is required to view tester feedback.</p>
          ) : (
            <>
              {inbox.data && (
                <div className={selectedId ? "hidden lg:block" : ""}>
                  <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      {
                        label: "AI assessments",
                        value: inbox.data.summary.assessments,
                        note: `${inbox.data.summary.testers} testers joined`,
                        icon: ClipboardCheck,
                      },
                      {
                        label: "Product reviews",
                        value: inbox.data.summary.reviews,
                        note: "One review per tester’s trial",
                        icon: MessageSquareText,
                      },
                      {
                        label: "Reported issues",
                        value: inbox.data.summary.issues,
                        note: "Testers reporting a problem",
                        icon: TriangleAlert,
                      },
                      {
                        label: "Usefulness rating",
                        value:
                          inbox.data.summary.averageRating == null
                            ? "—"
                            : `${inbox.data.summary.averageRating}/5`,
                        note: "From submitted product reviews",
                        icon: Star,
                      },
                    ].map((stat) => (
                      <article
                        key={stat.label}
                        className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5"
                      >
                        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <stat.icon
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                          />
                          {stat.label}
                        </p>
                        <p className="my-2 text-3xl font-semibold tabular-nums">
                          {stat.value}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {stat.note}
                        </p>
                      </article>
                    ))}
                  </div>
                  <p className="mb-6 text-xs text-muted-foreground">
                    {inviteId
                      ? "Totals for this invitation."
                      : "Totals across your invitations."}{" "}
                    Updates every 30 seconds while this page is open.
                  </p>
                </div>
              )}
              <section
                aria-label="Filter feedback"
                className={`mb-6 rounded-2xl border bg-card p-4 ${selectedId ? "hidden lg:block" : ""}`}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
                  <label className="block text-xs font-medium">
                    Find a tester or invitation
                    <div className="relative mt-2">
                      <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                      />
                      <Input
                        type="search"
                        placeholder="Search by name or invitation…"
                        maxLength={100}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="min-h-11 rounded-xl pl-9"
                      />
                    </div>
                  </label>
                  <label className="block text-xs font-medium">
                    Product feedback
                    <select
                      value={review}
                      onChange={(e) => filter("review", e.target.value)}
                      className={`${selectClass} mt-2`}
                    >
                      <option value="all">All testers</option>
                      <option value="issues">Reported an issue</option>
                      <option value="reviewed">Review received</option>
                      <option value="waiting">Awaiting review</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium">
                    Interview type
                    <select
                      value={interviewType}
                      onChange={(e) => filter("type", e.target.value)}
                      className={`${selectClass} mt-2`}
                    >
                      <option value="">All Medicine interviews</option>
                      {GUEST_INTERVIEW_IDS.map((id) => (
                        <option key={id} value={id}>
                          {title(id)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {filtered && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {inviteId && <span>Showing one invitation</span>}
                    <button
                      className="min-h-9 font-semibold text-primary underline underline-offset-4"
                      onClick={() => {
                        setSearch("");
                        setParams({});
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </section>
              {inbox.isError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-destructive/30 bg-card p-4"
                >
                  <p className="text-sm">
                    {inbox.error instanceof Error
                      ? inbox.error.message
                      : "Unable to load feedback."}
                    {inbox.data ? " Showing the last successful update." : ""}
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => void inbox.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              )}
              {inbox.isPending ? (
                <div
                  role="status"
                  className="rounded-2xl border bg-card p-10 text-center text-muted-foreground"
                >
                  Loading tester feedback…
                </div>
              ) : !inbox.data ? null : !entries.length ? (
                <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
                  <Users
                    aria-hidden="true"
                    className="mx-auto mb-4 h-9 w-9 text-primary"
                  />
                  <h2 className="text-xl font-semibold">
                    {filtered || page > 1
                      ? "No testers match this view"
                      : "Your first tester’s feedback starts here"}
                  </h2>
                  <p className="mx-auto mb-5 mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {filtered || page > 1
                      ? "Adjust your filters or return to the first page."
                      : "Create a private invitation. Once a tester joins, their interviews and product review will appear here."}
                  </p>
                  {filtered || page > 1 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setParams({});
                      }}
                    >
                      Show all testers
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to="/admin/guest-trials">Create an invitation</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]">
                  <section
                    aria-label="Testers"
                    className={`min-w-0 ${selectedId ? "hidden lg:block" : ""}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-semibold">
                        Testers{" "}
                        <span className="ml-1 text-muted-foreground">
                          {total}
                        </span>
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        Latest activity first
                      </span>
                    </div>
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <button
                          key={entry.id}
                          aria-pressed={selected?.id === entry.id}
                          onClick={() => chooseTrial(entry.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected?.id === entry.id ? "border-primary bg-primary/5" : "bg-card hover:border-primary/40"}`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="min-w-0 break-words font-semibold">
                              {entry.display_name}
                            </span>
                            <ChevronRight
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 text-primary"
                            />
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {entry.invite_label}
                          </span>
                          <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span>
                              {entry.interviews.length} interview
                              {entry.interviews.length === 1 ? "" : "s"}
                            </span>
                            <span>
                              {entry.review
                                ? `${entry.review.rating}/5 usefulness`
                                : "Review pending"}
                            </span>
                          </span>
                          {entry.review &&
                            entry.review.experience !== "smooth" && (
                              <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-950">
                                <TriangleAlert
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                Issue reported
                              </span>
                            )}
                          <span className="mt-3 block text-xs text-muted-foreground">
                            {date(entry.updated_at)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => {
                          const next = new URLSearchParams(params);
                          next.set("page", String(page - 1));
                          next.delete("trial");
                          next.delete("interview");
                          setParams(next);
                        }}
                        aria-label="Previous page"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {page} of {pages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page >= pages}
                        onClick={() => {
                          const next = new URLSearchParams(params);
                          next.set("page", String(page + 1));
                          next.delete("trial");
                          next.delete("interview");
                          setParams(next);
                        }}
                        aria-label="Next page"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </section>
                  <section
                    aria-label="Selected tester feedback"
                    className={`min-w-0 ${selectedId ? "" : "hidden lg:block"}`}
                  >
                    <Button
                      className="mb-4 gap-2 lg:hidden"
                      variant="outline"
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.delete("trial");
                        next.delete("interview");
                        setParams(next);
                      }}
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      All testers
                    </Button>
                    {selected ? (
                      <>
                        <header className="mb-5">
                          <h2
                            id="tester-feedback-heading"
                            tabIndex={-1}
                            className="break-words font-display text-2xl font-semibold focus:outline-none"
                          >
                            {selected.display_name}
                          </h2>
                          <p className="mt-2 break-words text-sm text-muted-foreground">
                            {selected.invite_label} · Joined{" "}
                            {date(selected.created_at)}
                          </p>
                        </header>
                        <ProductReview entry={selected} />
                        <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="flex items-center gap-2 text-lg font-semibold">
                            <ClipboardCheck
                              aria-hidden="true"
                              className="h-5 w-5 text-primary"
                            />
                            AI interview assessments
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {selected.interviews_started} attempt
                            {selected.interviews_started === 1 ? "" : "s"}{" "}
                            started
                          </span>
                        </div>
                        {!selected.interviews.length ? (
                          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                            This tester hasn’t started an interview yet.
                          </p>
                        ) : (
                          <>
                            <div
                              className="mb-5 grid gap-2 sm:grid-cols-2"
                              aria-label="Choose interview"
                            >
                              {selected.interviews.map((item) => (
                                <button
                                  key={item.id}
                                  aria-pressed={activeInterview?.id === item.id}
                                  onClick={() => chooseInterview(item.id)}
                                  className={`min-w-0 rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${activeInterview?.id === item.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}
                                >
                                  <span className="block text-sm font-semibold">
                                    {title(item.interview_type)}
                                  </span>
                                  <span className="mt-2 block text-xs text-muted-foreground">
                                    {date(item.created_at)}
                                  </span>
                                  <span className="mt-3 block text-sm font-semibold">
                                    {item.feedback_id
                                      ? item.total_score == null
                                        ? "Assessment saved · not scored"
                                        : `${item.total_score}/${getInterviewTypeConfig(item.interview_type as InterviewType).maxTotalScore} · Practice score`
                                      : "No saved assessment"}
                                  </span>
                                </button>
                              ))}
                            </div>
                            {activeInterview && (
                              <InterviewAssessment
                                key={`${selected.id}:${activeInterview.id}:${activeInterview.feedback_id}`}
                                ownerId={user.id}
                                entry={selected}
                                interview={activeInterview}
                              />
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                        This tester is no longer in the current view. Choose
                        another tester or clear the filters.
                      </p>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </MedicineTheme>
  );
}

export function ProductReview({ entry }: { entry: TrialInboxEntry }) {
  const review = entry.review;
  const text = review ? censorTranscript(review.improvement) : "";
  const excerpt = shortExcerpt(text, 45);
  return (
    <article
      aria-label="Tester product feedback"
      className="rounded-2xl border bg-card p-5 sm:p-6"
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <MessageSquareText
          aria-hidden="true"
          className="h-5 w-5 text-primary"
        />
        Tester’s product feedback
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        About their whole trial · written by the tester
      </p>
      {review ? (
        <>
          <div className="my-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Star aria-hidden="true" className="h-4 w-4 text-primary" />
              {review.rating}/5 usefulness
            </span>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${review.experience === "smooth" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-950"}`}
            >
              {trialReviewExperience[review.experience]}
            </span>
          </div>
          <p className="break-words text-sm leading-relaxed">{excerpt}</p>
          {text !== excerpt && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Read their full comment
              </summary>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {text}
              </p>
            </details>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Submitted {date(review.created_at)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          No product review yet. The tester is asked for a short review when
          they finish their trial.
        </p>
      )}
    </article>
  );
}

function InterviewAssessment({
  ownerId,
  entry,
  interview,
}: {
  ownerId: string;
  entry: TrialInboxEntry;
  interview: TrialInterviewSummary;
}) {
  const result = useQuery({
    queryKey: [
      "beta-interview-assessment",
      ownerId,
      entry.invite_id,
      interview.feedback_id,
    ],
    queryFn: () =>
      trialApi<{ feedback: SummaryFeedback }>({
        action: "feedback",
        inviteId: entry.invite_id,
        feedbackId: interview.feedback_id,
      }),
    enabled: !!interview.feedback_id,
    retry: 1,
    gcTime: 0,
  });
  if (!interview.feedback_id)
    return (
      <div className="rounded-2xl border border-dashed bg-card p-6">
        <h4 className="font-semibold">No saved AI assessment</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This attempt may still be running, may have ended without enough
          transcript, or may need the tester to retry feedback generation. No
          score has been assigned.
        </p>
      </div>
    );
  if (result.isPending)
    return (
      <p
        role="status"
        className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading this interview’s assessment…
      </p>
    );
  if (result.isError)
    return (
      <div role="alert" className="rounded-2xl border bg-card p-6">
        <p className="mb-3 text-sm">
          Unable to open this assessment. Please try again.
        </p>
        <Button variant="outline" onClick={() => void result.refetch()}>
          Retry assessment
        </Button>
      </div>
    );
  return (
    <FeedbackSummary
      feedback={result.data.feedback}
      interviewType={interview.interview_type}
      audience="admin"
    />
  );
}
