import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Save, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
import {
  BRAIN_BEHAVIOURS, BRAIN_VERSIONS, CURRENT_BRAIN_VERSION, LAB_TEXT_LIMITS, brainVersion,
  type BrainBehaviour, type LabPlatform,
} from "@/interview/engine/brainVersions";
import { LAB_INTERVIEWS, draftOverrides, labApi, type LabDraftRow } from "@/lib/interviewLab";

const selectClass = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";
type Form = { id?: string; name: string; base_version: string; behaviour: BrainBehaviour; opening_line: string; closing_line: string; extra_instructions: string };
const blank = (): Form => ({
  name: "", base_version: CURRENT_BRAIN_VERSION, behaviour: { ...brainVersion(CURRENT_BRAIN_VERSION)!.behaviour },
  opening_line: "", closing_line: "", extra_instructions: "",
});
const toForm = (d: LabDraftRow): Form => ({
  id: d.id, name: d.name, base_version: d.base_version,
  behaviour: { ...(brainVersion(d.base_version) ?? brainVersion(CURRENT_BRAIN_VERSION))!.behaviour, ...d.behaviour } as BrainBehaviour,
  opening_line: d.opening_line ?? "", closing_line: d.closing_line ?? "", extra_instructions: d.extra_instructions ?? "",
});

/** Founder-written variants of Clara, tested privately before anything changes for users. */
export function LabDrafts({ platform }: { platform: LabPlatform }) {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<LabDraftRow[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [type, setType] = useState<string>(LAB_INTERVIEWS[platform][0]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => labApi.drafts(platform).then(setDrafts).catch((e) => setStatus(`Drafts could not be loaded (${e instanceof Error ? e.message : "unknown error"}). Please retry.`));
  useEffect(() => {
    void load();
    setForm(blank());
    setType(LAB_INTERVIEWS[platform][0]);
  }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps
  const behaviours = BRAIN_BEHAVIOURS.filter((b) => b.platform === platform);
  const base = brainVersion(form.base_version)!;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm((f) => ({ ...f, [key]: value })); setStatus(""); };

  async function save(andTest: boolean) {
    if (!form.name.trim()) { setStatus("Give the draft a name."); return; }
    setBusy(true);
    try {
      const saved = await labApi.saveDraft({
        id: form.id, name: form.name, platform, base_version: form.base_version,
        behaviour: draftOverrides(base.behaviour, form.behaviour),
        opening_line: form.opening_line, closing_line: form.closing_line, extra_instructions: form.extra_instructions,
      });
      setForm(toForm(saved));
      await load();
      setStatus("Draft saved.");
      if (andTest)
        navigate(`/admin/lab/run?type=${encodeURIComponent(type)}&version=${saved.base_version}&draft=${saved.id}&draftName=${encodeURIComponent(saved.name)}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "The draft could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (!form.id) return;
    setBusy(true);
    try {
      await labApi.archiveDraft(form.id);
      setForm(blank());
      await load();
      setStatus("Draft archived. Its test notes are kept.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "The draft could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside aria-label="Drafts" className="space-y-2">
        <Button variant="outline" className="w-full gap-2" onClick={() => { setForm(blank()); setStatus(""); }}>
          <Plus className="h-4 w-4" aria-hidden /> New draft
        </Button>
        {!drafts.length && <p className="text-sm text-muted-foreground">No drafts yet. A draft is your own version of Clara to try out.</p>}
        {drafts.map((d) => (
          <button key={d.id} type="button" onClick={() => setForm(toForm(d))} aria-pressed={form.id === d.id}
            className={`w-full rounded-xl border p-3 text-left text-sm hover:bg-muted/50 ${form.id === d.id ? "border-primary bg-primary/5" : ""}`}>
            <span className="block font-medium">{d.name}</span>
            <span className="text-xs text-muted-foreground">Based on {d.base_version} · edited {new Date(d.updated_at).toLocaleDateString("en-GB")}</span>
          </button>
        ))}
      </aside>
      <form className="space-y-5 rounded-2xl border bg-card p-5" onSubmit={(e) => { e.preventDefault(); void save(false); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Draft name
            <Input className="mt-1" value={form.name} maxLength={LAB_TEXT_LIMITS.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Warmer opening" />
          </label>
          <label className="text-sm font-medium">
            Start from version
            <select className={`${selectClass} mt-1`} value={form.base_version}
              onChange={(e) => setForm((f) => ({ ...f, base_version: e.target.value, behaviour: { ...brainVersion(e.target.value)!.behaviour } }))}>
              {[...BRAIN_VERSIONS].reverse().map((v) => <option key={v.id} value={v.id}>{v.date} · {v.label}</option>)}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Behaviour</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {behaviours.map((b) => (
              <label key={b.key} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.behaviour[b.key]}
                  onChange={(e) => set("behaviour", { ...form.behaviour, [b.key]: e.target.checked })} />
                <span>
                  <span className="font-medium">{b.label}</span>
                  {form.behaviour[b.key] !== base.behaviour[b.key] && <span className="ml-1 text-xs text-primary">(changed)</span>}
                  <span className="block text-xs text-muted-foreground">{b.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-medium">
          Opening line <span className="font-normal text-muted-foreground">(optional; replaces Clara's first words. Use {"{name}"} for the candidate's name)</span>
          <Textarea className="mt-1" rows={3} value={form.opening_line} maxLength={LAB_TEXT_LIMITS.opening_line} onChange={(e) => set("opening_line", e.target.value)}
            placeholder={platform === "11plus" ? "Hi {name}! I'm Clara. Today we'll chat about you and try a few puzzles. Ready?" : "Hi {name}, I'm Clara. Today we'll work through one station together. Let me know when you're ready."} />
        </label>
        <label className="block text-sm font-medium">
          Closing line <span className="font-normal text-muted-foreground">(optional; replaces the closing)</span>
          <Textarea className="mt-1" rows={2} value={form.closing_line} maxLength={LAB_TEXT_LIMITS.closing_line} onChange={(e) => set("closing_line", e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Extra instructions for Clara <span className="font-normal text-muted-foreground">(optional; added to her instructions for this draft only)</span>
          <Textarea className="mt-1" rows={4} value={form.extra_instructions} maxLength={LAB_TEXT_LIMITS.extra_instructions} onChange={(e) => set("extra_instructions", e.target.value)}
            placeholder="e.g. Use shorter sentences, and always ask why before moving on." />
        </label>
        <div className="flex flex-wrap items-end gap-3 border-t pt-4">
          <label className="min-w-[220px] flex-1 text-sm font-medium">
            Test with
            <select className={`${selectClass} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>
              {LAB_INTERVIEWS[platform].map((id) => <option key={id} value={id}>{INTERVIEW_TYPES[id]?.name ?? id}</option>)}
            </select>
          </label>
          <Button type="submit" variant="outline" className="gap-2" disabled={busy}><Save className="h-4 w-4" aria-hidden /> Save</Button>
          <Button type="button" className="gap-2" disabled={busy} onClick={() => void save(true)}><Play className="h-4 w-4" aria-hidden /> Save and test</Button>
          {form.id && <Button type="button" variant="ghost" className="gap-2" disabled={busy} onClick={() => void archive()}><Archive className="h-4 w-4" aria-hidden /> Archive</Button>}
        </div>
        {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
        <p className="text-xs text-muted-foreground">
          Drafts only affect interviews started from this lab by an administrator. Real users always get the live version.
        </p>
      </form>
    </div>
  );
}
