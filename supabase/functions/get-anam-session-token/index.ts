import { withJson } from "../_shared/http.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logAppEvent } from "./_shared/appLogger.ts";

// Read required environment variables from Supabase secrets
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in Supabase secrets",
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
};

interface PersonaConfig {
  name: string;
  avatarId: string;
  voiceId: string;
  brainType: string;
  systemPrompt: string;
  maxSessionLengthSeconds?: number;
}

serve(
  withJson(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const requestId = req.headers.get("x-request-id");
    let userId: string | null = null;

    try {
      const anamApiKey = Deno.env.get("ANAM_API_KEY");
      const origin = req.headers.get("origin") || "*";

      if (!anamApiKey) {
        throw new Error("ANAM_API_KEY is not configured in Supabase secrets");
      }

      // Authenticate caller
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");

      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        return new Response(
          JSON.stringify({
            error:
              "Server misconfiguration: missing SUPABASE_URL or SUPABASE_ANON_KEY",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Access-Control-Allow-Origin": origin,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userErr } =
        await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Origin": origin,
            "Content-Type": "application/json",
          },
        });
      }
      userId = userData.user.id;

      // Long circuits must not be labelled abandoned merely because they exceed 90 seconds.
      // The current attempt is identified explicitly; other recently active sessions still block it.
      const requestBody = await req.json();
      const { personaConfig, sessionReference } = requestBody;
      if (
        sessionReference !== undefined &&
        (typeof sessionReference !== "string" ||
          !sessionReference ||
          sessionReference.length > 100)
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid session reference" }),
          { status: 400, headers: corsHeaders },
        );
      }
      if (
        !personaConfig ||
        typeof personaConfig !== "object" ||
        Array.isArray(personaConfig)
      ) {
        return new Response(
          JSON.stringify({ error: "Valid personaConfig is required" }),
          { status: 400, headers: corsHeaders },
        );
      }
      const now = Date.now();
      const staleBefore = new Date(now - 15 * 60 * 1000).toISOString();
      const hardLimitBefore = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      const supabaseService = createClient(supabaseUrl!, supabaseServiceKey!);
      let currentSession: {
        id: string;
        interview_type: string;
        status: string;
      } | null = null;
      if (sessionReference) {
        const { data, error } = await supabaseService
          .from("interview_sessions")
          .select("id, interview_type, status")
          .eq("session_reference", sessionReference)
          .eq("user_id", userId)
          .maybeSingle();
        if (error || !data || data.status !== "active")
          return new Response(
            JSON.stringify({ error: "Active session not found" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        currentSession = data;
        if (
          [
            "medicine-oxford-pilot",
            "medicine-cambridge-pilot",
            "medicine-imperial-pilot",
          ].includes(data.interview_type)
        ) {
          const caller = createClient(supabaseUrl!, supabaseAnonKey!, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: isAdmin, error: adminError } = await caller.rpc(
            "is_current_user_admin",
          );
          if (adminError || isAdmin !== true)
            return new Response(
              JSON.stringify({
                error: "Draft pilots require administrator access",
              }),
              {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
        }
      }
      let cleanup = supabaseService
        .from("interview_sessions")
        .update({ status: "abandoned", ended_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("status", "active")
        .or(
          `created_at.lt.${hardLimitBefore},last_activity_at.lt.${staleBefore},and(last_activity_at.is.null,created_at.lt.${staleBefore})`,
        );
      if (currentSession) cleanup = cleanup.neq("id", currentSession.id);
      const { error: cleanupError } = await cleanup;
      if (cleanupError) throw cleanupError;
      let activeQuery = supabaseService
        .from("interview_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");
      if (currentSession)
        activeQuery = activeQuery.neq("id", currentSession.id);
      else
        activeQuery = activeQuery.lt(
          "created_at",
          new Date(now - 90 * 1000).toISOString(),
        ); // older clients do not send their reference
      const { count: activeSessions, error: activeError } = await activeQuery;
      if (activeError) throw activeError;
      if ((activeSessions ?? 0) > 0)
        return new Response(
          JSON.stringify({
            error:
              "You already have an active session. Please end it before starting another.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );

      if (!personaConfig || typeof personaConfig !== "object") {
        return new Response(
          JSON.stringify({ error: "Valid personaConfig is required" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Access-Control-Allow-Origin": origin,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // A finite provider-side cap is required; student input cannot request an unlimited session.
      const duration = personaConfig.maxSessionLengthSeconds;
      if (
        typeof duration !== "number" ||
        !Number.isSafeInteger(duration) ||
        duration <= 0 ||
        duration > 7200
      ) {
        return new Response(
          JSON.stringify({
            error: "Session duration must be between 1 and 7200 seconds",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Engine-driven (orchestrated) interviews are puppeteered by our interview-brain via talk().
      // Anam's official "bring your own LLM" mode disables its built-in AI so the avatar only speaks
      // the text we send: set llmId="CUSTOMER_CLIENT_V1" and omit any systemPrompt.
      const engineDriven =
        requestBody.engineDriven === true ||
        personaConfig.engineDriven === true;
      delete personaConfig.engineDriven;
      if (engineDriven) {
        delete personaConfig.brainType;
        personaConfig.llmId = "CUSTOMER_CLIENT_V1";
        delete personaConfig.systemPrompt;
      }

      // Validate required persona config fields
      const requiredFields = engineDriven
        ? ["name", "avatarId", "voiceId", "llmId"]
        : ["name", "avatarId", "voiceId", "brainType", "systemPrompt"];
      for (const field of requiredFields) {
        if (
          typeof personaConfig[field] !== "string" ||
          !personaConfig[field].trim()
        ) {
          return new Response(
            JSON.stringify({
              error: `Valid ${field} is required in personaConfig`,
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Access-Control-Allow-Origin": origin,
                "Content-Type": "application/json",
              },
            },
          );
        }
      }

      // Sanitize system prompt length. Mini-interviews compose the shared core
      // (interview-logic.md) with a subject brief, so the final prompt runs well
      // past 10k characters — cap generously to leave headroom for that.
      if (
        personaConfig.systemPrompt &&
        personaConfig.systemPrompt.length > 30000
      ) {
        return new Response(
          JSON.stringify({
            error: "System prompt too long - maximum 30,000 characters allowed",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Access-Control-Allow-Origin": origin,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const response = await fetch(
        "https://api.anam.ai/v1/auth/session-token",
        {
          method: "POST",
          signal: AbortSignal.timeout(20_000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anamApiKey}`,
          },
          body: JSON.stringify({ personaConfig }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anam API error:", response.status, response.statusText);
        return new Response(
          JSON.stringify({ error: "Failed to generate session token" }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Access-Control-Allow-Origin": origin,
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff",
              "X-Frame-Options": "DENY",
            },
          },
        );
      }

      const data = await response.json();
      if (typeof data.sessionToken !== "string" || !data.sessionToken) {
        return new Response(
          JSON.stringify({ error: "Avatar service returned no session token" }),
          { status: 502, headers: corsHeaders },
        );
      }

      if (Deno.env.get("NODE_ENV") !== "production") {
        console.log("Successfully obtained Anam session token");
      }

      return new Response(JSON.stringify({ sessionToken: data.sessionToken }), {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Origin": origin,
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block",
        },
      });
    } catch (error) {
      console.error(
        "Error in get-anam-session-token function:",
        (error as any).message || error,
      );
      logAppEvent("edge:get-anam-session-token", {
        level: "error",
        eventType: "unhandled_exception",
        message: (error as any)?.message || String(error),
        userId,
        requestId,
        metadata: { stack: (error as any)?.stack },
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      });
    }
  }),
);
