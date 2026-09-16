import { withJson } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logAppEvent } from "./_shared/appLogger.ts";

// Creates a live Tavus conversation for the authenticated user and records the
// conversation_id -> user_id mapping (tavus_conversations) plus a matching interview_sessions
// row, so tavus-webhook can attribute later events (tool calls, transcript, shutdown) back to
// this person, and so the run shows up in the same "My sessions" history as every other
// interview type. Tavus has no user/metadata field of its own — this mapping is the only place
// that link exists.
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const PAL_ID = "p03543bb7bc1";
const DOCUMENT_ID = "dd-557940490bbb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
};

serve(
  withJson(async (req) => {
    if (req.method === "OPTIONS")
      return new Response(null, { headers: corsHeaders });

    const requestId = req.headers.get("x-request-id");
    let userId: string | null = null;

    try {
      const tavusApiKey = Deno.env.get("TAVUS_API_KEY");
      const callbackSecret = Deno.env.get("TAVUS_WEBHOOK_SECRET");
      if (!callbackSecret || callbackSecret.length < 32) {
        return new Response(
          JSON.stringify({
            error: "Tavus callback authentication is not configured",
          }),
          { status: 503, headers: corsHeaders },
        );
      }
      if (
        !tavusApiKey ||
        !supabaseUrl ||
        !supabaseAnonKey ||
        !supabaseServiceKey
      ) {
        throw new Error("Server misconfiguration: missing required secrets");
      }

      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userErr } =
        await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const user = userData.user;
      userId = user.id;
      const admin = createClient(supabaseUrl, supabaseServiceKey);

      // Same one-active-session rule as the Anam path, so a forgotten tab can't rack up parallel
      // live Tavus conversations (real per-minute cost) or lock a legitimate retry out.
      const now = Date.now();
      const staleBefore = new Date(now - 15 * 60 * 1000).toISOString();
      const hardLimitBefore = new Date(now - 2 * 60 * 60 * 1000).toISOString();

      const { error: cleanupError } = await admin
        .from("interview_sessions")
        .update({ status: "abandoned", ended_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("status", "active")
        .or(
          `created_at.lt.${hardLimitBefore},last_activity_at.lt.${staleBefore},and(last_activity_at.is.null,created_at.lt.${staleBefore})`,
        );
      if (cleanupError) throw cleanupError;

      const { count: activeSessions, error: activeError } = await admin
        .from("interview_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      if (activeError) throw activeError;
      if ((activeSessions ?? 0) >= 1) {
        return new Response(
          JSON.stringify({
            error:
              "You already have an active session. Please end it before starting a new one.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: sessionRef, error: refError } = await admin.rpc(
        "generate_session_reference",
      );
      if (refError || !sessionRef)
        throw new Error("Failed to generate session reference");

      const tavusRes = await fetch("https://tavusapi.com/v2/conversations", {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: {
          "x-api-key": tavusApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          persona_id: PAL_ID,
          conversation_name: `maths-v2-${sessionRef}`,
          document_ids: [DOCUMENT_ID],
          document_retrieval_strategy: "quality",
          callback_url: `${supabaseUrl}/functions/v1/tavus-webhook?secret=${encodeURIComponent(callbackSecret)}`,
        }),
      });
      const tavusData = await tavusRes.json();
      if (
        !tavusRes.ok ||
        !tavusData?.conversation_id ||
        typeof tavusData.conversation_url !== "string"
      ) {
        console.error(
          "Tavus create conversation failed:",
          tavusRes.status,
          JSON.stringify(tavusData),
        );
        return new Response(
          JSON.stringify({
            error: "Failed to start the interview. Please try again.",
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: sessionErr } = await admin
        .from("interview_sessions")
        .insert({
          session_reference: sessionRef,
          user_id: user.id,
          interview_type: "maths-v2",
          status: "active",
          session_metadata: {
            provider: "tavus",
            conversation_id: tavusData.conversation_id,
          },
        });
      if (sessionErr) {
        await fetch(
          `https://tavusapi.com/v2/conversations/${encodeURIComponent(tavusData.conversation_id)}/end`,
          {
            method: "POST",
            headers: { "x-api-key": tavusApiKey },
            signal: AbortSignal.timeout(10_000),
          },
        ).catch(() => {});
        throw sessionErr;
      }

      const { error: convoErr } = await admin
        .from("tavus_conversations")
        .insert({
          conversation_id: tavusData.conversation_id,
          user_id: user.id,
          session_reference: sessionRef,
          pal_id: PAL_ID,
          status: "active",
        });
      if (convoErr) {
        await fetch(
          `https://tavusapi.com/v2/conversations/${encodeURIComponent(tavusData.conversation_id)}/end`,
          {
            method: "POST",
            headers: { "x-api-key": tavusApiKey },
            signal: AbortSignal.timeout(10_000),
          },
        ).catch(() => {});
        await admin
          .from("interview_sessions")
          .update({ status: "error", ended_at: new Date().toISOString() })
          .eq("session_reference", sessionRef);
        throw convoErr;
      }

      return new Response(
        JSON.stringify({
          conversation_id: tavusData.conversation_id,
          conversation_url: tavusData.conversation_url,
          session_reference: sessionRef,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error(
        "Error in tavus-create-conversation:",
        (error as Error)?.message || error,
      );
      logAppEvent("edge:tavus-create-conversation", {
        level: "error",
        eventType: "unhandled_exception",
        message: (error as Error)?.message || String(error),
        userId,
        requestId,
        metadata: { stack: (error as Error)?.stack },
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
);
