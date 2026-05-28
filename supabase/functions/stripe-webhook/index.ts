/**
 * Supabase Edge Function: stripe-webhook
 *
 * Receives Stripe events and keeps orders + credits_balance in sync.
 * Handles the case where a user pays but closes the browser before /success,
 * which would leave the order stuck in 'pending' forever without this webhook.
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   (from Stripe dashboard → Webhooks → signing secret)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Register this URL in Stripe dashboard:
 *   https://<project>.supabase.co/functions/v1/stripe-webhook
 * Events to send: checkout.session.completed, payment_intent.payment_failed
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "npm:stripe@13.11.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing webhook event:", event.type, err);
    return new Response("Webhook handler failed", { status: 500 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  // Idempotency: only act on pending orders
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", session.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!order) {
    console.log("Order not found or already processed for session:", session.id);
    return;
  }

  // Mark order paid (eq status:pending acts as optimistic lock against double-processing)
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending");

  if (updateError) {
    console.error("Failed to update order status:", updateError);
    throw updateError;
  }

  // Upsert credits balance
  const { data: existing } = await supabase
    .from("credits_balance")
    .select("credits")
    .eq("user_id", order.user_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("credits_balance")
      .update({ credits: existing.credits + order.credits_purchased })
      .eq("user_id", order.user_id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("credits_balance")
      .insert({ user_id: order.user_id, credits: order.credits_purchased });
    if (error) throw error;
  }

  console.log(
    `Webhook: order ${order.id} paid — added ${order.credits_purchased} credits to user ${order.user_id}`
  );
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Look up the checkout session that contains this payment intent
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent.id,
    limit: 1,
  });

  const session = sessions.data[0];
  if (!session) {
    console.log("No checkout session found for payment intent:", paymentIntent.id);
    return;
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "failed" })
    .eq("stripe_session_id", session.id)
    .eq("status", "pending");

  if (error) console.error("Failed to mark order as failed:", error);
  else console.log("Webhook: order marked failed for session:", session.id);
}
