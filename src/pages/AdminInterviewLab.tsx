import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FlaskConical, GitBranch, History, Megaphone, PencilRuler } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { LabVersions } from "@/components/admin/lab/LabVersions";
import { LabDrafts } from "@/components/admin/lab/LabDrafts";
import { LabHistory } from "@/components/admin/lab/LabHistory";
import { LabSandbox } from "@/components/admin/lab/LabSandbox";
import type { LabPlatform } from "@/interview/engine/brainVersions";
import { LAB_PLATFORM_LABEL, labApi, type LabFeedback, type LabNote, type LabSession } from "@/lib/interviewLab";

const TABS = [
  { id: "versions", label: "Versions", icon: GitBranch, note: "Every dated version of Clara" },
  { id: "drafts", label: "Drafts", icon: PencilRuler, note: "Try your own changes" },
  { id: "history", label: "Test history", icon: History, note: "Transcripts, scores and notes" },
  { id: "sandbox", label: "Sandbox", icon: Megaphone, note: "Clara reads your script" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** One place to replay, change and compare Clara on both platforms, plus a script sandbox. */
export default function AdminInterviewLab() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdminStatus();
  const [params, setParams] = useSearchParams();
  const platform: LabPlatform = params.get("platform") === "11plus" ? "11plus" : "medicine";
  const tab: Tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "versions") as Tab;
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [notes, setNotes] = useState<LabNote[]>([]);
  const [feedback, setFeedback] = useState<LabFeedback[]>([]);
  const [loadError, setLoadError] = useState("");
  const [historyRun, setHistoryRun] = useState<string | undefined>(undefined);
  const update = (next: Record<string, string>) => setParams((cur) => {
    const p = new URLSearchParams(cur);
    for (const [k, v] of Object.entries(next)) p.set(k, v);
    return p;
  }, { replace: true });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, n] = await Promise.all([labApi.sessions(user.id), labApi.notes()]);
      setSessions(s);
      setNotes(n);
      setFeedback(await labApi.feedback(s.map((x) => x.session_reference)));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Lab history could not be loaded");
    }
  }, [user]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!isAdmin || !user) return <div className="flex min-h-screen items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to admin
        </Link>
        <header className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <FlaskConical className="h-4 w-4" aria-hidden /> Interview Lab
            </p>
            <h1 className="font-display text-3xl font-semibold">Test Clara before users hear it</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Replay any dated version, try your own changes, compare tests with notes, or have Clara read a script.
              Lab interviews are admin-only and use no credits; real users always get the live version.
            </p>
          </div>
          <div role="group" aria-label="Platform" className="flex rounded-xl border bg-card p-1">
            {(["medicine", "11plus"] as const).map((p) => (
              <button key={p} type="button" aria-pressed={platform === p} onClick={() => { update({ platform: p }); setHistoryRun(undefined); }}
                className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${platform === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {LAB_PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>
        </header>
        <nav aria-label="Lab sections" className="mb-6 grid gap-2 sm:grid-cols-4">
          {TABS.map(({ id, label, icon: Icon, note }) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => update({ tab: id })}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left ${tab === id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{note}</span>
              </span>
            </button>
          ))}
        </nav>
        {loadError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-3 text-sm">
            {loadError}
            <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
          </div>
        )}
        {tab === "versions" && (
          <LabVersions platform={platform} sessions={sessions} onShowTests={(version) => { setHistoryRun(`v:${version}`); update({ tab: "history" }); }} />
        )}
        {tab === "drafts" && <LabDrafts platform={platform} />}
        {tab === "history" && (
          <LabHistory platform={platform} sessions={sessions} notes={notes} feedback={feedback} userId={user.id} initialRun={historyRun}
            onNoteSaved={(note) => setNotes((cur) => [note, ...cur.filter((n) => n.id !== note.id)])} />
        )}
        {tab === "sandbox" && <LabSandbox />}
      </div>
    </main>
  );
}
