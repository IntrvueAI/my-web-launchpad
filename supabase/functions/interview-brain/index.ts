// Interview Brain — the LLM-driven orchestrator the client calls each time the student finishes
// speaking. The model (Clara) drives the whole conversation; the server owns the question bank
// (answers never reach the client) and the evidence log via tool calls. Vendored engine is built
// from src/interview by `npm run brain:build`.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { advanceAgent, initAgentState, type AgentState, type ChatComplete } from "./_shared/engine/agent.ts";
import { mathsPack } from "./_shared/subjects/maths/pack.ts";
import { logicPack } from "./_shared/subjects/logic/pack.ts";
import type { BrainRequest, BrainResponse, Mode } from "./_shared/engine/types.ts";
import mathsBank from "./_shared/maths-bank.json" with { type: "json" };
import logicBank from "./_shared/logic-bank.json" with { type: "json" };

const PACKS: Record<string, any> = { maths: mathsPack, logic: logicPack };
const BANKS: Record<string, any> = { maths: mathsBank, logic: logicBank };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUBJECT_BY_TYPE: Record<string, string> = { "maths-interview": "maths", "logic-puzzles": "logic" };

function safeParseArgs(s: string): Record<string, any> {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

/** OpenAI chat-completions with tool calling. gpt-4o is used (confirmed available on this key). */
const chat: ChatComplete = async ({ messages, tools }) => {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
    // max_tokens caps the spoken reply so Clara physically can't ramble into paragraphs.
    body: JSON.stringify({ model: "gpt-4.1", messages, tools, tool_choice: "auto", temperature: 0.7, max_tokens: 140 }),
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

const uiStateOf = (s: AgentState): BrainResponse["uiState"] => ({
  mode: s.mode,
  topic: s.currentTopic,
  difficulty: s.difficulty,
  questionIndex: s.questionIndex,
  targetQuestions: s.targetQuestions,
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!openAIApiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    const body = (await req.json()) as BrainRequest;
    const { sessionId, action } = body;
    if (!sessionId || !action) return json({ error: "sessionId and action are required" }, 400);

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: session, error: sErr } = await admin
      .from("interview_sessions")
      .select("id, user_id, interview_type, engine_state")
      .eq("session_reference", sessionId)
      .maybeSingle();
    if (sErr || !session) return json({ error: "Session not found" }, 404);
    if (session.user_id !== userId) return json({ error: "Forbidden" }, 403);

    const subject = SUBJECT_BY_TYPE[session.interview_type as string];
    const pack = subject ? PACKS[subject] : undefined;
    if (!pack) return json({ error: "This interview type is not engine-driven" }, 400);

    const deps = { bank: BANKS[subject], pack, chat };

    let state: AgentState;
    if (action === "start" || !session.engine_state) {
      state = initAgentState({ subject, mode: (body.mode as Mode) ?? "mock", topic: body.topic, pack });
    } else {
      state = session.engine_state as AgentState;
    }

    const result = await advanceAgent(state, body as any, deps);

    await admin
      .from("interview_sessions")
      .update({
        engine_state: result.state,
        evidence: result.state.evidence,
        mode: result.state.mode,
        subject: result.state.subject,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    const response: BrainResponse = { say: result.say, done: result.done, uiState: uiStateOf(result.state) };
    return json(response);
  } catch (err) {
    console.error("interview-brain error:", (err as Error)?.message || err);
    return json({ error: "Internal server error" }, 500);
  }
});
