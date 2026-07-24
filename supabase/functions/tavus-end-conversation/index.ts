import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Ends a live Tavus conversation the caller owns, and marks it/its interview_sessions row
// completed. tavus-webhook's system.shutdown handler does the same on Tavus's side-effect path,
// so this is belt-and-suspenders for the normal "student clicks End" flow (faster than waiting on
// the webhook round-trip, and still correct if the webhook is ever delayed or missed).
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const { conversation_id } = await req.json();
    if (!conversation_id || typeof conversation_id !== "string") {
      return new Response(JSON.stringify({ error: "conversation_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Ownership check — never let a user end someone else's conversation.
    const { data: convo, error: convoErr } = await admin
      .from("tavus_conversations")
      .select("user_id, session_reference")
      .eq("conversation_id", conversation_id)
      .maybeSingle();
    if (convoErr || !convo || convo.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await fetch(`https://tavusapi.com/v2/conversations/${conversation_id}/end`, {
      method: "POST",
      headers: { "x-api-key": tavusApiKey },
    }).catch((err) => console.error("Tavus end call failed:", err));

    const endedAt = new Date().toISOString();
    await admin
      .from("tavus_conversations")
      .update({ status: "completed", ended_at: endedAt })
      .eq("conversation_id", conversation_id);
    await admin
      .from("interview_sessions")
      .update({ status: "completed", ended_at: endedAt })
      .eq("session_reference", convo.session_reference);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in tavus-end-conversation:", (error as Error)?.message || error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
