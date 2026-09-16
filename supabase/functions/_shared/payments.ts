import Stripe from "npm:stripe@16.12.0";

// Match the existing Stripe API version; all three payment functions use one SDK contract.
export const createStripe = () =>
  new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
    timeout: 20_000,
    maxNetworkRetries: 1,
  });

export async function settleCheckout(
  service: { rpc: CallableFunction },
  session: Stripe.Checkout.Session,
  expectedUserId: string | null = null,
) {
  if (
    session.payment_status !== "paid" ||
    !Number.isSafeInteger(session.amount_total) ||
    !session.currency
  ) {
    throw new Error("Checkout is not a verified paid session");
  }
  if (
    expectedUserId &&
    session.client_reference_id &&
    session.client_reference_id !== expectedUserId
  ) {
    throw new Error("Checkout ownership mismatch");
  }
  const credits = session.metadata?.credits;
  if (credits !== undefined && !/^\d+$/.test(credits))
    throw new Error("Invalid checkout credits");
  const { data, error } = await service.rpc("settle_checkout_payment", {
    p_session_id: session.id,
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_user_id: expectedUserId || session.client_reference_id || null,
    p_credits: credits === undefined ? null : Number(credits),
  });
  if (error) throw error;
  if (!data || typeof data.balance !== "number")
    throw new Error("Payment settlement returned no balance");
  return data as {
    ok: true;
    alreadyProcessed: boolean;
    credits_added: number;
    balance: number;
  };
}
