import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  REVIEW_BATCH,
  QUESTION_SOURCES,
  SOURCED_QUESTIONS,
  RELATED_LIVE_QUESTIONS,
} from "@/data/interview-staging/medicine-sourced-review";
import {
  approvedReviewExport,
  currentReviewStatus,
  reviewFingerprint,
  REVIEW_LABELS,
  type ReviewStatus,
} from "@/lib/questionReview";
import { QuestionReviewService } from "@/services/QuestionReviewService";

export default function AdminMedicineReview() {
  const { user } = useAuth();
  const admin = useAdminStatus();
  if (user && admin.isLoading)
    return (
      <main className="p-8" role="status">
        Checking access…
      </main>
    );
  if (!user || !admin.isAdmin)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Question review</h1>
        <p>Sign in with an administrator account to review this batch.</p>
        {admin.error && (
          <p role="alert">Access could not be checked. Please retry.</p>
        )}
        <Link className="underline" to="/">
          Back to home
        </Link>
      </main>
    );
  return (
    <MedicineTheme>
      <ReviewDesk key={user.id} userId={user.id} />
    </MedicineTheme>
  );
}

export function ReviewDesk({ userId }: { userId: string }) {
  const cache = useQueryClient();
  const queryKey = ["question-reviews", userId, REVIEW_BATCH.id];
  const reviews = useQuery({
    queryKey,
    queryFn: () => QuestionReviewService.list(REVIEW_BATCH.id),
  });
  const fingerprints = useQuery({
    queryKey: ["question-review-fingerprints", REVIEW_BATCH.id],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          SOURCED_QUESTIONS.map(async (q) => [
            q.id,
            await reviewFingerprint(
              q,
              QUESTION_SOURCES.find((s) => s.id === q.sourceId)!,
            ),
          ]),
        ),
      ),
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">(
    "pending",
  );
  const [topic, setTopic] = useState("all");
  const [selectedId, setSelectedId] = useState(SOURCED_QUESTIONS[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const hashes = fingerprints.data ?? {};
  const decisions = reviews.data ?? [];
  const byId = new Map(decisions.map((r) => [r.question_id, r]));
  const ready = reviews.isSuccess && fingerprints.isSuccess;
  const counts = SOURCED_QUESTIONS.reduce(
    (all, q) => {
      all[currentReviewStatus(byId.get(q.id), hashes[q.id])]++;
      return all;
    },
    { pending: 0, approved: 0, changes_requested: 0, rejected: 0 },
  );
  const filtered = useMemo(
    () =>
      SOURCED_QUESTIONS.filter((q) => {
        const source = QUESTION_SOURCES.find((s) => s.id === q.sourceId)!;
        return (
          (statusFilter === "all" ||
            currentReviewStatus(
              decisions.find((r) => r.question_id === q.id),
              hashes[q.id],
            ) === statusFilter) &&
          (topic === "all" || q.topic === topic) &&
          `${q.id} ${q.title} ${q.topic} ${q.question} ${source.publisher} ${q.format}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        );
      }),
    [query, statusFilter, topic, decisions, hashes],
  );
  const question = filtered.find((q) => q.id === selectedId) ?? filtered[0];
  const source = QUESTION_SOURCES.find((s) => s.id === question?.sourceId);
  const review = question ? byId.get(question.id) : undefined;
  const status = currentReviewStatus(review, question && hashes[question.id]);
  const notes = question ? (drafts[question.id] ?? review?.notes ?? "") : "";
  const versionChanged =
    !!review && review.content_hash !== hashes[question?.id ?? ""];
  const dirtyIds = Object.keys(drafts).filter(
    (id) => drafts[id] !== (byId.get(id)?.notes ?? ""),
  );
  const historyKey = ["question-review-history", userId, question?.id];
  const history = useQuery({
    queryKey: historyKey,
    queryFn: () => QuestionReviewService.history(REVIEW_BATCH.id, question!.id),
    enabled: showHistory && !!question,
  });
  useEffect(() => {
    if (!dirtyIds.length) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirtyIds.length]);
  function select(id: string) {
    setSelectedId(id);
    setSaveError("");
    setNotice("");
    setConflict(false);
    setShowHistory(false);
  }
  async function save(next: ReviewStatus) {
    if (!question || !ready || saving || conflict) return;
    if (
      (next === "changes_requested" || next === "rejected") &&
      !notes.trim()
    ) {
      setSaveError("Add a short reason in the review notes first.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setNotice("");
    const id = question.id;
    try {
      const saved = await QuestionReviewService.save(
        REVIEW_BATCH.id,
        id,
        hashes[id],
        next,
        notes,
        review?.revision ?? 0,
      );
      cache.setQueryData(queryKey, (old: typeof decisions | undefined) => [
        ...(old ?? []).filter((r) => r.question_id !== id),
        saved,
      ]);
      setDrafts((old) => {
        const rest = { ...old };
        delete rest[id];
        return rest;
      });
      setNotice(
        `${question.title}: ${REVIEW_LABELS[next].toLowerCase()}. Saved to your account.`,
      );
      void cache.invalidateQueries({ queryKey: historyKey });
    } catch (error) {
      const changed = (error as { code?: string }).code === "PT409";
      setConflict(changed);
      setSaveError(
        changed
          ? "Another review was saved first. Reload the latest decision, compare it with your notes, then save again."
          : "Your decision could not be saved. Your notes are still here; please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function reload() {
    const result = await reviews.refetch();
    if (!result.error) {
      setConflict(false);
      setSaveError("");
      setNotice("Latest saved decisions loaded. Unsaved notes have been kept.");
    }
  }
  function exportApproved() {
    const content = approvedReviewExport(
      REVIEW_BATCH.id,
      SOURCED_QUESTIONS,
      QUESTION_SOURCES,
      decisions,
      hashes,
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${REVIEW_BATCH.id}-approved.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const index = question ? filtered.findIndex((q) => q.id === question.id) : -1;
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-7 sm:px-6">
      <Link
        to="/admin/medicine-portal"
        onClick={(event) => {
          if (
            dirtyIds.length &&
            !window.confirm(
              "Leave this page? Unsaved review notes will be lost.",
            )
          )
            event.preventDefault();
        }}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-primary"
      >
        <ArrowLeft size={16} /> Medicine portal
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <Badge variant="secondary">Review batch · 2 October 2026</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions worth asking.
          </h1>
          <p className="mt-3 text-muted-foreground">
            {REVIEW_BATCH.description}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Approving saves your decision. These questions stay out of live
            interviews until a separate content release.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!ready || saving || !counts.approved}
            onClick={exportApproved}
          >
            <Download size={16} className="mr-2" /> Export approved
          </Button>
          <Button
            variant="outline"
            aria-label="Reload saved decisions"
            disabled={saving || reviews.isFetching}
            onClick={reload}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </header>
      <section
        aria-label="Batch progress"
        className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {(
          [
            "pending",
            "approved",
            "changes_requested",
            "rejected",
          ] as ReviewStatus[]
        ).map((s) => (
          <button
            key={s}
            disabled={!ready || saving}
            aria-pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-2xl border p-4 text-left transition-colors ${statusFilter === s ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"}`}
          >
            <strong className="block text-3xl tabular-nums">
              {ready ? counts[s] : "—"}
            </strong>
            <span className="text-sm text-muted-foreground">
              {REVIEW_LABELS[s]}
            </span>
          </button>
        ))}
      </section>
      {(reviews.isError || fingerprints.isError) && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-destructive/40 p-4"
        >
          <p>
            Saved decisions could not be loaded. Review actions are unavailable
            until they can be checked.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              void reviews.refetch();
              void fingerprints.refetch();
            }}
          >
            Try loading again
          </Button>
        </div>
      )}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            size={16}
            className="absolute left-3 top-3.5 text-muted-foreground"
          />
          <Input
            aria-label="Search sourced questions"
            className="h-11 pl-9"
            placeholder="Search a question, source or topic"
            value={query}
            disabled={saving}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto">
          Topic
          <select
            aria-label="Filter by topic"
            className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3"
            disabled={saving}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="all">All topics</option>
            {[...new Set(SOURCED_QUESTIONS.map((q) => q.topic))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto">
          Status
          <select
            aria-label="Filter by review status"
            className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3"
            value={statusFilter}
            disabled={saving}
            onChange={(e) =>
              setStatusFilter(e.target.value as ReviewStatus | "all")
            }
          >
            <option value="all">All decisions</option>
            {Object.entries(REVIEW_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mb-3 min-h-5 text-sm text-primary"
      >
        {saving ? "Saving your decision…" : notice}
      </p>
      {ready && !filtered.length && (
        <section className="rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">No questions in this view</h2>
          <p className="mt-2 text-muted-foreground">
            Try another topic or review status.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setQuery("");
              setTopic("all");
              setStatusFilter("all");
            }}
          >
            Show the whole batch
          </Button>
        </section>
      )}
      {question && source && (
        <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside
            aria-label="Questions in this view"
            className="hidden max-h-[75vh] space-y-2 overflow-y-auto lg:block"
          >
            {filtered.map((q) => (
              <button
                key={q.id}
                disabled={saving}
                onClick={() => select(q.id)}
                aria-current={q.id === question.id ? "true" : undefined}
                className={`w-full rounded-xl border p-3 text-left ${q.id === question.id ? "border-primary bg-primary/5" : "bg-card"}`}
              >
                <span className="text-xs text-muted-foreground">{q.topic}</span>
                <span className="mt-1 block text-sm font-medium">
                  {q.title}
                </span>
                {dirtyIds.includes(q.id) && (
                  <span className="text-xs text-amber-700">Unsaved notes</span>
                )}
              </button>
            ))}
          </aside>
          <article className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Question {index + 1} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous question"
                  variant="outline"
                  disabled={index < 1 || saving}
                  onClick={() => select(filtered[index - 1].id)}
                >
                  <ArrowLeft size={16} />
                </Button>
                <Button
                  aria-label="Next question"
                  variant="outline"
                  disabled={index >= filtered.length - 1 || saving}
                  onClick={() => select(filtered[index + 1].id)}
                >
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
            <section className="rounded-2xl border bg-card p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{question.topic}</Badge>
                <Badge variant="outline">
                  {question.format === "Academic"
                    ? "Academic · separate from MMI"
                    : question.format}
                </Badge>
                <Badge variant="outline">{REVIEW_LABELS[status]}</Badge>
              </div>
              <h2 className="text-2xl font-semibold">{question.title}</h2>
              <p className="mt-4 text-lg leading-relaxed">
                {question.question}
              </p>
              <div className="mt-5 grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Suggested follow-up
                  </h3>
                  <p className="mt-2 text-sm">{question.followUp}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Review focus
                  </h3>
                  <p className="mt-2 text-sm">{question.reviewFocus}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Question paraphrased from the public example. Follow-up and
                review focus are editorial suggestions, not an official mark
                scheme.
              </p>
              {!!RELATED_LIVE_QUESTIONS[question.id]?.length && (
                <div className="mt-4 rounded-xl border border-amber-500/30 p-3 text-sm">
                  <h3 className="font-semibold">
                    Related questions already exist
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Consider this as a replacement or refinement to avoid
                    repeating the same task.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {RELATED_LIVE_QUESTIONS[question.id].map((item) => (
                      <li key={item.id}>
                        {item.title}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({item.id})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            <section className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Source and realism check</h3>
                <Badge variant="outline">
                  {source.access === "full"
                    ? "Full source checked"
                    : "Indexed text checked"}
                </Badge>
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 break-words text-sm font-medium text-primary underline"
              >
                {source.publisher}
                <ExternalLink size={14} className="shrink-0" />
              </a>
              <p className="mt-1 text-sm">
                {source.title} · {question.locator}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {source.note}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Checked {REVIEW_BATCH.checkedAt} · {question.id}
              </p>
              {!!question.releaseChecks.length && (
                <div className="mt-4 border-t pt-3">
                  <h4 className="text-sm font-semibold">
                    Before this can go live
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {question.releaseChecks.map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Your decision</h3>
              {versionChanged && (
                <p role="status" className="mt-2 text-sm text-amber-700">
                  The question or source has changed since the saved review.
                  Please review this version again.
                </p>
              )}
              <label htmlFor="review-notes" className="mt-4 block text-sm">
                Review notes{" "}
                <span className="text-muted-foreground">
                  · required for changes or rejection
                </span>
              </label>
              {review?.notes && dirtyIds.includes(question.id) && (
                <details className="mt-2 text-sm text-muted-foreground">
                  <summary className="cursor-pointer">
                    Compare with saved notes
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words">
                    {review.notes}
                  </p>
                </details>
              )}
              <Textarea
                id="review-notes"
                className="mt-2 min-h-28"
                maxLength={4000}
                value={notes}
                disabled={saving}
                onChange={(e) =>
                  setDrafts((old) => ({
                    ...old,
                    [question.id]: e.target.value,
                  }))
                }
              />
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {dirtyIds.includes(question.id)
                    ? "Notes not yet saved"
                    : review
                      ? `Saved ${new Date(review.updated_at).toLocaleString("en-GB")}`
                      : "No decision saved yet"}
                </span>
                <span>{notes.length}/4000</span>
              </div>
              {saveError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {saveError}
                </p>
              )}
              {conflict && (
                <Button variant="outline" className="mt-3" onClick={reload}>
                  Reload latest decision
                </Button>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  disabled={!ready || saving || conflict}
                  onClick={() => save("approved")}
                >
                  <Check size={16} className="mr-2" /> Approve question
                </Button>
                <Button
                  variant="outline"
                  disabled={!ready || saving || conflict}
                  onClick={() => save("changes_requested")}
                >
                  Request changes
                </Button>
                <Button
                  variant="outline"
                  disabled={!ready || saving || conflict}
                  onClick={() => save("rejected")}
                >
                  Reject
                </Button>
                <Button
                  variant="ghost"
                  disabled={!ready || saving || conflict}
                  onClick={() => save(status)}
                >
                  Save notes
                </Button>
                {status !== "pending" && (
                  <Button
                    variant="ghost"
                    disabled={!ready || saving || conflict}
                    onClick={() => save("pending")}
                  >
                    Reopen review
                  </Button>
                )}
              </div>
              <Button
                variant="link"
                className="mt-3 h-11 px-0"
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory
                  ? "Hide decision history"
                  : "View decision history"}
              </Button>
              {showHistory && (
                <div className="mt-2 space-y-3 border-t pt-3">
                  {history.isLoading && <p role="status">Loading history…</p>}
                  {history.isError && (
                    <p role="alert">History could not be loaded.</p>
                  )}
                  {history.isSuccess && !history.data.length && (
                    <p className="text-sm text-muted-foreground">
                      No saved decisions yet.
                    </p>
                  )}
                  {history.data?.map((event) => (
                    <div key={event.id} className="text-sm">
                      <p className="font-medium">
                        {REVIEW_LABELS[event.status]} · revision{" "}
                        {event.revision}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString("en-GB")}
                      </p>
                      {event.notes && (
                        <p className="mt-1 whitespace-pre-wrap break-words">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </article>
        </div>
      )}
      <footer className="mt-8 pb-12 text-xs text-muted-foreground">
        {dirtyIds.length
          ? `${dirtyIds.length} question(s) have unsaved notes. `
          : ""}
        Decisions sync to your administrator account. The older expansion lab’s
        browser-only notes remain separate.
      </footer>
    </main>
  );
}
