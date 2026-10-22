import { supabase } from "@/integrations/supabase/client";
import { MEDICINE_LIVE_INTERVIEW_IDS } from "@/config/interviewTypes";
import type { BrainBehaviour, LabDraft, LabPlatform, LabSettings } from "@/interview/engine/brainVersions";

/** Interviews each platform can test in the lab (the casual chat demo is not an interview). */
export const LAB_INTERVIEWS: Record<LabPlatform, readonly string[]> = {
  medicine: MEDICINE_LIVE_INTERVIEW_IDS,
  "11plus": ["11-plus", "maths-interview", "logic-puzzles", "current-affairs-interview"],
};
export const LAB_PLATFORM_LABEL: Record<LabPlatform, string> = { medicine: "Medicine (MMI Practice)", "11plus": "11+ (intrvue.ai)" };
export const labPlatformOf = (interviewType: string): LabPlatform => (interviewType.startsWith("medicine-") ? "medicine" : "11plus");

export interface LabDraftRow extends LabDraft {
  owner_id: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
export interface LabTurn {
  role: "user" | "assistant";
  content: string;
}
export interface LabSession {
  id: string;
  session_reference: string;
  interview_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  lab: LabSettings | null;
  transcript: LabTurn[] | null;
  preview: string[] | null;
}
export interface LabFeedback {
  id: string;
  session_reference: string;
  total_score: number | null;
  overview: string | null;
  created_at: string;
}
export interface LabNote {
  id: string;
  owner_id: string;
  session_reference: string;
  interview_type: string;
  version: string;
  draft_id: string | null;
  rating: number | null;
  notes: string;
  updated_at: string;
}

// The lab tables are newer than the generated database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const labApi = {
  drafts: (platform: LabPlatform) =>
    rows<LabDraftRow>(
      db.from("interview_lab_drafts").select("*").eq("platform", platform).eq("archived", false).order("updated_at", { ascending: false }),
    ),
  async saveDraft(draft: Omit<LabDraft, "id"> & { id?: string }): Promise<LabDraftRow> {
    const payload = {
      name: draft.name.trim(),
      platform: draft.platform,
      base_version: draft.base_version,
      behaviour: draft.behaviour,
      opening_line: draft.opening_line?.trim() || null,
      closing_line: draft.closing_line?.trim() || null,
      extra_instructions: draft.extra_instructions?.trim() || null,
    };
    const query = draft.id
      ? db.from("interview_lab_drafts").update(payload).eq("id", draft.id).select("*").single()
      : db.from("interview_lab_drafts").insert(payload).select("*").single();
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as LabDraftRow;
  },
  async archiveDraft(id: string) {
    const { error } = await db.from("interview_lab_drafts").update({ archived: true }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  /** The signed-in administrator's own lab test sessions, newest first. */
  sessions: (userId: string) =>
    rows<LabSession>(
      db
        .from("interview_sessions")
        .select("id, session_reference, interview_type, status, started_at, ended_at, lab:engine_state->lab, transcript:engine_state->transcript, preview:engine_state->preview")
        .eq("user_id", userId)
        .not("engine_state->lab", "is", null)
        .order("started_at", { ascending: false })
        .limit(200),
    ),
  feedback: (references: string[]) =>
    references.length
      ? rows<LabFeedback>(
          db
            .from("feedback")
            .select("id, session_reference, total_score, created_at, overview:detailed_feedback->>overall")
            .in("session_reference", references)
            .order("created_at", { ascending: false }),
        )
      : Promise.resolve([] as LabFeedback[]),
  notes: () => rows<LabNote>(db.from("interview_lab_notes").select("*").order("updated_at", { ascending: false }).limit(500)),
  async saveNote(note: { owner_id: string; session_reference: string; interview_type: string; version: string; draft_id?: string | null; rating: number | null; notes: string }) {
    const { data, error } = await db
      .from("interview_lab_notes")
      .upsert({ ...note, draft_id: note.draft_id ?? null, notes: note.notes.slice(0, 5000) }, { onConflict: "owner_id,session_reference" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as LabNote;
  },
};

/** Switch values a draft changes compared with its base version. */
export function draftOverrides(base: BrainBehaviour, chosen: BrainBehaviour): Partial<BrainBehaviour> {
  return Object.fromEntries(Object.entries(chosen).filter(([k, v]) => base[k as keyof BrainBehaviour] !== v)) as Partial<BrainBehaviour>;
}

/** Group test sessions by the version or draft they ran, newest first. */
export function labRunLabel(lab: LabSettings | null): string {
  if (!lab) return "Unknown version";
  return lab.draftName ? `Draft: ${lab.draftName} (on ${lab.version})` : `Version ${lab.version}`;
}

/** Plain transcript for copying or download. */
export function transcriptText(turns: LabTurn[] | null): string {
  return (turns ?? [])
    .filter((t) => !/^\[.*\]$/.test(t.content.trim()))
    .map((t) => `${t.role === "assistant" ? "Clara" : "Candidate"}: ${t.content}`)
    .join("\n\n");
}
