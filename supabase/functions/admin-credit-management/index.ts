import { withJson, isUuid } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logAppEvent } from "./_shared/appLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

serve(
  withJson(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const requestId = req.headers.get("x-request-id");
    let adminUserId: string | null = null;

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Get the authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("No authorization header");
      }

      // Create a user-context client to evaluate RLS/policies with the caller's JWT
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );

      // Get the user from the JWT token
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      adminUserId = user.id;

      // Enhanced admin verification with security logging
      const { data: isAdmin, error: adminError } = await supabaseUser.rpc(
        "verify_admin_access_with_logging",
      );

      if (adminError || !isAdmin) {
        console.warn(
          `Unauthorized admin access attempt by user ${user.email} from IP: ${req.headers.get("x-forwarded-for") || "unknown"}`,
        );

        // Log security incident
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          admin_email: user.email!,
          action: "unauthorized_admin_attempt",
          details: {
            timestamp: new Date().toISOString(),
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            user_agent: req.headers.get("user-agent") || "unknown",
          },
        });

        return new Response(
          JSON.stringify({ error: "Unauthorized: Admin access required" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Parse request body
      const { userId, action, amount, targetUserEmail } = await req.json();

      if (
        !isUuid(userId) ||
        !["add", "remove"].includes(action) ||
        !Number.isSafeInteger(amount) ||
        amount <= 0
      ) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: userId, action, amount",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        `Admin ${user.email} attempting to ${action} ${amount} credits for user ${targetUserEmail}`,
      );

      // Additional validation: Prevent excessive credit operations
      if (amount > 1000) {
        console.warn(
          `Admin ${user.email} attempted to ${action} excessive amount: ${amount} credits`,
        );
        return new Response(
          JSON.stringify({
            error: "Credit amount exceeds maximum allowed limit (1000)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Serialize adjustments with purchases and credit consumption inside PostgreSQL.
      const { data: adjustment, error: adjustmentError } = await supabase.rpc(
        "adjust_credits_atomic",
        {
          p_user_id: userId,
          p_action: action,
          p_amount: amount,
        },
      );
      if (adjustmentError || !adjustment)
        throw adjustmentError || new Error("No balance returned");
      const newCredits = adjustment.new_balance;

      // Log the admin action
      const { error: auditError } = await supabase
        .from("admin_audit_log")
        .insert({
          admin_user_id: user.id,
          admin_email: user.email!,
          action: action === "add" ? "add_credits" : "remove_credits",
          target_user_id: userId,
          target_user_email: targetUserEmail,
          details: {
            amount: amount,
            previous_balance: adjustment.previous_balance,
            new_balance: newCredits,
            timestamp: new Date().toISOString(),
          },
        });

      if (auditError) {
        console.error("Error logging audit:", auditError);
        // Don't fail the operation if audit logging fails
      }

      console.log(
        `Successfully ${action}ed ${amount} credits for user ${targetUserEmail}. New balance: ${newCredits}`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          newBalance: newCredits,
          action: action,
          amount: amount,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Admin credit management error:", error);
      logAppEvent("edge:admin-credit-management", {
        level: "error",
        eventType: "unhandled_exception",
        message: error instanceof Error ? error.message : String(error),
        userId: adminUserId,
        requestId,
        metadata: { stack: error instanceof Error ? error.stack : undefined },
      }).catch(() => {});
      return new Response(
        JSON.stringify({ error: "Unable to adjust credits" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }),
);
