-- Both the browser verification and signed Stripe webhook call this one transaction.
-- An order row lock prevents duplicate credits; the balance upsert avoids lost concurrent purchases.
CREATE OR REPLACE FUNCTION public.settle_checkout_payment(
  p_session_id text, p_amount integer, p_currency text,
  p_user_id uuid DEFAULT NULL, p_credits integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  purchase public.orders%ROWTYPE;
  balance_after integer;
BEGIN
  SELECT * INTO purchase FROM public.orders WHERE stripe_session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_amount IS NULL OR purchase.amount <> p_amount
    OR p_currency IS NULL OR lower(purchase.currency) <> lower(p_currency)
    OR (p_user_id IS NOT NULL AND purchase.user_id <> p_user_id)
    OR (p_credits IS NOT NULL AND purchase.credits_purchased <> p_credits)
    OR purchase.credits_purchased <= 0 THEN
    RAISE EXCEPTION 'Checkout does not match order';
  END IF;
  IF purchase.status = 'paid' THEN
    SELECT credits INTO balance_after FROM public.credits_balance WHERE user_id = purchase.user_id;
    RETURN jsonb_build_object('ok', true, 'alreadyProcessed', true, 'credits_added', 0, 'balance', coalesce(balance_after, 0));
  END IF;
  IF purchase.status NOT IN ('pending', 'failed') THEN RAISE EXCEPTION 'Order cannot be settled'; END IF;
  INSERT INTO public.credits_balance AS b (user_id, credits)
    VALUES (purchase.user_id, purchase.credits_purchased)
    ON CONFLICT (user_id) DO UPDATE SET credits = b.credits + EXCLUDED.credits, updated_at = now()
    RETURNING credits INTO balance_after;
  UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = purchase.id;
  RETURN jsonb_build_object('ok', true, 'alreadyProcessed', false,
    'credits_added', purchase.credits_purchased, 'balance', balance_after);
END;
$$;
REVOKE ALL ON FUNCTION public.settle_checkout_payment(text, integer, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_checkout_payment(text, integer, text, uuid, integer) TO service_role;

-- The browser may read its own balance/orders and consume credits through the existing RPC.
-- It must not mint credits or create client-selected order amounts.
DROP POLICY IF EXISTS "insert_own_credits" ON public.credits_balance;
DROP POLICY IF EXISTS "update_own_credits" ON public.credits_balance;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

CREATE OR REPLACE FUNCTION public.adjust_credits_atomic(p_user_id uuid, p_action text, p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE old_balance integer; new_balance integer;
BEGIN
  IF p_user_id IS NULL OR p_action NOT IN ('add','remove') OR p_action IS NULL
    OR p_amount IS NULL OR p_amount < 1 OR p_amount > 1000 THEN RAISE EXCEPTION 'Invalid credit adjustment'; END IF;
  INSERT INTO public.credits_balance(user_id, credits) VALUES(p_user_id, 0) ON CONFLICT DO NOTHING;
  SELECT credits INTO old_balance FROM public.credits_balance WHERE user_id = p_user_id FOR UPDATE;
  new_balance := CASE WHEN p_action = 'add' THEN old_balance + p_amount ELSE greatest(0, old_balance - p_amount) END;
  UPDATE public.credits_balance SET credits = new_balance, updated_at = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('previous_balance', old_balance, 'new_balance', new_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_credits_atomic(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_credits_atomic(uuid, text, integer) TO service_role;
