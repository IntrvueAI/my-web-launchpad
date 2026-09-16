import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logAppEvent } from "./_shared/appLogger.ts";
import { readText, json, HttpError } from "../_shared/http.ts";
import { matchesSecret } from "../_shared/webhookAuth.ts";

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
 * Tavus has no Supabase JWT. Authenticate its callbacks with TAVUS_WEBHOOK_SECRET instead.
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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  return (
    !!o &&
    typeof o.question_id === "string" &&
    typeof o.was_correct === "boolean" &&
    typeof o.question_text === "string" &&
    o.question_text.length <= 12000 &&
    typeof o.child_final_answer === "string" &&
    o.child_final_answer.length <= 12000 &&
    typeof o.hints_given === "number" &&
    Number.isInteger(o.hints_given) &&
    o.hints_given >= 0 &&
    o.hints_given <= 100
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const secret = Deno.env.get("TAVUS_WEBHOOK_SECRET");
    if (!secret || secret.length < 32)
      return json({ error: "Webhook not configured" }, 503);
    if (
      !(await matchesSecret(
        req.headers.get("x-tavus-webhook-secret") ||
          url.searchParams.get("secret"),
        secret,
      ))
    ) {
      return json({ error: "Unauthorized" }, 401);
    }
    const conversationIdFromQuery = url.searchParams.get("conversation_id");

    const raw = await readText(req, 262_144);
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const headers: Record<string, string> = {};
    for (const name of ["content-type", "user-agent", "x-request-id"]) {
      const value = req.headers.get(name);
      if (value) headers[name] = value;
    }

    if (!supabaseUrl || !supabaseServiceKey)
      return json({ error: "Webhook not configured" }, 503);
    if (supabaseUrl && supabaseServiceKey) {
      const admin = createClient(supabaseUrl, supabaseServiceKey);

      // Always archive the raw payload first — never let downstream logic block this.
      await admin
        .from("tavus_webhook_debug")
        .insert({ payload, headers })
        .then(({ error }) => {
          if (error)
            console.error("Failed to archive webhook payload:", error.message);
        });

      const conversationId =
        conversationIdFromQuery ||
        ((payload as Record<string, unknown>)?.conversation_id as
          | string
          | undefined);

      if (conversationId && isToolAttemptPayload(payload)) {
        const { data: convo, error: convoErr } = await admin
          .from("tavus_conversations")
          .select("user_id, session_reference")
          .eq("conversation_id", conversationId)
          .maybeSingle();

        if (convoErr) throw convoErr;
        if (!convo) {
          console.error("No tavus_conversations match for", conversationId);
          logAppEvent("edge:tavus-webhook", {
            level: "warn",
            eventType: "no_conversation_match",
            message: `No tavus_conversations row for ${conversationId}`,
            metadata: { conversationId },
          }).catch(() => {});
        } else {
          const meta = QUESTION_META[payload.question_id];
          const hasAnswer =
            (payload.child_final_answer || "").trim().length > 0;
          const outcome = payload.was_correct
            ? "correct_method"
            : hasAnswer
              ? "incorrect"
              : "skipped";
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
              JSON.stringify([
                conversationId,
                payload.question_id,
                payload.question_text,
                payload.child_final_answer,
                payload.was_correct,
                payload.hints_given,
              ]),
            ),
          );
          const eventKey =
            "tavus:" +
            Array.from(new Uint8Array(digest), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join("");

          const { error: insertErr } = await admin
            .from("question_attempts")
            .insert({
              provider_event_key: eventKey,
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
          if (insertErr && insertErr.code !== "23505") {
            console.error(
              "Failed to insert question_attempts row:",
              insertErr.message,
            );
            logAppEvent("edge:tavus-webhook", {
              level: "error",
              eventType: "question_attempt_insert_failed",
              message: insertErr.message,
              userId: convo.user_id,
              metadata: { conversationId, questionId: payload.question_id },
            }).catch(() => {});
            throw insertErr;
          }
        }
      }

      const eventType = (payload as Record<string, unknown>)?.event_type as
        | string
        | undefined;
      if (conversationId && eventType === "system.shutdown") {
        const endedAt = new Date().toISOString();
        const { data: convo, error: shutdownError } = await admin
          .from("tavus_conversations")
          .update({ status: "completed", ended_at: endedAt })
          .eq("conversation_id", conversationId)
          .select("session_reference")
          .maybeSingle();
        if (shutdownError) throw shutdownError;
        if (convo?.session_reference) {
          const { error: sessionError } = await admin
            .from("interview_sessions")
            .update({ status: "completed", ended_at: endedAt })
            .eq("session_reference", convo.session_reference)
            .eq("status", "active");
          if (sessionError) throw sessionError;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof HttpError)
      return json({ error: err.message }, err.status);
    console.error("tavus-webhook error:", (err as Error)?.message || err);
    logAppEvent("edge:tavus-webhook", {
      level: "error",
      eventType: "unhandled_exception",
      message: (err as Error)?.message || String(err),
      metadata: { stack: (err as Error)?.stack },
    }).catch(() => {});
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
