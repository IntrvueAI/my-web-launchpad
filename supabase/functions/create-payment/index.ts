
/**
 * Supabase Edge Function: create-payment
 * Creates a Stripe Checkout Session for purchasing interview credits and stores a pending order.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "npm:stripe@13.11.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

  try {
if (req.method !== "POST") {
  return cors(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }), req.headers.get("origin") || "*");
}

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { pack } = await req.json().catch(() => ({}));

    if (![2, 3, 5].includes(pack)) {
      return cors(new Response(JSON.stringify({ error: "Invalid pack. Use 2, 3, or 5." }), { status: 400 }));
    }

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
if (userErr || !userData?.user) {
  return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }), req.headers.get("origin") || "*");
}

    const userId = userData.user.id;
    const amount = pack === 2 ? 1999 : pack === 3 ? 2999 : 4499;
    const credits = pack;

const usedOrigin =
  req.headers.get("origin") ||
  (req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
    : "");

if (!usedOrigin) {
  return cors(new Response(JSON.stringify({ error: "Missing origin" }), { status: 400 }), req.headers.get("origin") || "*");
}

    const successUrl = `${usedOrigin}/?view=payment-success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${usedOrigin}/?view=credits`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Interview Credits x${credits}`,
              description: "Cost varies by interview.",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        credits: String(credits),
      },
    });

    // Record pending order
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await service.from("orders").insert({
      user_id: userId,
      stripe_session_id: session.id,
      amount,
      currency: "gbp",
      credits_purchased: credits,
      status: "pending",
      metadata: { source: "checkout" } as any,
    });

return cors(
  new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }),
  req.headers.get("origin") || "*"
);
  } catch (e) {
    console.error("create-payment error", e);
return cors(new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }), req.headers.get("origin") || "*");
  }
});
