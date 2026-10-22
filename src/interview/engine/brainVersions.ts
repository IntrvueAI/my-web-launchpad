/**
 * Interview Lab versions: dated snapshots of Clara's behaviour that founders can replay side by side.
 *
 * Each behaviour change is a named switch. Real interviews never carry switches, so they always run
 * the latest behaviour (`behaviourOn` defaults to true). A lab session started by an administrator
 * stores the switches of the chosen version, and the engine reproduces the older behaviour exactly.
 *
 * Adding a change: give it a switch here, guard the new code with `behaviourOn`, then add a new
 * dated version with the switch on. Older versions keep it off automatically.
 */
export type LabPlatform = "medicine" | "11plus";

export type BrainBehaviourKey =
  | "medicineWelcome"
  | "medicineRepeatLastLine"
  | "medicineFixedClosing"
  | "medicineNeutralFollowUps"
  | "schoolWelcome"
  | "schoolRepeatLastLine"
  | "schoolFixedClosing"
  | "schoolNeutralFollowUps";

export type BrainBehaviour = Record<BrainBehaviourKey, boolean>;

export const BRAIN_BEHAVIOURS: { key: BrainBehaviourKey; platform: LabPlatform; label: string; detail: string }[] = [
  { key: "medicineWelcome", platform: "medicine", label: "Greeting before the first station", detail: "Clara greets the candidate by name and waits for a reply before reading the first station. Off: the first station is read straight away and the button instruction is read aloud." },
  { key: "medicineRepeatLastLine", platform: "medicine", label: "\"Say that again\" repeats the last line", detail: "Repeats Clara's (or the actor's) last line. Off: repeat requests restate the whole station brief." },
  { key: "medicineFixedClosing", platform: "medicine", label: "Fixed closing", detail: "A fixed closing explains how to see feedback, and requests after the end get a clear reply. Off: the model closes in its own words and later requests go unanswered." },
  { key: "medicineNeutralFollowUps", platform: "medicine", label: "Neutral follow-ups", detail: "Open, neutral follow-ups with no negative assumptions, and no offers the room cannot keep." },
  { key: "schoolWelcome", platform: "11plus", label: "Greeting before the first question", detail: "Clara greets the child by name, explains the interview and waits for a reply. Off: the model opens with its own greeting and warm-up question." },
  { key: "schoolRepeatLastLine", platform: "11plus", label: "\"Say that again\" repeats the last line", detail: "Repeats Clara's last line exactly. Off: the model answers repeat requests itself." },
  { key: "schoolFixedClosing", platform: "11plus", label: "Fixed closing", detail: "A fixed closing explains how to see feedback, with no automatic praise. Off: the model closes with its own praise (\"you did really well\")." },
  { key: "schoolNeutralFollowUps", platform: "11plus", label: "Neutral follow-ups", detail: "Open, age-appropriate follow-ups and no promises such as \"we can chat about that after\"." },
];

const ALL_OFF = Object.fromEntries(BRAIN_BEHAVIOURS.map((b) => [b.key, false])) as BrainBehaviour;
const withOn = (base: BrainBehaviour, keys: BrainBehaviourKey[]): BrainBehaviour =>
  ({ ...base, ...Object.fromEntries(keys.map((k) => [k, true])) }) as BrainBehaviour;

export interface BrainVersion {
  id: string;
  date: string;
  label: string;
  summary: string;
  changes: { platform: LabPlatform | "both"; text: string }[];
  behaviour: BrainBehaviour;
}

const V09 = ALL_OFF;
const V12 = withOn(V09, ["medicineWelcome", "medicineRepeatLastLine"]);
const V15 = withOn(V12, ["medicineFixedClosing", "medicineNeutralFollowUps"]);
const V20 = withOn(V15, ["schoolWelcome", "schoolRepeatLastLine", "schoolFixedClosing", "schoolNeutralFollowUps"]);

