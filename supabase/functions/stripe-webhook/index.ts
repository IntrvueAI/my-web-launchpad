import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type Stripe from "npm:stripe@16.12.0";
import { createStripe, settleCheckout } from "../_shared/payments.ts";
import { json, readText, HttpError } from "../_shared/http.ts";
import { logAppEvent } from "./_shared/appLogger.ts";

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const signature = req.headers.get("stripe-signature");
  if (!signature)
    return json({ error: "Missing stripe-signature header" }, 400);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook not configured" }, 503);
  const stripe = createStripe();
  let event: Stripe.Event;
  try {
    // Verify the original bytes, before JSON parsing.
    event = await stripe.webhooks.constructEventAsync(
      await readText(req, 1_048_576),
      signature,
      secret,
    );
  } catch (error) {
    return json(
      { error: "Invalid webhook request" },
      error instanceof HttpError ? error.status : 400,
    );
  }
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid")
        await settleCheckout(service, session);
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: intent.id,
        limit: 1,
      });
      if (sessions.data[0]) {
        const { error } = await service
          .from("orders")
          .update({ status: "failed" })
          .eq("stripe_session_id", sessions.data[0].id)
          .eq("status", "pending");
        if (error) throw error;
      }
    }
    return json({ received: true });
  } catch (error) {
    logAppEvent("edge:stripe-webhook", {
      level: "error",
      eventType: "webhook_processing_failed",
      message:
        error instanceof Error ? error.message : "Webhook processing failed",
      metadata: { stripeEventId: event.id, stripeEventType: event.type },
    }).catch(() => {});
    // Failed writes trigger redelivery; settlement is atomic and replay-safe.
    return json({ error: "Webhook handler failed" }, 500);
  }
});
