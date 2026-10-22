-- MMI Practice (Medicine) credits: a balance separate from 11+ credits, charged by the server.
--
-- One Medicine credit is one seven-minute mini interview; the full six-station MMI costs six.
-- Prices and per-interview costs live in supabase/functions/_shared/medicinePricing.ts; the
-- database only stores balances, an audit ledger and the once-per-session charge.
-- Existing 11+ balances, orders and consume_credit() are unchanged.

CREATE TABLE IF NOT EXISTS public.medicine_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_credit_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their own Medicine credits" ON public.medicine_credit_balances;
CREATE POLICY "Users read their own Medicine credits" ON public.medicine_credit_balances
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_current_user_admin());
REVOKE ALL ON public.medicine_credit_balances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.medicine_credit_balances TO authenticated;
GRANT ALL ON public.medicine_credit_balances TO service_role;

-- Every change to a Medicine balance, so purchases, charges and refunds can be audited.
CREATE TABLE IF NOT EXISTS public.medicine_credit_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL CHECK (delta <> 0),
  reason text NOT NULL CHECK (reason IN ('purchase', 'interview', 'refund', 'admin')),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  interview_type text,
  refunded_at timestamptz,
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS medicine_credit_ledger_one_charge
  ON public.medicine_credit_ledger(session_id) WHERE reason = 'interview';
CREATE UNIQUE INDEX IF NOT EXISTS medicine_credit_ledger_one_refund
  ON public.medicine_credit_ledger(session_id) WHERE reason = 'refund';
CREATE UNIQUE INDEX IF NOT EXISTS medicine_credit_ledger_one_purchase
  ON public.medicine_credit_ledger(order_id) WHERE reason = 'purchase';
CREATE INDEX IF NOT EXISTS medicine_credit_ledger_user_created
  ON public.medicine_credit_ledger(user_id, created_at DESC);
ALTER TABLE public.medicine_credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their own Medicine credit history" ON public.medicine_credit_ledger;
CREATE POLICY "Users read their own Medicine credit history" ON public.medicine_credit_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_current_user_admin());
REVOKE ALL ON public.medicine_credit_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.medicine_credit_ledger TO authenticated;
GRANT ALL ON public.medicine_credit_ledger TO service_role;