/** Oldest first. The last entry is what every real interview uses. */
export const BRAIN_VERSIONS: BrainVersion[] = [
  {
    id: "2026-10-09",
    date: "2026-10-09",
    label: "Baseline",
    summary: "Behaviour before the October reviewer changes.",
    changes: [{ platform: "both", text: "Starting point for comparisons." }],
    behaviour: V09,
  },
  {
    id: "2026-10-12",
    date: "2026-10-12",
    label: "Medicine greeting",
    summary: "Medicine greets by name before the first station.",
    changes: [
      { platform: "medicine", text: "Two-step opening with the candidate's name; the button label is no longer read aloud." },
      { platform: "medicine", text: "\"Say that again\" repeats the last line instead of the brief." },
    ],
    behaviour: V12,
  },
  {
    id: "2026-10-15",
    date: "2026-10-15",
    label: "Medicine endings and follow-ups",
    summary: "Fixed Medicine closing and neutral follow-ups.",
    changes: [
      { platform: "medicine", text: "Fixed closing; no offers of another station; clear reply after the end." },
      { platform: "medicine", text: "Open, neutral follow-ups without negative assumptions." },
      { platform: "medicine", text: "Nine questions reworded (database content: applies to every version)." },
    ],
    behaviour: V15,
  },
  {
    id: "2026-10-20",
    date: "2026-10-20",
    label: "11+ greeting, repeats and endings",
    summary: "11+ gets the same opening, repeat, closing and follow-up rules as Medicine.",
    changes: [
      { platform: "11plus", text: "Greeting by name before the first question." },
      { platform: "11plus", text: "\"Say that again\" repeats the last line." },
      { platform: "11plus", text: "Fixed closing without automatic praise." },
      { platform: "11plus", text: "Neutral, age-appropriate follow-ups; no promises the session cannot keep." },
    ],
    behaviour: V20,
  },
];

export const CURRENT_BRAIN_VERSION = BRAIN_VERSIONS[BRAIN_VERSIONS.length - 1].id;

export function brainVersion(id: string | undefined | null): BrainVersion | undefined {
  return BRAIN_VERSIONS.find((v) => v.id === id);
}

/** Real interviews have no switches and run the latest behaviour. */
export function behaviourOn(behaviour: Partial<BrainBehaviour> | undefined, key: BrainBehaviourKey): boolean {
  return behaviour?.[key] ?? true;
}

/** Founder-written test variant, stored in interview_lab_drafts and applied only to lab sessions. */
export interface LabDraft {
  id: string;
  name: string;
  platform: LabPlatform;
  base_version: string;
  behaviour: Partial<BrainBehaviour>;
  opening_line: string | null;
  closing_line: string | null;
  extra_instructions: string | null;
}

/** What a lab session records in its engine state. */
export interface LabSettings {
  version: string;
  draftId?: string;
  draftName?: string;
  openingLine?: string;
  closingLine?: string;
  extraInstructions?: string;
}

export const LAB_TEXT_LIMITS = { opening_line: 600, closing_line: 600, extra_instructions: 2000, name: 80 } as const;

/** Resolve a version plus an optional draft into session switches and lab settings. */
export function resolveLab(versionId: string, draft?: LabDraft | null): { behaviour: BrainBehaviour; lab: LabSettings } | null {
  const version = brainVersion(draft?.base_version ?? versionId);
  if (!version) return null;
  const behaviour = { ...version.behaviour };
  for (const b of BRAIN_BEHAVIOURS) {
    const value = draft?.behaviour?.[b.key];
    if (typeof value === "boolean") behaviour[b.key] = value;
  }
  const text = (value: string | null | undefined, limit: number) => {
    const t = (value ?? "").trim();
    return t ? t.slice(0, limit) : undefined;
  };
  return {
    behaviour,
    lab: {
      version: version.id,
      ...(draft ? { draftId: draft.id, draftName: draft.name.slice(0, LAB_TEXT_LIMITS.name) } : {}),
      openingLine: text(draft?.opening_line, LAB_TEXT_LIMITS.opening_line),
      closingLine: text(draft?.closing_line, LAB_TEXT_LIMITS.closing_line),
      extraInstructions: text(draft?.extra_instructions, LAB_TEXT_LIMITS.extra_instructions),
    },
  };
}

/** Fill {name} in a founder-written line; without a name, drop the placeholder cleanly. */
export function fillLabLine(line: string, name?: string): string {
  return line
    .replace(/,?\s*\{name\}/g, (match) => (name ? match.replace("{name}", name) : ""))
    .replace(/\s{2,}/g, " ")
    .trim();
}
