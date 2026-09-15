// Interview Brain — the LLM-driven orchestrator the client calls each time the student finishes
// speaking. The model (Clara) drives the whole conversation; the server owns the question bank
// (answers never reach the client) and the evidence log via tool calls. Vendored engine is built
// from src/interview by `npm run brain:build`.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { advanceAgent, initAgentState, phaseInfo, type AgentState, type ChatComplete } from "./_shared/engine/agent.ts";
import { logAppEvent } from "./_shared/appLogger.ts";
import type { SubjectPack } from "./_shared/subjects/types.ts";
import { mathsPack } from "./_shared/subjects/maths/pack.ts";
import { logicPack } from "./_shared/subjects/logic/pack.ts";
import { currentaffairsPack } from "./_shared/subjects/currentaffairs/pack.ts";
import { elevenplusPack } from "./_shared/subjects/elevenplus/pack.ts";
import { medicinePack } from "./_shared/subjects/medicine/pack.ts";
import { normalizeQuestionRow } from "./_shared/bank/normalize.ts";
import { getMedicinePilot, packForMedicinePilot, initialiseMedicinePilot, type PilotQuestion } from "./_shared/subjects/medicine/pilots.ts";
import pilotBank from "./_shared/medicine-pilot-bank.json" with { type: "json" };
import { getSchoolMode } from "./_shared/subjects/medicine/schoolModes.ts";
import { chatPack } from "./_shared/subjects/chat/pack.ts";
import type { BrainRequest, BrainResponse, Mode } from "./_shared/engine/types.ts";
import mathsBank from "./_shared/maths-bank.json" with { type: "json" };
import logicBank from "./_shared/logic-bank.json" with { type: "json" };
import currentaffairsBank from "./_shared/currentaffairs-bank.json" with { type: "json" };
import elevenplusBank from "./_shared/elevenplus-bank.json" with { type: "json" };
import medicineBank from "./_shared/medicine-bank.json" with { type: "json" };
import chatBank from "./_shared/chat-bank.json" with { type: "json" };

const PACKS: Record<string, any> = { maths: mathsPack, logic: logicPack, currentaffairs: currentaffairsPack, elevenplus: elevenplusPack, medicine: medicinePack, chat: chatPack };
const BANKS: Record<string, any> = { maths: mathsBank, logic: logicBank, currentaffairs: currentaffairsBank, elevenplus: elevenplusBank, medicine: medicineBank, chat: chatBank };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUBJECT_BY_TYPE: Record<string, string> = {
  "maths-interview": "maths",
  "logic-puzzles": "logic",
  "current-affairs-interview": "currentaffairs",
  "11-plus": "elevenplus",
  "11-plus-v2": "elevenplus",
  "medicine-mmi": "medicine",
  "medicine-mmi-manchester": "medicine",
  "chat-with-clara": "chat",
};

