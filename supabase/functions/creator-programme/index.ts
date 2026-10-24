import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isUuid, json, withJson } from "../_shared/http.ts";
import { createStripe } from "../_shared/payments.ts";
import { logAppEvent } from "./_shared/appLogger.ts";

/**
 * Creator programme: Stripe Connect onboarding and status for creators, and payouts for
 * administrators. Creators enter bank details on Stripe's hosted pages; we store only the
 * connected account id. Payouts move ready earnings (past the 30-day hold) with one Stripe
 * transfer, keyed by the payout id so a retry can never pay twice.
 */
const RETURN_ORIGIN =
  /^(https:\/\/(www\.)?(mmipractice\.co\.uk|intrvue\.ai)|https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)|http:\/\/([a-z0-9-]+\.)?localhost:\d{2,5})$/;
const DEFINITIVE_STRIPE_ERRORS = new Set(["StripeInvalidRequestError", "StripePermissionError", "StripeCardError"]);

serve(
  withJson(async (req) => {
    let userId: string | null = null;
    try {
      const url = Deno.env.get("SUPABASE_URL")!;
      const token = req.headers.get("authorization")!.slice(7);
      const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: auth, error: authError } = await caller.auth.getUser(token);
      if (authError || !auth?.user) return json({ error: "Unauthorized" }, 401);
      userId = auth.user.id;
      const body = (await req.json()) as { action?: unknown; creatorId?: unknown };
      const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const origin = req.headers.get("origin") ?? "";
      const base = RETURN_ORIGIN.test(origin) ? origin : "https://intrvue.ai";

      if (body.action === "payout") {
        const { data: isAdmin, error: adminError } = await caller.rpc("is_current_user_admin");
        if (adminError || isAdmin !== true) return json({ error: "Administrator access required" }, 403);
        if (!isUuid(body.creatorId)) return json({ error: "Choose a creator to pay" }, 400);
        const { data: started, error: startError } = await service.rpc("begin_creator_payout", {
          p_creator_id: body.creatorId,
          p_admin_id: userId,
        });
        if (startError) throw startError;
        if (!started?.ok)
          return json({
            error: started?.reason === "payouts_not_ready"
              ? "This creator has not finished setting up payouts with Stripe."
              : "Nothing is ready to pay yet. Earnings become payable 30 days after each purchase.",
            reason: started?.reason ?? "unknown",
          }, 409);
        try {
          const transfer = await createStripe().transfers.create(
            {
              amount: started.amountPence,
              currency: "gbp",
              destination: started.destination,
              transfer_group: `creator-payout-${started.payoutId}`,
              metadata: { payout_id: started.payoutId, creator_id: body.creatorId as string },
            },
            { idempotencyKey: `creator-payout-${started.payoutId}` },
          );
          const { error: finishError } = await service.rpc("finish_creator_payout", {
            p_payout_id: started.payoutId,
            p_transfer_id: transfer.id,
            p_failure: null,
          });
          if (finishError) throw finishError;
          return json({ ok: true, amountPence: started.amountPence, transferId: transfer.id, resumed: started.resumed });
        } catch (error) {
          // A refusal (for example an insufficient platform balance) releases the earnings for a
          // later attempt. Anything else stays reserved and resumes with the same idempotency key.
          const type = (error as { type?: string })?.type ?? "";
          if (!DEFINITIVE_STRIPE_ERRORS.has(type)) throw error;
          const reason = (error as Error).message?.slice(0, 300) || "Stripe declined the transfer";
          await service.rpc("finish_creator_payout", { p_payout_id: started.payoutId, p_transfer_id: null, p_failure: reason });
          return json({ error: `Stripe declined the transfer: ${reason}` }, 402);
        }
      }

      const { data: creator, error: creatorError } = await service
        .from("creators")
        .select("id, email, name, status, stripe_account_id, payout_status")
        .eq("user_id", userId)
        .maybeSingle();
      if (creatorError) throw creatorError;
      if (!creator) return json({ error: "This account is not a creator account" }, 403);
      const stripe = createStripe();

      if (body.action === "connect") {
        if (creator.status === "paused") return json({ error: "Your creator account is paused" }, 403);
        let account = creator.stripe_account_id as string | null;
        if (!account) {
          const created = await stripe.accounts.create(
            {
              type: "express",
              country: "GB",
              email: creator.email,
              business_type: "individual",
              capabilities: { transfers: { requested: true } },
              metadata: { creator_id: creator.id },
            },
            { idempotencyKey: `creator-account-${creator.id}` },
          );
          account = created.id;
          const { error: saveError } = await service
            .from("creators")
            .update({ stripe_account_id: account, payout_status: "pending" })
            .eq("id", creator.id)
            .is("stripe_account_id", null);
          if (saveError) throw saveError;
        }
        const link = await stripe.accountLinks.create({
          account,
          type: "account_onboarding",
          refresh_url: `${base}/creator?stripe=refresh`,
          return_url: `${base}/creator?stripe=return`,
        });
        return json({ url: link.url });
      }

      if (body.action === "status") {
        if (!creator.stripe_account_id) return json({ payoutStatus: "not_connected", due: 0 });
        const account = await stripe.accounts.retrieve(creator.stripe_account_id);
        const payoutStatus = account.payouts_enabled && account.details_submitted ? "verified" : "pending";
        if (payoutStatus !== creator.payout_status) {
          const { error } = await service.from("creators").update({ payout_status: payoutStatus }).eq("id", creator.id);
          if (error) throw error;
        }
        return json({ payoutStatus, due: account.requirements?.currently_due?.length ?? 0 });
      }

      if (body.action === "stripe_dashboard") {
        if (!creator.stripe_account_id || creator.payout_status !== "verified")
          return json({ error: "Finish setting up payouts first" }, 409);
        const link = await stripe.accounts.createLoginLink(creator.stripe_account_id);
        return json({ url: link.url });
      }

      return json({ error: "Unknown action" }, 400);
    } catch (error) {
      logAppEvent("edge:creator-programme", {
        level: "error",
        eventType: "unhandled_exception",
        message: error instanceof Error ? error.message : String(error),
        userId,
        requestId: req.headers.get("x-request-id"),
      }).catch(() => {});
      return json({ error: "The creator service could not complete this request. Please try again." }, 500);
    }
  }),
);
