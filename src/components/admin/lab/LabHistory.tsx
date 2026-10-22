import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
import { brainVersion, type LabPlatform } from "@/interview/engine/brainVersions";
import { labRunLabel, transcriptText, type LabFeedback, type LabNote, type LabSession } from "@/lib/interviewLab";
import { LabNoteEditor } from "./LabNoteEditor";

const selectClass = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";
export const runKey = (s: LabSession) => (s.lab?.draftId ? `d:${s.lab.draftId}` : `v:${s.lab?.version ?? "?"}`);
const average = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);

/** Every lab test interview with its transcript, score and notes; flick through and compare runs. */
export function LabHistory({
  platform, sessions, notes, feedback, userId, initialRun, onNoteSaved,
}: {
  platform: LabPlatform;
  sessions: LabSession[];
  notes: LabNote[];
  feedback: LabFeedback[];
  userId: string;
  initialRun?: string;
  onNoteSaved: (note: LabNote) => void;
}) {
  const mine = useMemo(() => sessions.filter((s) => s.interview_type.startsWith("medicine-") === (platform === "medicine")), [sessions, platform]);
  const runs = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of mine) map.set(runKey(s), labRunLabel(s.lab));
    return [...map.entries()];
  }, [mine]);
  const [run, setRun] = useState(initialRun ?? "");
  const [type, setType] = useState("");
  useEffect(() => { if (initialRun !== undefined) setRun(initialRun); }, [initialRun]);
  const shown = mine.filter((s) => (!run || runKey(s) === run) && (!type || s.interview_type === type));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const index = Math.max(0, shown.findIndex((s) => s.id === selectedId));
  const selected = shown[index];
  const noteFor = (ref: string) => notes.find((n) => n.session_reference === ref && n.owner_id === userId) ?? notes.find((n) => n.session_reference === ref) ?? null;
  const feedbackFor = (ref: string) => feedback.find((f) => f.session_reference === ref) ?? null;
  const go = (i: number) => shown.length && setSelectedId(shown[(i + shown.length) % shown.length].id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Compare two runs side by side.
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const summary = (key: string) => {
    const tests = mine.filter((s) => runKey(s) === key);
    const ratings = tests.map((s) => noteFor(s.session_reference)?.rating).filter((r): r is number => typeof r === "number");
    const scores = tests.map((s) => feedbackFor(s.session_reference)?.total_score).filter((r): r is number => typeof r === "number");
    return { tests, rating: average(ratings), score: average(scores) };
  };

  if (!mine.length)
    return (
      <p className="rounded-2xl border bg-card p-6 text-muted-foreground">
        No lab tests on this platform yet. Start one from Versions or Drafts; each test appears here with its transcript, score and your notes.
      </p>
    );
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Version or draft
          <select className={`${selectClass} mt-1`} value={run} onChange={(e) => { setRun(e.target.value); setSelectedId(null); }}>
            <option value="">All versions and drafts</option>
            {runs.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Interview
          <select className={`${selectClass} mt-1`} value={type} onChange={(e) => { setType(e.target.value); setSelectedId(null); }}>
            <option value="">All interviews</option>
            {[...new Set(mine.map((s) => s.interview_type))].map((id) => <option key={id} value={id}>{INTERVIEW_TYPES[id]?.name ?? id}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ul aria-label="Lab tests" className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {shown.map((s) => {
            const note = noteFor(s.session_reference);
            const fb = feedbackFor(s.session_reference);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setSelectedId(s.id)} aria-current={selected?.id === s.id ? "true" : undefined}
                  className={`w-full rounded-xl border p-3 text-left text-sm hover:bg-muted/50 ${selected?.id === s.id ? "border-primary bg-primary/5" : ""}`}>
                  <span className="block font-medium">{INTERVIEW_TYPES[s.interview_type]?.name ?? s.interview_type}</span>
                  <span className="block text-xs text-muted-foreground">{labRunLabel(s.lab)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {typeof fb?.total_score === "number" && <span>· {fb.total_score}/20</span>}
                    {note?.rating && <span className="inline-flex items-center gap-0.5">· {note.rating}<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-label="out of 5" /></span>}
                    {note?.notes && <span>· notes</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {selected && (
          <article className="min-w-0 space-y-4 rounded-2xl border bg-card p-5" aria-label="Selected test">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{INTERVIEW_TYPES[selected.interview_type]?.name ?? selected.interview_type}</h3>
                <p className="text-sm text-muted-foreground">
                  {labRunLabel(selected.lab)}
                  {selected.lab?.version && brainVersion(selected.lab.version) ? ` · ${brainVersion(selected.lab.version)!.label}` : ""}
                  {selected.preview?.length ? ` · previews: ${selected.preview.join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" aria-label="Previous test" onClick={() => go(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground">{index + 1} of {shown.length}</span>
                <Button size="icon" variant="outline" aria-label="Next test" onClick={() => go(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </header>
            {(() => {
              const fb = feedbackFor(selected.session_reference);
              return fb ? (
                <p className="rounded-xl bg-muted/50 p-3 text-sm">
                  <strong>{typeof fb.total_score === "number" ? `${fb.total_score}/20` : "Partial assessment"}</strong>
                  {fb.overview ? ` · ${fb.overview}` : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No saved feedback for this test ({selected.status}).</p>
              );
            })()}
            <section aria-label="Transcript" className="max-h-[50vh] space-y-2 overflow-y-auto rounded-xl border p-3">
              {(selected.transcript ?? []).filter((t) => !/^\[.*\]$/.test(t.content.trim())).map((t, i) => (
                <div key={i} className={`flex max-w-[85%] flex-col ${t.role === "user" ? "ml-auto items-end" : "items-start"}`}>
                  <span className="px-1 text-[11px] text-muted-foreground">{t.role === "user" ? "Candidate" : "Clara"}</span>
                  <p className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${t.role === "user" ? "rounded-br-md bg-primary/15" : "rounded-bl-md bg-muted"}`}>{t.content}</p>
                </div>
              ))}
              {!selected.transcript?.length && <p className="text-sm text-muted-foreground">This test has no conversation yet.</p>}
            </section>
            <Button size="sm" variant="ghost" className="gap-2" onClick={() => void navigator.clipboard?.writeText(transcriptText(selected.transcript))}>
              <Copy className="h-4 w-4" aria-hidden /> Copy transcript
            </Button>
            <div className="border-t pt-4">
              <h4 className="mb-2 font-medium">Your notes</h4>
              <LabNoteEditor ownerId={userId} sessionReference={selected.session_reference} interviewType={selected.interview_type}
                version={selected.lab?.version ?? "unknown"} draftId={selected.lab?.draftId ?? null}
                existing={noteFor(selected.session_reference)} onSaved={onNoteSaved} />
            </div>
          </article>
        )}
        {!selected && <p className="text-muted-foreground">Select a test to read it.</p>}
      </div>
      <section className="rounded-2xl border bg-card p-5" aria-label="Compare">
        <h3 className="font-semibold">Compare two versions</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[[compareA, setCompareA], [compareB, setCompareB]].map(([value, setter], i) => (
            <select key={i} aria-label={`Run ${i + 1}`} className={selectClass} value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)}>
              <option value="">Choose a version or draft</option>
              {runs.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          ))}
        </div>
        {compareA && compareB && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[compareA, compareB].map((key) => {
              const s = summary(key);
              return (
                <div key={key} className="rounded-xl border p-4 text-sm">
                  <p className="font-medium">{runs.find(([k]) => k === key)?.[1]}</p>
                  <p className="mt-1 text-muted-foreground">
                    {s.tests.length} test{s.tests.length === 1 ? "" : "s"} · your rating {s.rating ?? "–"}/5 · score {s.score ?? "–"}/20
                  </p>
                  <ul className="mt-3 space-y-2">
                    {s.tests.map((t) => noteFor(t.session_reference)).filter((n): n is LabNote => !!n?.notes).map((n) => (
                      <li key={n.id} className="rounded-lg bg-muted/50 p-2">{n.notes}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