function safeParseArgs(s: string): Record<string, any> {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

/** First name only (e.g. "Dillon Smith" -> "Dillon") — a full name read aloud mid-sentence sounds
 *  stilted, and this is looked up server-side from the account's own profile, never client input. */
function firstNameFrom(fullName: string | null | undefined): string | undefined {
  const first = (fullName || "").trim().split(/\s+/)[0];
  return first || undefined;
}

/** OpenAI chat-completions with tool calling. gpt-4.1 is used (confirmed available on this key). */
const chat: ChatComplete = async ({ messages, tools }) => {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
    // max_tokens caps the spoken reply so Clara physically can't ramble into paragraphs.
    body: JSON.stringify({ model: "gpt-4.1", messages, tools, tool_choice: "auto", temperature: 0.7, max_tokens: 400 }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${detail.slice(0, 300)}`);
  }
  const data = await resp.json();
  const msg = data.choices?.[0]?.message ?? {};
  const raw = msg.tool_calls ?? [];
  const toolCalls = raw.map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    args: safeParseArgs(tc.function?.arguments),
  }));
  return { content: msg.content ?? "", toolCalls, raw };
};

// The 11+ main interview is a whole-child interview but should feel intellectually rigorous, so it
// draws from the academic banks (maths/logic/current-affairs) as well as its own — the harder
// academic questions naturally make up the majority, with the 11+ personal/ethics questions mixed in.
const BANK_SUBJECTS: Record<string, string[]> = {
  elevenplus: ["elevenplus", "maths", "logic", "currentaffairs"],
};

/** Load the question bank for a subject from the DB (source of truth); fall back to the bundled
 *  JSON if the table isn't seeded yet, so interviews work before and after the migration. */
async function loadBank(admin: any, subject: string): Promise<any[]> {
  const subjects = BANK_SUBJECTS[subject] ?? [subject];
  try {
    const { data, error } = await admin
      .from("questions").select("*").in("subject", subjects);
    if (error && error.code !== '42P01') throw error;
    if (!error && data && data.length) return data.filter((row: any) => row.active).map((row: any) =>
      normalizeQuestionRow(row, (BANKS[row.subject] || []).find((q: any) => q.id === row.id)));
  } catch (e) {
    throw new Error("Question bank unavailable; refusing to bypass database retirement controls.");
  }
  return subjects.flatMap((s) => BANKS[s] || []);
}

const uiStateOf = (s: AgentState, pack: SubjectPack, interviewType: string): BrainResponse["uiState"] => {
  const { phase, aboutYouCount } = phaseInfo(pack, s);
  return {
    mode: s.mode,
    topic: s.currentTopic,
    difficulty: s.difficulty,
    questionIndex: s.questionIndex,
    targetQuestions: s.targetQuestions,
    onQuestion: !!s.current,
    phase: pack.mixedBank ? phase : undefined,
    aboutYouCount,
    timingSeconds: getSchoolMode(interviewType)?.timingSeconds ?? (getMedicinePilot(interviewType) ? {
      prep: getMedicinePilot(interviewType)!.circuit.prepSeconds,
      response: getMedicinePilot(interviewType)!.circuit.responseSeconds,
    } : undefined),
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const requestId = req.headers.get("x-request-id");
  let userId: string | null = null;
  let sessionDbId: string | null = null;

  try {
    if (!openAIApiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    const body = (await req.json()) as BrainRequest;
    const { sessionId, action } = body;
    if (!sessionId || !['start','answer','skip','switch_topic','repeat','end','time_up'].includes(action)) return json({ error: 'Valid sessionId and action are required' }, 400);
    if (body.studentText !== undefined && (typeof body.studentText !== 'string' || body.studentText.length > 12000)) return json({ error: 'Answer exceeds the turn limit' }, 400);
    if (body.mode !== undefined && !['mock','practice'].includes(body.mode)) return json({ error: 'Invalid practice mode' }, 400);
    if (body.expectedQuestionIndex !== undefined && (!Number.isInteger(body.expectedQuestionIndex) || body.expectedQuestionIndex < 0)) return json({ error: 'Invalid station index' }, 400);
    if (body.turnId !== undefined && (typeof body.turnId !== 'string' || body.turnId.length > 80)) return json({error:'Invalid turn identifier'},400);

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    userId = userData.user.id;

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: session, error: sErr } = await admin
      .from("interview_sessions")
      .select("id, user_id, interview_type, engine_state, engine_revision, status")
      .eq("session_reference", sessionId)
      .maybeSingle();
    if (sErr || !session) return json({ error: "Session not found" }, 404);
    if (session.user_id !== userId) return json({ error: "Forbidden" }, 403);
    sessionDbId = session.id;
    if (session.status !== "active") return json({ error: "This session has ended" }, 409);

    const interviewTypeId = session.interview_type as string;
    const pilot = getMedicinePilot(interviewTypeId);
    if (pilot) {
      const { data: isAdmin, error: adminError } = await authClient.rpc('is_current_user_admin');
      if (adminError || isAdmin !== true) return json({ error: 'Medicine draft pilots require administrator access' }, 403);
      if (body.mode === 'practice' || action === 'switch_topic') return json({ error: 'This pilot follows a complete planned circuit' }, 400);
    }
    const subject = pilot ? 'medicine' : SUBJECT_BY_TYPE[interviewTypeId];
    const basePack = subject ? PACKS[subject] : undefined;
    if (!basePack) return json({ error: "This interview type is not engine-driven" }, 400);
    // Two Medicine interview TYPES share one subject/pack/bank but differ in station count and
    // timing — see subjects/medicine/schoolModes.ts for why (verified per-school MMI data).
    const schoolMode = getSchoolMode(interviewTypeId);
    const pack = pilot ? packForMedicinePilot(pilot) : schoolMode ? { ...basePack, mockTargetQuestions: schoolMode.mockTargetQuestions } : basePack;

    const deps = { bank: pilot ? pilotBank as PilotQuestion[] : await loadBank(admin, subject), pack, chat };
    if (body.turnId && session.engine_state?.lastTurn?.id === body.turnId) {
      const existing = session.engine_state as AgentState;
      return json({say:existing.lastTurn!.say,done:existing.done,uiState:uiStateOf(existing,pack,interviewTypeId)});
    }
    // Repeated starts must not erase an existing transcript or select a different circuit.
    if (action === 'start' && session.engine_state) {
      const existing = session.engine_state as AgentState;
      return json({ say: '', done: existing.done, uiState: uiStateOf(existing, pack, interviewTypeId) });
    }

    let state: AgentState;
    if (!session.engine_state) {
      if (action !== "start") return json({ error: "Start the interview first" }, 409);
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const studentName = firstNameFrom(profile?.full_name);
      if (pilot) {
        const { data: history, error: historyError } = await admin.from('interview_sessions').select('engine_state')
          .eq('user_id', userId).like('interview_type', 'medicine-%-pilot').neq('id', session.id)
          .order('created_at', { ascending: false }).limit(30);
        if (historyError) return json({ error: 'Practice history unavailable; please retry' }, 503);
        const seenIds = (history || []).flatMap((row: any) => row.engine_state?.askedIds || []);
        const planned = initialiseMedicinePilot(pilot, deps.bank as PilotQuestion[], { seed: Math.floor(Math.random() * 2 ** 31), seenIds, studentName });
        if (!planned.ok) return json({ error: `No fresh complete circuit: ${planned.shortages.join(', ')}. The draft pool needs more reviewed coverage.` }, 409);
        state = planned.state;
      } else state = initAgentState({ subject, mode: (body.mode as Mode) ?? "mock", topic: body.topic, pack, studentName });
    } else {
      state = session.engine_state as AgentState;
    }

    const result = await advanceAgent(state, body as any, deps);
    if (body.turnId) result.state.lastTurn = {id:body.turnId,say:result.say};

    const { data: saved, error: saveError } = await admin
      .from("interview_sessions")
      .update({
        engine_revision: session.engine_revision + 1,
        engine_state: result.state,
        evidence: result.state.evidence,
        mode: result.state.mode,
        subject: result.state.subject,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", session.id).eq('status', 'active').eq('engine_revision', session.engine_revision).select('id').maybeSingle();
    if (saveError) throw saveError;
    if (!saved) return json({ error: 'Another turn changed this session. Please retry.' }, 409);

    const response: BrainResponse = { say: result.say, done: result.done, uiState: uiStateOf(result.state, pack, interviewTypeId) };
    return json(response);
  } catch (err) {
    console.error("interview-brain error:", (err as Error)?.message || err);
    logAppEvent("edge:interview-brain", {
      level: "error",
      eventType: "unhandled_exception",
      message: (err as Error)?.message || String(err),
      userId,
      interviewSessionId: sessionDbId,
      requestId,
      metadata: { stack: (err as Error)?.stack },
    }).catch(() => {});
    return json({ error: "Internal server error" }, 500);
  }
});
