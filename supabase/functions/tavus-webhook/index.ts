import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/**
 * TEMPORARY diagnostic receiver for the Tavus/Charlie "Maths Intrvue" PAL's end-of-session tool
 * call. Its only job right now is to capture whatever payload Tavus actually sends into
 * tavus_webhook_debug, so we can read the real shape and build the permanent integration
 * (writing into feedback / interview_sessions / question_attempts, matched to a real user) against
 * verified data instead of a guessed schema. No auth — Tavus calls this directly with no Supabase
 * JWT, so this function must be deployed with verify_jwt = false.
 */
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const raw = await req.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { _unparsed_body: raw };
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    console.log("Tavus webhook received:", JSON.stringify(payload));

    if (supabaseUrl && supabaseServiceKey) {
      const admin = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await admin.from("tavus_webhook_debug").insert({ payload, headers });
      if (error) console.error("Failed to store tavus webhook payload:", error.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tavus-webhook error:", (err as Error)?.message || err);
    // Still 200 — we never want Tavus retry-storming us over a logging failure on our side.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
