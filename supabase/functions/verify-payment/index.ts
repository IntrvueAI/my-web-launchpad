
/**
 * Supabase Edge Function: verify-payment
 * Verifies a Stripe Checkout Session, marks the order as paid, and credits the user's balance.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "npm:stripe@13.11.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logAppEvent } from "./_shared/appLogger.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

function cors(res: Response, origin?: string) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin || "*");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(res.body, { status: res.status, headers });
}

serve(async (req) => {
if (req.method === "OPTIONS") {
  return cors(new Response(null, { status: 204 }), req.headers.get("origin") || "*");
}

const requestId = req.headers.get("x-request-id");
let userId: string | null = null;

try {
  if (req.method !== "POST") {
    return cors(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }), req.headers.get("origin") || "*");
  }

const { session_id } = await req.json().catch(() => ({}));
if (!session_id) {
  return cors(new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400 }), req.headers.get("origin") || "*");
}

// Create Supabase clients
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

// Authenticate caller
const authHeader = req.headers.get("Authorization") || "";
const token = authHeader.replace("Bearer ", "");
const { data: userData, error: userErr } = await anon.auth.getUser(token);
if (userErr || !userData?.user) {
  console.error("Authentication failed:", userErr);
  return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }), req.headers.get("origin") || "*");
}

userId = userData.user.id;
console.log("Payment verification started for user:", userData.user.email);

// Retrieve session from Stripe
const session = await stripe.checkout.sessions.retrieve(session_id);
if (!session) {
  console.error("Stripe session not found:", session_id);
  return cors(new Response(JSON.stringify({ error: "Session not found" }), { status: 404 }), req.headers.get("origin") || "*");
}

console.log("Stripe session retrieved:", session.id, "Status:", session.payment_status);

if (session.payment_status !== "paid") {
  console.error("Payment not completed. Status:", session.payment_status);
  return cors(new Response(JSON.stringify({ error: "Payment not completed" }), { status: 400 }), req.headers.get("origin") || "*");
}

// Ensure the Stripe session belongs to the authenticated user via client_reference_id
if (session.client_reference_id && session.client_reference_id !== userData.user.id) {
  console.error("Session client reference mismatch:", session.client_reference_id, "vs", userData.user.id);
  return cors(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }), req.headers.get("origin") || "*");
}

    // Find order
    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .single();

    if (orderErr || !order) {
      console.error("Order not found for session:", session.id, orderErr);
      return cors(new Response(JSON.stringify({ error: "Order not found" }), { status: 404 }), req.headers.get("origin") || "*");
    }

    console.log("Order found:", order.id, "Status:", order.status, "Credits:", order.credits_purchased);

    // Ensure the authenticated user owns the order
    if (order.user_id !== userData.user.id) {
      console.error("Order ownership mismatch:", order.user_id, "vs", userData.user.id);
      return cors(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }), req.headers.get("origin") || "*");
    }

    // Idempotency: if already paid, return current balance
    if (order.status === "paid") {
      console.log("Order already processed, returning current balance");
      const { data: balanceRow } = await service
        .from("credits_balance")
        .select("credits")
        .eq("user_id", order.user_id)
        .maybeSingle();
      
      return cors(
        new Response(JSON.stringify({ ok: true, alreadyProcessed: true, credits_added: 0, balance: balanceRow?.credits ?? 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
        req.headers.get("origin") || "*"
      );
    }

    // Begin atomic transaction: mark order as paid first
    const { data: updatedOrder, error: updateError } = await service
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError || !updatedOrder) {
      console.error("Failed to update order status:", updateError);
      return cors(new Response(JSON.stringify({ error: "Failed to process payment" }), { status: 500 }), req.headers.get("origin") || "*");
    }

    console.log("Order marked as paid:", updatedOrder.id);

    // Update credits balance with error handling
    let newBalance = 0;
    try {
      const { data: existing, error: balanceErr } = await service
        .from("credits_balance")
        .select("credits")
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (balanceErr) {
        console.error("Error fetching balance:", balanceErr);
        throw balanceErr;
      }

      if (existing) {
        const updated = existing.credits + (order.credits_purchased ?? 0);
        const { error: updateBalanceErr } = await service
          .from("credits_balance")
          .update({ credits: updated })
          .eq("user_id", order.user_id);
        
        if (updateBalanceErr) {
          console.error("Error updating balance:", updateBalanceErr);
          throw updateBalanceErr;
        }
        newBalance = updated;
        console.log("Credits balance updated:", existing.credits, "->", updated);
      } else {
        const { error: insertBalanceErr } = await service
          .from("credits_balance")
          .insert({
            user_id: order.user_id,
            credits: order.credits_purchased ?? 0,
          });
        
        if (insertBalanceErr) {
          console.error("Error inserting balance:", insertBalanceErr);
          throw insertBalanceErr;
        }
        newBalance = order.credits_purchased ?? 0;
        console.log("Credits balance created:", newBalance);
      }
    } catch (creditsError) {
      console.error("Critical error updating credits:", creditsError);
      logAppEvent("edge:verify-payment", {
        level: "error",
        eventType: "credits_update_failed",
        message: (creditsError as Error)?.message || String(creditsError),
        userId,
        requestId,
        metadata: { stack: (creditsError as Error)?.stack, orderId: order.id },
      }).catch(() => {});

      // Rollback order status to pending if credits update failed
      await service
        .from("orders")
        .update({ status: "pending" })
        .eq("id", order.id);

      return cors(new Response(JSON.stringify({ error: "Failed to update credits" }), { status: 500 }), req.headers.get("origin") || "*");
    }

return cors(
  new Response(JSON.stringify({ ok: true, credits_added: order.credits_purchased ?? 0, balance: newBalance }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }),
  req.headers.get("origin") || "*"
);
  } catch (e) {
    console.error("verify-payment error", e);
    logAppEvent("edge:verify-payment", {
      level: "error",
      eventType: "unhandled_exception",
      message: (e as Error)?.message || String(e),
      userId,
      requestId,
      metadata: { stack: (e as Error)?.stack },
    }).catch(() => {});
    return cors(new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }), req.headers.get("origin") || "*");
  }
});
