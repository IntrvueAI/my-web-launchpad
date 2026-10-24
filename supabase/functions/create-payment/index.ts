import { withJson } from "../_shared/http.ts";

/**
 * Supabase Edge Function: create-payment
 * Creates a Stripe Checkout Session for purchasing interview credits and stores a pending order.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createStripe } from "../_shared/payments.ts";
import { MEDICINE_CREDIT_PACKS, type MedicineCreditPackId } from "../_shared/medicinePricing.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logAppEvent } from "./_shared/appLogger.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = createStripe();

function cors(res: Response, origin?: string) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin || "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type, x-request-id",
  );
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(res.body, { status: res.status, headers });
}

serve(
  withJson(async (req) => {
    if (req.method === "OPTIONS") {
      return cors(
        new Response(null, { status: 204 }),
        req.headers.get("origin") || "*",
      );
    }

    const requestId = req.headers.get("x-request-id");
    let userId: string | null = null;

    try {
      if (req.method !== "POST") {
        return cors(
          new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
          }),
          req.headers.get("origin") || "*",
        );
      }

      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");

      const { pack, platform = "11plus" } = await req.json().catch(() => ({}));

      // 11+ packs are 2, 3 or 5 credits; Medicine packs are named and priced on the server.
      const medicine = platform === "medicine";
      const medicinePack =
        medicine && typeof pack === "string" && Object.hasOwn(MEDICINE_CREDIT_PACKS, pack)
          ? MEDICINE_CREDIT_PACKS[pack as MedicineCreditPackId]
          : null;
      if (
        (platform !== "11plus" && !medicine) ||
        (medicine ? !medicinePack : ![2, 3, 5].includes(pack))
      ) {
        return cors(
          new Response(
            JSON.stringify({
              error: medicine ? "Invalid Medicine pack." : "Invalid pack. Use 2, 3, or 5.",
            }),
            { status: 400 },
          ),
        );
      }

      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: userData, error: userErr } = await anon.auth.getUser(token);
      if (userErr || !userData?.user) {
        return cors(
          new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
          }),
          req.headers.get("origin") || "*",
        );
      }

      userId = userData.user.id;
      const listPrice = medicinePack
        ? medicinePack.amountPence
        : pack === 2 ? 1999 : pack === 3 ? 2999 : 4499;
      const credits = medicinePack ? medicinePack.credits : pack;
      const purchasePlatform = medicine ? "medicine" : "11plus";

      // A referred customer's first purchase on this platform gets their creator's discount.
      // If the lookup fails the customer pays the list price rather than being blocked.
      const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: offer, error: offerError } = await service.rpc("referral_offer_for", {
        p_user_id: userId,
        p_platform: purchasePlatform,
      });
      if (offerError) console.error("referral offer lookup failed", offerError.message);
      const discountPercent =
        !offerError && offer && Number.isInteger(offer.discountPercent) && offer.discountPercent > 0 && offer.discountPercent <= 50
          ? offer.discountPercent
          : 0;
      const discount = Math.round((listPrice * discountPercent) / 100);
      const amount = listPrice - discount;
      const discountNote = discount ? ` Includes ${discountPercent}% off your first purchase.` : "";

      const usedOrigin =
        req.headers.get("origin") ||
        (req.headers.get("x-forwarded-proto") &&
        req.headers.get("x-forwarded-host")
          ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
          : "");

      if (!usedOrigin) {
        return cors(
          new Response(JSON.stringify({ error: "Missing origin" }), {
            status: 400,
          }),
          req.headers.get("origin") || "*",
        );
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
              product_data: medicinePack
                ? {
                    name: `MMI Practice: ${medicinePack.name}`,
                    description: medicinePack.note + discountNote,
                  }
                : {
                    name: `Interview Credits x${credits}`,
                    description: "Cost varies by interview." + discountNote,
                  },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          credits: String(credits),
          platform: purchasePlatform,
          ...(discount ? { discount_pence: String(discount) } : {}),
        },
      });

      // Record pending order
      const { error: orderError } = await service.from("orders").insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount,
        currency: "gbp",
        credits_purchased: credits,
        platform: purchasePlatform,
        status: "pending",
        metadata: {
          source: "checkout",
          list_price_pence: listPrice,
          ...(discount ? { discount_pence: discount, referral_link_id: offer.linkId } : {}),
        } as any,
      });
      if (orderError) {
        // Do not send someone to checkout when we cannot fulfil their purchase.
        await stripe.checkout.sessions.expire(session.id).catch(() => {});
        throw new Error("Could not record checkout order");
      }
      if (!session.url) throw new Error("Checkout returned no URL");

      return cors(
        new Response(
          JSON.stringify({ url: session.url, session_id: session.id }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
        req.headers.get("origin") || "*",
      );
    } catch (e) {
      console.error("create-payment error", e);
      logAppEvent("edge:create-payment", {
        level: "error",
        eventType: "unhandled_exception",
        message: (e as Error)?.message || String(e),
        userId,
        requestId,
        metadata: { stack: (e as Error)?.stack },
      }).catch(() => {});
      return cors(
        new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
        }),
        req.headers.get("origin") || "*",
      );
    }
  }),
);
