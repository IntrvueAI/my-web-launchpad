import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { withJson, json } from "../_shared/http.ts";
import { createStripe, settleCheckout } from "../_shared/payments.ts";
import { logAppEvent } from "./_shared/appLogger.ts";

serve(
  withJson(async (req) => {
    let userId: string | null = null;
    try {
      const url = Deno.env.get("SUPABASE_URL")!;
      const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data, error } = await auth.auth.getUser(
        req.headers.get("authorization")!.slice(7),
      );
      if (error || !data.user) return json({ error: "Unauthorized" }, 401);
      userId = data.user.id;
      const { session_id } = await req.json();
      if (
        typeof session_id !== "string" ||
        !/^cs_[A-Za-z0-9_]{1,240}$/.test(session_id)
      ) {
        return json({ error: "Valid session_id is required" }, 400);
      }
      const service = createClient(
        url,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      // Check ownership before looking up a third-party resource.
      const { data: order, error: orderError } = await service
        .from("orders")
        .select("id, user_id")
        .eq("stripe_session_id", session_id)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order || order.user_id !== userId)
        return json({ error: "Order not found" }, 404);
      const session =
        await createStripe().checkout.sessions.retrieve(session_id);
      if (session.payment_status !== "paid")
        return json({ error: "Payment not completed" }, 400);
      if (session.client_reference_id && session.client_reference_id !== userId)
        return json({ error: "Forbidden" }, 403);
      return json(await settleCheckout(service, session, userId));
    } catch (error) {
      logAppEvent("edge:verify-payment", {
        level: "error",
        eventType: "payment_verification_failed",
        message:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
        userId,
        requestId: req.headers.get("x-request-id"),
      }).catch(() => {});
      return json({ error: "Unable to verify payment. Please retry." }, 500);
    }
  }),
);
