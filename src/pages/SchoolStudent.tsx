import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SchoolLayout,
  SchoolLoading,
  SchoolError,
  PracticeStats,
  SchoolConfirm,
} from "@/components/schools/SchoolLayout";
import { FeedbackSummary } from "@/components/feedback/FeedbackSummary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  schoolApi,
  schoolKeys,
  schoolDate,
  schoolDateTime,
  type ClassDetail,
  type SchoolStudentDetail,
  type SchoolFeedback,
} from "@/lib/schools";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";

export default function SchoolStudentPage() {
  const { classId = "", studentId = "" } = useParams();
  const { user } = useAuth();
  const uid = user?.id || "";
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [dirtyNote, setDirtyNote] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  function changeInterview(next: Record<string, string>) {
    if (dirtyNote)
      setPendingPath(
        `${window.location.pathname}?${new URLSearchParams(next)}`,
      );
    else setParams(next);
  }
  useEffect(() => {
    if (!dirtyNote) return;
    const guard = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        new URL(link.href).origin !== window.location.origin
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingPath(new URL(link.href).pathname + new URL(link.href).search);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirtyNote]);
  const page = Math.max(1, Math.min(99999, Number(params.get("page")) || 1));
  const selected = params.get("interview") || "";
  const query = useQuery({
    queryKey: [...schoolKeys.class(uid, classId), "student", studentId, page],
    queryFn: () =>
      schoolApi<SchoolStudentDetail>("student", {
        class_id: classId,
        student_id: studentId,
        page,
      }),
    enabled: !!user,
    retry: 1,
    gcTime: 0,
    refetchInterval: 30000,
  });
  const classroom = useQuery({
    queryKey: schoolKeys.class(uid, classId),
    queryFn: () => schoolApi<ClassDetail>("class", { class_id: classId }),
    enabled: !!user,
    retry: 1,
    gcTime: 0,
    refetchInterval: 30000,
  });
  const feedback = useQuery({
    queryKey: [
      ...schoolKeys.class(uid, classId),
      "feedback",
      studentId,
      selected,
    ],
    queryFn: () =>
      schoolApi<SchoolFeedback>("feedback", {
        class_id: classId,
        student_id: studentId,
        session_id: selected,
      }),
    enabled: !!user && !!selected && !query.isError,
    retry: 1,
    gcTime: 0,
    refetchInterval: 30000,
  });
  const data = query.data;
  const c = classroom.data?.class;
  return (
    <SchoolLayout hasUnsavedChanges={dirtyNote}>
      {query.isError || classroom.isError ? (
        <SchoolError
          error={query.error || classroom.error}
          retry={() => {
            void query.refetch();
            void classroom.refetch();
          }}
        />
      ) : !data || !c ? (
        <SchoolLoading label="Loading pupil practice…" />
      ) : (
        <>
          <Link
            to={`/schools/${classId}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
          >
            <ArrowLeft size={16} />
            {c.name}
          </Link>
          <header>
            <p className="text-sm text-primary">
              Pupil practice · {c.year_group || "11+"}
            </p>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold">
              {data.student.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sharing new 11+ practice since{" "}
              {schoolDate(data.student.approved_at)}. Weekly target:{" "}
              {c.weekly_target} interviews.
              {c.archived_at ? " This class is archived and read-only." : ""}
            </p>
          </header>
          <PracticeStats stats={data.stats} />
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 className="font-display text-xl font-semibold">
              Interview history
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open an interview to see its AI assessment and leave a next step
              for this pupil.
            </p>
            {!data.interviews.length ? (
              <p className="mt-5 rounded-xl bg-muted p-5">
                {page > 1
                  ? "No interviews on this page. Go back to the previous page."
                  : "No shared interviews yet. Practice completed after class approval will appear here."}
              </p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {data.interviews.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() =>
                      changeInterview({ page: String(page), interview: i.id })
                    }
                    aria-pressed={selected === i.id}
                    className={`min-w-0 rounded-xl border p-4 text-left transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected === i.id ? "border-primary bg-primary/5" : ""}`}
                  >
                    <span className="flex flex-wrap justify-between gap-2 font-semibold">
                      <span>
                        {INTERVIEW_TYPES[i.interview_type]?.name ||
                          "11+ practice"}
                      </span>
                      {i.reviewed_at && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <CheckCircle2 size={14} />
                          Reviewed
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {schoolDateTime(i.started_at)} ·{" "}
                      {i.status === "completed"
                        ? `${i.minutes} min`
                        : i.status === "active"
                          ? "In progress"
                          : "Ended early"}
                    </span>
                    <span className="mt-3 block text-sm">
                      {i.status !== "completed"
                        ? "No completed assessment"
                        : !i.feedback_id
                          ? "Feedback not available yet"
                          : i.score !== null
                            ? `Full 11+ score: ${i.score}/20`
                            : "Open assessment"}
                      {i.status === "completed" &&
                      i.feedback_id &&
                      !i.reviewed_at
                        ? " · Awaiting teacher review"
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {data.total > 20 && (
              <nav
                className="mt-5 flex flex-wrap items-center justify-between gap-3"
                aria-label="Interview pages"
              >
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => changeInterview({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(data.total / 20)}
                </span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= data.total}
                  onClick={() => changeInterview({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </nav>
            )}
          </section>
          {selected &&
            (feedback.isError ? (
              <SchoolError
                error={feedback.error}
                retry={() => feedback.refetch()}
              />
            ) : !feedback.data ? (
              <SchoolLoading label="Loading this interview’s feedback…" />
            ) : !feedback.data.feedback ? (
              <p role="status" className="rounded-2xl border bg-card p-6">
                There is no completed assessment for this interview yet.
                Feedback appears here once the pupil finishes and it has been
                processed.
              </p>
            ) : (
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <FeedbackSummary
                  key={selected}
                  feedback={feedback.data.feedback}
                  interviewType={feedback.data.feedback.interview_type}
                  audience="admin"
                />
                <TeacherReview
                  key={`${classId}:${studentId}:${selected}`}
                  initial={feedback.data}
                  archived={!!c.archived_at}
                  onDirtyChange={setDirtyNote}
                  onSave={async (note, version) => {
                    const result = await schoolApi<{
                      note: string;
                      version: number;
                      reviewed_at: string;
                    }>("review", {
                      class_id: classId,
                      student_id: studentId,
                      session_id: selected,
                      note,
                      expected_version: version,
                    });
                    await cache.invalidateQueries({
                      queryKey: schoolKeys.root(uid),
                    });
                    return result;
                  }}
                  onReload={async () => {
                    const r = await feedback.refetch();
                    if (r.error || !r.data)
                      throw r.error || new Error("Could not reload feedback.");
                    return r.data;
                  }}
                />
              </div>
            ))}
        </>
      )}
      <SchoolConfirm
        open={!!pendingPath}
        onClose={() => setPendingPath(null)}
        title="Leave your unsaved feedback?"
        description="Your draft has not been saved. Stay here to save it, or confirm to leave without saving."
        onConfirm={() => {
          const path = pendingPath;
          setPendingPath(null);
          setDirtyNote(false);
          if (path) navigate(path);
        }}
      />
    </SchoolLayout>
  );
}

export function TeacherReview({
  initial,
  archived,
  onSave,
  onReload,
  onDirtyChange,
}: {
  initial: SchoolFeedback;
  archived: boolean;
  onSave: (
    note: string,
    version: number,
  ) => Promise<{ note: string; version: number; reviewed_at: string }>;
  onReload: () => Promise<SchoolFeedback>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [saved, setSaved] = useState(initial.note || "");
  const [note, setNote] = useState(initial.note || "");
  const [version, setVersion] = useState(initial.note_version || 0);
  const [reviewed, setReviewed] = useState(!!initial.reviewed_at);
  const [notice, setNotice] = useState("");
  const [confirmReload, setConfirmReload] = useState(false);
  const dirty = note !== saved;
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) {
      setNote(initial.note || "");
      setSaved(initial.note || "");
      setVersion(initial.note_version || 0);
      setReviewed(!!initial.reviewed_at);
    }
  }, [initial.note, initial.note_version, initial.reviewed_at, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = useMutation({
    mutationFn: () => onSave(note, version),
    onSuccess: (r) => {
      setSaved(r.note);
      setNote(r.note);
      setVersion(r.version);
      setReviewed(true);
      setNotice(
        r.note
          ? "Teacher feedback saved and shared with the pupil."
          : "Interview marked as reviewed.",
      );
    },
  });
  const reload = useMutation({
    mutationFn: onReload,
    onSuccess: (r) => {
      setSaved(r.note || "");
      setNote(r.note || "");
      setVersion(r.note_version || 0);
      setReviewed(!!r.reviewed_at);
      save.reset();
      setNotice("Latest teacher feedback loaded.");
    },
  });
  return (
    <aside className="rounded-2xl border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={20} className="text-primary" />
        <h2 className="font-display text-xl font-semibold">Teacher feedback</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Your own comments, separate from the AI assessment. The pupil can read
        these in My classes.
      </p>
      <label htmlFor="teacher-note" className="block text-sm font-medium">
        A clear next step
      </label>
      <Textarea
        id="teacher-note"
        maxLength={2000}
        rows={7}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setNotice("");
        }}
        placeholder="For your next interview, try…"
        disabled={archived || save.isPending || reload.isPending}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {dirty
            ? "Unsaved changes"
            : reviewed
              ? "Reviewed"
              : "Not yet reviewed"}
        </span>
        <span>{note.length}/2000</span>
      </div>
      {(save.error || reload.error) && (
        <SchoolError error={save.error || reload.error} />
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      {!archived && (
        <Button
          className="min-h-11 w-full"
          disabled={save.isPending || reload.isPending || (!dirty && reviewed)}
          onClick={() => save.mutate()}
        >
          {save.isPending
            ? "Saving…"
            : note.trim()
              ? "Save teacher feedback"
              : "Mark as reviewed"}
        </Button>
      )}
      <Button
        variant="ghost"
        className="min-h-11 w-full"
        disabled={reload.isPending || save.isPending}
        onClick={() => (dirty ? setConfirmReload(true) : reload.mutate())}
      >
        Reload saved feedback
      </Button>
      {archived && (
        <p className="text-sm text-muted-foreground">This class is archived.</p>
      )}
      <SchoolConfirm
        open={confirmReload}
        onClose={() => setConfirmReload(false)}
        title="Replace your unsaved comments?"
        description="Reloading will replace your draft with the last saved teacher feedback."
        onConfirm={() => {
          setConfirmReload(false);
          reload.mutate();
        }}
      />
    </aside>
  );
}
