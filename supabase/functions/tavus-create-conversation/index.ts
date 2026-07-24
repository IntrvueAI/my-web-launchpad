import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const tavusApiKey = Deno.env.get("TAVUS_API_KEY");
    if (!tavusApiKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Server misconfiguration: missing required secrets");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Same one-active-session rule as the Anam path, so a forgotten tab can't rack up parallel
    // live Tavus conversations (real per-minute cost) or lock a legitimate retry out.
    const now = Date.now();
    const ignoreYoungerThan = new Date(now - 90 * 1000).toISOString();
    const ignoreOlderThan = new Date(now - 30 * 60 * 1000).toISOString();

    await admin
      .from("interview_sessions")
      .update({ status: "abandoned", ended_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active")
      .lt("created_at", ignoreYoungerThan);

    const { count: activeSessions } = await admin
      .from("interview_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active")
      .lt("created_at", ignoreYoungerThan)
      .gt("created_at", ignoreOlderThan);
    if ((activeSessions ?? 0) >= 1) {
      return new Response(
        JSON.stringify({ error: "You already have an active session. Please end it before starting a new one." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: sessionRef, error: refError } = await admin.rpc("generate_session_reference");
    if (refError || !sessionRef) throw new Error("Failed to generate session reference");

    const tavusRes = await fetch("https://tavusapi.com/v2/conversations", {
      method: "POST",
      headers: { "x-api-key": tavusApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        persona_id: PAL_ID,
        conversation_name: `maths-v2-${sessionRef}`,
        document_ids: [DOCUMENT_ID],
        document_retrieval_strategy: "quality",
        callback_url: `${supabaseUrl}/functions/v1/tavus-webhook`,
      }),
    });
    const tavusData = await tavusRes.json();
    if (!tavusRes.ok || !tavusData?.conversation_id) {
      console.error("Tavus create conversation failed:", tavusRes.status, JSON.stringify(tavusData));
      return new Response(JSON.stringify({ error: "Failed to start the interview. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: sessionErr } = await admin.from("interview_sessions").insert({
      session_reference: sessionRef,
      user_id: user.id,
      interview_type: "maths-v2",
      status: "active",
      session_metadata: { provider: "tavus", conversation_id: tavusData.conversation_id },
    });
    if (sessionErr) console.error("Failed to insert interview_sessions row:", sessionErr.message);

    const { error: convoErr } = await admin.from("tavus_conversations").insert({
      conversation_id: tavusData.conversation_id,
      user_id: user.id,
      session_reference: sessionRef,
      pal_id: PAL_ID,
      status: "active",
    });
    if (convoErr) console.error("Failed to insert tavus_conversations row:", convoErr.message);

    return new Response(
      JSON.stringify({
        conversation_id: tavusData.conversation_id,
        conversation_url: tavusData.conversation_url,
        session_reference: sessionRef,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in tavus-create-conversation:", (error as Error)?.message || error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
