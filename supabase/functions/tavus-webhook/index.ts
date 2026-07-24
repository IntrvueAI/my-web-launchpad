import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/**
 * Receives everything Tavus sends us for a "maths-v2" conversation:
 *  - track_question_attempt tool-call results (delivery.api on the tool itself — its URL carries
 *    ?conversation_id={tavus_conversation_id} since the payload body has no identifying field of
 *    its own), written into the shared `question_attempts` table so they show up in the same
 *    dashboard/history as every other interview type.
 *  - conversation-level lifecycle events (system.shutdown etc, sent to the conversation's own
 *    callback_url set at creation time) — these self-report conversation_id in the body.
 * Every payload is also archived into tavus_webhook_debug regardless of whether it was
 * recognised, as an audit trail / fallback for diagnosing anything new Tavus starts sending.
 * No auth — Tavus calls this directly with no Supabase JWT, so verify_jwt = false.
 */
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Static id -> {topic, difficulty} lookup for the 26-question maths bank. Clara's tool call only
// reliably sends question_id/question_text/child_final_answer/was_correct/hints_given (the
// required fields) — topic/difficulty are looked up here rather than trusted from the model.
const QUESTION_META: Record<string, { topic: string; difficulty: number }> = {
  "MA-A2": { topic: "numerical-reasoning", difficulty: 2 },
  "MA-A6": { topic: "numerical-reasoning", difficulty: 2 },
  "MA-A1": { topic: "numerical-reasoning", difficulty: 3 },
  "MA-A3": { topic: "numerical-reasoning", difficulty: 3 },
  "MA-A4": { topic: "numerical-reasoning", difficulty: 3 },
  "MA-A5": { topic: "numerical-reasoning", difficulty: 3 },
  "MA-A7": { topic: "numerical-reasoning", difficulty: 3 },
  "MA-C6": { topic: "structured-problem-solving", difficulty: 2 },
  "MA-C7": { topic: "structured-problem-solving", difficulty: 2 },
  "MA-C1": { topic: "structured-problem-solving", difficulty: 3 },
  "MA-C2": { topic: "structured-problem-solving", difficulty: 3 },
  "MA-C3": { topic: "structured-problem-solving", difficulty: 3 },
  "MA-C4": { topic: "structured-problem-solving", difficulty: 3 },
  "MA-C5": { topic: "structured-problem-solving", difficulty: 4 },
  "MA-C8": { topic: "structured-problem-solving", difficulty: 5 },
  "MA-B1": { topic: "estimation", difficulty: 3 },
  "MA-B2": { topic: "estimation", difficulty: 3 },
  "MA-B3": { topic: "estimation", difficulty: 3 },
  "MA-B4": { topic: "estimation", difficulty: 3 },
  "MA-B5": { topic: "estimation", difficulty: 3 },
  "MA-D1": { topic: "pattern-proof-explanation", difficulty: 2 },
  "MA-D6": { topic: "pattern-proof-explanation", difficulty: 2 },
  "MA-D3": { topic: "pattern-proof-explanation", difficulty: 3 },
  "MA-D4": { topic: "pattern-proof-explanation", difficulty: 3 },
  "MA-D2": { topic: "pattern-proof-explanation", difficulty: 4 },
  "MA-D5": { topic: "pattern-proof-explanation", difficulty: 4 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isToolAttemptPayload(p: unknown): p is {
  question_id: string;
  question_text: string;
  child_final_answer: string;
  was_correct: boolean;
  hints_given: number;
} {
  const o = p as Record<string, unknown>;
  return !!o && typeof o.question_id === "string" && typeof o.was_correct === "boolean";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const conversationIdFromQuery = url.searchParams.get("conversation_id");

    const raw = await req.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { _unparsed_body: raw };
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    if (supabaseUrl && supabaseServiceKey) {
      const admin = createClient(supabaseUrl, supabaseServiceKey);

      // Always archive the raw payload first — never let downstream logic block this.
      admin.from("tavus_webhook_debug").insert({ payload, headers }).then(({ error }) => {
        if (error) console.error("Failed to archive webhook payload:", error.message);
      });

      const conversationId =
        conversationIdFromQuery || (payload as Record<string, unknown>)?.conversation_id as string | undefined;

      if (conversationId && isToolAttemptPayload(payload)) {
        const { data: convo, error: convoErr } = await admin
          .from("tavus_conversations")
          .select("user_id, session_reference")
          .eq("conversation_id", conversationId)
          .maybeSingle();

        if (convoErr || !convo) {
          console.error("No tavus_conversations match for", conversationId, convoErr?.message);
        } else {
          const meta = QUESTION_META[payload.question_id];
          const hasAnswer = (payload.child_final_answer || "").trim().length > 0;
          const outcome = payload.was_correct ? "correct_method" : hasAnswer ? "incorrect" : "skipped";

          const { error: insertErr } = await admin.from("question_attempts").insert({
            user_id: convo.user_id,
            session_reference: convo.session_reference,
            interview_type: "maths-v2",
            subject: "maths",
            topic: meta?.topic ?? null,
            difficulty: meta ? String(meta.difficulty) : null,
            question_id: payload.question_id,
            question: payload.question_text,
            outcome,
            skipped: outcome === "skipped",
            hints_used: payload.hints_given ?? 0,
            student_answer: payload.child_final_answer,
          });
          if (insertErr) console.error("Failed to insert question_attempts row:", insertErr.message);
        }
      }

      const eventType = (payload as Record<string, unknown>)?.event_type as string | undefined;
      if (conversationId && eventType === "system.shutdown") {
        const endedAt = new Date().toISOString();
        const { data: convo } = await admin
          .from("tavus_conversations")
          .update({ status: "completed", ended_at: endedAt })
          .eq("conversation_id", conversationId)
          .select("session_reference")
          .maybeSingle();
        if (convo?.session_reference) {
          await admin
            .from("interview_sessions")
            .update({ status: "completed", ended_at: endedAt })
            .eq("session_reference", convo.session_reference)
            .eq("status", "active");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tavus-webhook error:", (err as Error)?.message || err);
    // Still 200 — we never want Tavus retry-storming us over a failure on our side.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