-- Orders say which balance they fill. Every existing order is an 11+ order.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT '11plus';
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_platform_check CHECK (platform IN ('11plus', 'medicine'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Browsers may create, heartbeat and end their own interviews, but the interview brain alone
-- writes the engine state and an interview's type cannot change once created. Without this a
-- browser could start a free interview and relabel it, or replay a forged state without paying.
CREATE OR REPLACE FUNCTION public.guard_interview_session_engine()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.engine_state IS NOT NULL OR coalesce(NEW.engine_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'Interview state is managed by the server';
    END IF;
  ELSIF NEW.engine_state IS DISTINCT FROM OLD.engine_state
    OR NEW.engine_revision IS DISTINCT FROM OLD.engine_revision
    OR NEW.interview_type IS DISTINCT FROM OLD.interview_type
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR (OLD.status <> 'active' AND NEW.status = 'active') THEN
    RAISE EXCEPTION 'Interview state is managed by the server';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_interview_session_engine() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_interview_session_engine ON public.interview_sessions;
CREATE TRIGGER guard_interview_session_engine BEFORE INSERT OR UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_interview_session_engine();

-- Charge one Medicine session once. The edge function decides the cost from the shared price
-- list; repeat calls for the same session return the original charge without charging again.
CREATE OR REPLACE FUNCTION public.charge_medicine_session(p_session_id uuid, p_cost integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_session public.interview_sessions%ROWTYPE;
  v_charge public.medicine_credit_ledger%ROWTYPE;
  v_balance integer;
BEGIN
  IF p_session_id IS NULL OR p_cost IS NULL OR p_cost < 1 OR p_cost > 50 THEN
    RAISE EXCEPTION 'Invalid Medicine charge';
  END IF;
  SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_session.user_id IS NULL OR v_session.interview_type NOT LIKE 'medicine-%' THEN
    RAISE EXCEPTION 'Medicine session not found';
  END IF;
  INSERT INTO public.medicine_credit_balances(user_id) VALUES (v_session.user_id) ON CONFLICT DO NOTHING;
  SELECT credits INTO v_balance FROM public.medicine_credit_balances WHERE user_id = v_session.user_id FOR UPDATE;
  SELECT * INTO v_charge FROM public.medicine_credit_ledger WHERE session_id = p_session_id AND reason = 'interview';
  IF FOUND THEN
    IF v_charge.refunded_at IS NOT NULL OR v_charge.interview_type IS DISTINCT FROM v_session.interview_type THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'closed', 'balance', v_balance, 'cost', p_cost);
    END IF;
    RETURN jsonb_build_object('ok', true, 'alreadyCharged', true, 'charged', -v_charge.delta, 'balance', v_balance);
  END IF;
  IF v_session.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'closed', 'balance', v_balance, 'cost', p_cost);
  END IF;
  IF v_balance < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', v_balance, 'cost', p_cost);
  END IF;
  UPDATE public.medicine_credit_balances SET credits = credits - p_cost, updated_at = now()
    WHERE user_id = v_session.user_id RETURNING credits INTO v_balance;
  INSERT INTO public.medicine_credit_ledger(user_id, delta, reason, balance_after, session_id, interview_type)
    VALUES (v_session.user_id, -p_cost, 'interview', v_balance, p_session_id, v_session.interview_type);
  RETURN jsonb_build_object('ok', true, 'alreadyCharged', false, 'charged', p_cost, 'balance', v_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.charge_medicine_session(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_medicine_session(uuid, integer) TO service_role;

-- A paid session that ends before Clara says anything returns its credits automatically
-- (for example, the video could not connect). Once the brain has started, refunds are manual.
CREATE OR REPLACE FUNCTION public.refund_unstarted_medicine_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_charge public.medicine_credit_ledger%ROWTYPE; v_balance integer;
BEGIN
  IF OLD.status <> 'active' OR NEW.status = 'active' OR NEW.engine_state IS NOT NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_charge FROM public.medicine_credit_ledger
    WHERE session_id = NEW.id AND reason = 'interview' AND refunded_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  UPDATE public.medicine_credit_balances SET credits = credits - v_charge.delta, updated_at = now()
    WHERE user_id = v_charge.user_id RETURNING credits INTO v_balance;
  UPDATE public.medicine_credit_ledger SET refunded_at = now() WHERE id = v_charge.id;
  INSERT INTO public.medicine_credit_ledger(user_id, delta, reason, balance_after, session_id, interview_type, note)
    VALUES (v_charge.user_id, -v_charge.delta, 'refund', v_balance, NEW.id, v_charge.interview_type,
      'Returned automatically: the interview ended before it started');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.refund_unstarted_medicine_session() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS refund_unstarted_medicine_session ON public.interview_sessions;
CREATE TRIGGER refund_unstarted_medicine_session AFTER UPDATE OF status ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.refund_unstarted_medicine_session();

-- Administrators add or remove Medicine credits (goodwill, refunds after a dropped interview).
CREATE OR REPLACE FUNCTION public.adjust_medicine_credits_atomic(
  p_user_id uuid, p_action text, p_amount integer, p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE old_balance integer; new_balance integer;
BEGIN
  IF p_user_id IS NULL OR p_action IS NULL OR p_action NOT IN ('add', 'remove')
    OR p_amount IS NULL OR p_amount < 1 OR p_amount > 1000 THEN
    RAISE EXCEPTION 'Invalid credit adjustment';
  END IF;
  INSERT INTO public.medicine_credit_balances(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  SELECT credits INTO old_balance FROM public.medicine_credit_balances WHERE user_id = p_user_id FOR UPDATE;
  new_balance := CASE WHEN p_action = 'add' THEN old_balance + p_amount ELSE greatest(0, old_balance - p_amount) END;
  UPDATE public.medicine_credit_balances SET credits = new_balance, updated_at = now() WHERE user_id = p_user_id;
  IF new_balance <> old_balance THEN
    INSERT INTO public.medicine_credit_ledger(user_id, delta, reason, balance_after, note)
      VALUES (p_user_id, new_balance - old_balance, 'admin', new_balance, left(p_note, 300));
  END IF;
  RETURN jsonb_build_object('previous_balance', old_balance, 'new_balance', new_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_medicine_credits_atomic(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_medicine_credits_atomic(uuid, text, integer, text) TO service_role;

-- Checkout settlement fills the balance the order was bought for. 11+ orders behave as before.
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
    IF purchase.platform = 'medicine' THEN
      SELECT credits INTO balance_after FROM public.medicine_credit_balances WHERE user_id = purchase.user_id;
    ELSE
      SELECT credits INTO balance_after FROM public.credits_balance WHERE user_id = purchase.user_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'alreadyProcessed', true, 'credits_added', 0,
      'balance', coalesce(balance_after, 0), 'platform', purchase.platform);
  END IF;
  IF purchase.status NOT IN ('pending', 'failed') THEN RAISE EXCEPTION 'Order cannot be settled'; END IF;
  IF purchase.platform = 'medicine' THEN
    INSERT INTO public.medicine_credit_balances AS b (user_id, credits)
      VALUES (purchase.user_id, purchase.credits_purchased)
      ON CONFLICT (user_id) DO UPDATE SET credits = b.credits + EXCLUDED.credits, updated_at = now()
      RETURNING credits INTO balance_after;
    INSERT INTO public.medicine_credit_ledger(user_id, delta, reason, balance_after, order_id)
      VALUES (purchase.user_id, purchase.credits_purchased, 'purchase', balance_after, purchase.id);
  ELSE
    INSERT INTO public.credits_balance AS b (user_id, credits)
      VALUES (purchase.user_id, purchase.credits_purchased)
      ON CONFLICT (user_id) DO UPDATE SET credits = b.credits + EXCLUDED.credits, updated_at = now()
      RETURNING credits INTO balance_after;
  END IF;
  UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = purchase.id;
  RETURN jsonb_build_object('ok', true, 'alreadyProcessed', false,
    'credits_added', purchase.credits_purchased, 'balance', balance_after, 'platform', purchase.platform);
END;
$$;
REVOKE ALL ON FUNCTION public.settle_checkout_payment(text, integer, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_checkout_payment(text, integer, text, uuid, integer) TO service_role;
