import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
import { BRAIN_BEHAVIOURS, BRAIN_VERSIONS, CURRENT_BRAIN_VERSION, type LabPlatform } from "@/interview/engine/brainVersions";
import { LAB_INTERVIEWS, type LabSession } from "@/lib/interviewLab";
import { PREVIEW_FEATURES } from "@/lib/previewFeatures";

const SERVER_PREVIEWS = PREVIEW_FEATURES.filter((f) => f.server);
const selectClass = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";

/** Dated versions, newest first, each with its changes and a one-click test interview. */
export function LabVersions({ platform, sessions, onShowTests }: { platform: LabPlatform; sessions: LabSession[]; onShowTests: (version: string) => void }) {
  const interviews = LAB_INTERVIEWS[platform];
  const [type, setType] = useState<string>(interviews[0]);
  const [previews, setPreviews] = useState<string[]>([]);
  const chosenType = interviews.includes(type) ? type : interviews[0];
  const behaviours = BRAIN_BEHAVIOURS.filter((b) => b.platform === platform);
  const runLink = (version: string) =>
    `/admin/lab/run?type=${encodeURIComponent(chosenType)}&version=${version}${previews.length ? `&previews=${previews.join(",")}` : ""}`;
  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2" aria-label="Test settings">
        <label className="text-sm font-medium">
          Interview to test
          <select className={`${selectClass} mt-1`} value={chosenType} onChange={(e) => setType(e.target.value)}>
            {interviews.map((id) => <option key={id} value={id}>{INTERVIEW_TYPES[id]?.name ?? id}</option>)}
          </select>
        </label>
        {platform === "medicine" && (
          <fieldset className="text-sm">
            <legend className="font-medium">Also switch on (speech previews)</legend>
            <div className="mt-1 space-y-1">
              {SERVER_PREVIEWS.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" checked={previews.includes(p.id)}
                    onChange={(e) => setPreviews((cur) => (e.target.checked ? [...cur, p.id] : cur.filter((x) => x !== p.id)))} />
                  {p.title}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>
      <ol className="relative space-y-4 border-l pl-5">
        {[...BRAIN_VERSIONS].reverse().map((v) => {
          const changes = v.changes.filter((c) => c.platform === "both" || c.platform === platform);
          const tests = sessions.filter((s) => s.lab?.version === v.id && !s.lab?.draftId && s.interview_type && (s.interview_type.startsWith("medicine-") === (platform === "medicine"))).length;
          return (
            <li key={v.id} className="relative rounded-2xl border bg-card p-5">
              <span aria-hidden className="absolute -left-[27px] top-6 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {new Date(`${v.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <h3 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold">
                    {v.label}
                    {v.id === CURRENT_BRAIN_VERSION && <Badge>Live now</Badge>}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="gap-2">
                    <Link to={runLink(v.id)}><Play className="h-4 w-4" aria-hidden /> Test this version</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => onShowTests(v.id)}>
                    <History className="h-4 w-4" aria-hidden /> {tests} test{tests === 1 ? "" : "s"}
                  </Button>
                </div>
              </div>
              {changes.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {changes.map((c) => <li key={c.text}>{c.text}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No {platform === "medicine" ? "Medicine" : "11+"} changes in this version.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Behaviour in this version">
                {behaviours.map((b) => (
                  <span key={b.key} title={b.detail}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${v.behaviour[b.key] ? "border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/60"}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
