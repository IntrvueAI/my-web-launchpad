-- Creator programme: referral links, first-purchase discounts, commissions and Stripe payouts.
--
-- A creator is a person (matched to an account by email); each creator has one or more links,
-- one platform per link, each with its own discount and commission terms. Creators never see who
-- bought: they read totals and anonymous activity through creator_dashboard() only. Discounts are
-- applied by create-payment and commissions are recorded inside the payment settlement, so neither
-- depends on the browser. Earnings wait 30 days before an administrator can pay them out.

CREATE TABLE IF NOT EXISTS public.creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL CHECK (char_length(email) <= 320 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'paused')),
  stripe_account_id text UNIQUE CHECK (stripe_account_id IS NULL OR stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  payout_status text NOT NULL DEFAULT 'not_connected' CHECK (payout_status IN ('not_connected', 'pending', 'verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS creators_email_unique ON public.creators (lower(email));

CREATE TABLE IF NOT EXISTS public.creator_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (char_length(code) BETWEEN 3 AND 24 AND code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  platform text NOT NULL CHECK (platform IN ('medicine', '11plus')),
  label text CHECK (label IS NULL OR char_length(label) <= 60),
  active boolean NOT NULL DEFAULT true,
  discount_enabled boolean NOT NULL DEFAULT true,
  discount_percent integer NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 0 AND 50),
  commission_type text NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed')),
  commission_percent integer NOT NULL DEFAULT 20 CHECK (commission_percent BETWEEN 0 AND 50),
  commission_fixed_pence integer NOT NULL DEFAULT 0 CHECK (commission_fixed_pence BETWEEN 0 AND 10000),
  commission_scope text NOT NULL DEFAULT 'first_purchase' CHECK (commission_scope IN ('first_purchase', 'twelve_months')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_links_creator ON public.creator_links (creator_id);

CREATE TABLE IF NOT EXISTS public.referral_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.creator_links(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_visits_link ON public.referral_visits (link_id, created_at);

-- First link wins: one referral per account, never changed afterwards.
CREATE TABLE IF NOT EXISTS public.referrals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id uuid NOT NULL REFERENCES public.creator_links(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE RESTRICT,
  platform text NOT NULL CHECK (platform IN ('medicine', '11plus')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_link ON public.referrals (link_id);

CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE RESTRICT,
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'paid', 'failed')),
  stripe_transfer_id text UNIQUE,
  failure_reason text CHECK (failure_reason IS NULL OR char_length(failure_reason) <= 300),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_payouts_one_in_flight ON public.creator_payouts (creator_id) WHERE status = 'processing';

CREATE TABLE IF NOT EXISTS public.creator_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE RESTRICT,
  link_id uuid NOT NULL REFERENCES public.creator_links(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('medicine', '11plus')),
  list_price_pence integer NOT NULL CHECK (list_price_pence >= 0),
  discount_pence integer NOT NULL DEFAULT 0 CHECK (discount_pence >= 0),
  amount_paid_pence integer NOT NULL CHECK (amount_paid_pence >= 0),
  credits integer NOT NULL CHECK (credits > 0),
  commission_pence integer NOT NULL CHECK (commission_pence >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'reversed')),
  available_at timestamptz NOT NULL,
  payout_id uuid REFERENCES public.creator_payouts(id) ON DELETE SET NULL,
  reversed_reason text CHECK (reversed_reason IS NULL OR char_length(reversed_reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_commissions_creator ON public.creator_commissions (creator_id, created_at DESC);

-- What a sale costs us, set by administrators, for the margin view. Estimates, not invoices.
CREATE TABLE IF NOT EXISTS public.programme_costs (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  stripe_percent_bp integer NOT NULL DEFAULT 150 CHECK (stripe_percent_bp BETWEEN 0 AND 1000),
  stripe_fixed_pence integer NOT NULL DEFAULT 20 CHECK (stripe_fixed_pence BETWEEN 0 AND 200),
  medicine_cost_per_credit_pence integer NOT NULL DEFAULT 0 CHECK (medicine_cost_per_credit_pence BETWEEN 0 AND 10000),
  school_cost_per_credit_pence integer NOT NULL DEFAULT 0 CHECK (school_cost_per_credit_pence BETWEEN 0 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.programme_costs (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_creator_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS touch_creators ON public.creators;
CREATE TRIGGER touch_creators BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.touch_creator_row();
DROP TRIGGER IF EXISTS touch_creator_links ON public.creator_links;
CREATE TRIGGER touch_creator_links BEFORE UPDATE ON public.creator_links FOR EACH ROW EXECUTE FUNCTION public.touch_creator_row();
DROP TRIGGER IF EXISTS touch_creator_commissions ON public.creator_commissions;
CREATE TRIGGER touch_creator_commissions BEFORE UPDATE ON public.creator_commissions FOR EACH ROW EXECUTE FUNCTION public.touch_creator_row();

-- Row-level security: administrators manage creators, links and costs; creators read their own
-- profile, links and payouts; everything else is read through the functions below.
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage creators" ON public.creators;
CREATE POLICY "Admins manage creators" ON public.creators FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Creators read themselves" ON public.creators;
CREATE POLICY "Creators read themselves" ON public.creators FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage creator links" ON public.creator_links;
CREATE POLICY "Admins manage creator links" ON public.creator_links FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Creators read their links" ON public.creator_links;
CREATE POLICY "Creators read their links" ON public.creator_links FOR SELECT TO authenticated
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins read referral visits" ON public.referral_visits;
CREATE POLICY "Admins read referral visits" ON public.referral_visits FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Admins read referrals" ON public.referrals;
CREATE POLICY "Admins read referrals" ON public.referrals FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Admins read commissions" ON public.creator_commissions;
CREATE POLICY "Admins read commissions" ON public.creator_commissions FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins read payouts" ON public.creator_payouts;
CREATE POLICY "Admins read payouts" ON public.creator_payouts FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "Creators read their payouts" ON public.creator_payouts;
CREATE POLICY "Creators read their payouts" ON public.creator_payouts FOR SELECT TO authenticated
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage programme costs" ON public.programme_costs;
CREATE POLICY "Admins manage programme costs" ON public.programme_costs FOR ALL TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

REVOKE ALL ON public.creators, public.creator_links, public.referral_visits, public.referrals,
  public.creator_payouts, public.creator_commissions, public.programme_costs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creators, public.creator_links TO authenticated;
GRANT SELECT, UPDATE ON public.programme_costs TO authenticated;
GRANT SELECT ON public.referral_visits, public.referrals, public.creator_payouts, public.creator_commissions TO authenticated;
GRANT ALL ON public.creators, public.creator_links, public.referral_visits, public.referrals,
  public.creator_payouts, public.creator_commissions, public.programme_costs TO service_role;

-- A visit to /r/<code>: counted without storing anything about the visitor.
CREATE OR REPLACE FUNCTION public.record_referral_visit(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_link public.creator_links%ROWTYPE; v_creator public.creators%ROWTYPE;
BEGIN
  IF p_code IS NULL OR char_length(p_code) > 24 THEN RETURN NULL; END IF;
  SELECT * INTO v_link FROM public.creator_links WHERE code = lower(btrim(p_code));
  IF NOT FOUND OR NOT v_link.active THEN RETURN NULL; END IF;
  SELECT * INTO v_creator FROM public.creators WHERE id = v_link.creator_id;
  IF v_creator.status <> 'active' THEN RETURN NULL; END IF;
  INSERT INTO public.referral_visits (link_id) VALUES (v_link.id);
  RETURN jsonb_build_object('code', v_link.code, 'platform', v_link.platform, 'creator', v_creator.name,
    'discountPercent', CASE WHEN v_link.discount_enabled THEN v_link.discount_percent ELSE 0 END);
END;
$$;

-- The discount a user's first purchase on a platform would get, if any.
CREATE OR REPLACE FUNCTION public.referral_offer_for(p_user_id uuid, p_platform text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_link public.creator_links%ROWTYPE; v_creator public.creators%ROWTYPE;
BEGIN
  SELECT l.* INTO v_link FROM public.referrals r JOIN public.creator_links l ON l.id = r.link_id
    WHERE r.user_id = p_user_id AND l.platform = p_platform;
  IF NOT FOUND OR NOT v_link.active OR NOT v_link.discount_enabled OR v_link.discount_percent = 0 THEN RETURN NULL; END IF;
  SELECT * INTO v_creator FROM public.creators WHERE id = v_link.creator_id;
  IF v_creator.status <> 'active' THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = p_user_id AND status = 'paid' AND platform = p_platform) THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('linkId', v_link.id, 'creator', v_creator.name, 'discountPercent', v_link.discount_percent);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_offer(p_platform text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL
    ELSE public.referral_offer_for(auth.uid(), p_platform) - 'linkId' END;
$$;

-- Attach a referral to a new account: once, never to the creator's own account, and only for
-- accounts under 30 days old that have not bought on that platform.
CREATE OR REPLACE FUNCTION public.attach_referral(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_link public.creator_links%ROWTYPE; v_creator public.creators%ROWTYPE; v_joined timestamptz;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('attached', false, 'reason', 'already_referred');
  END IF;
  SELECT * INTO v_link FROM public.creator_links WHERE code = lower(btrim(coalesce(p_code, '')));
  IF NOT FOUND OR NOT v_link.active THEN RETURN jsonb_build_object('attached', false, 'reason', 'unavailable'); END IF;
  SELECT * INTO v_creator FROM public.creators WHERE id = v_link.creator_id;
  IF v_creator.status <> 'active' THEN RETURN jsonb_build_object('attached', false, 'reason', 'unavailable'); END IF;
  IF v_creator.user_id = v_user THEN RETURN jsonb_build_object('attached', false, 'reason', 'own_link'); END IF;
  SELECT created_at INTO v_joined FROM auth.users WHERE id = v_user;
  IF v_joined IS NULL OR v_joined < now() - interval '30 days' THEN
    RETURN jsonb_build_object('attached', false, 'reason', 'existing_account');
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_user AND status = 'paid' AND platform = v_link.platform) THEN
    RETURN jsonb_build_object('attached', false, 'reason', 'existing_customer');
  END IF;
  INSERT INTO public.referrals (user_id, link_id, creator_id, platform)
    VALUES (v_user, v_link.id, v_creator.id, v_link.platform) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('attached', true, 'creator', v_creator.name,
    'discountPercent', CASE WHEN v_link.discount_enabled THEN v_link.discount_percent ELSE 0 END);
END;
$$;

-- An invited creator signs in with the invited, confirmed email and becomes active.
CREATE OR REPLACE FUNCTION public.claim_creator_account()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_email text; v_confirmed timestamptz; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM public.creators WHERE user_id = v_user;
  IF FOUND THEN RETURN v_id; END IF;
  SELECT email, email_confirmed_at INTO v_email, v_confirmed FROM auth.users WHERE id = v_user;
  IF v_email IS NULL OR v_confirmed IS NULL THEN RETURN NULL; END IF;
  UPDATE public.creators SET user_id = v_user, status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
    WHERE user_id IS NULL AND lower(email) = lower(v_email) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Everything a creator sees: totals and anonymous activity, never who bought.
CREATE OR REPLACE FUNCTION public.creator_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_creator public.creators%ROWTYPE;
BEGIN
  SELECT * INTO v_creator FROM public.creators WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'creator', jsonb_build_object('id', v_creator.id, 'name', v_creator.name, 'status', v_creator.status,
      'payoutStatus', v_creator.payout_status, 'stripeConnected', v_creator.stripe_account_id IS NOT NULL),
    'links', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'code', l.code, 'platform', l.platform, 'label', l.label, 'active', l.active,
        'discountEnabled', l.discount_enabled, 'discountPercent', l.discount_percent,
        'commissionType', l.commission_type, 'commissionPercent', l.commission_percent,
        'commissionFixedPence', l.commission_fixed_pence, 'commissionScope', l.commission_scope,
        'visits', (SELECT count(*) FROM public.referral_visits v WHERE v.link_id = l.id),
        'signups', (SELECT count(*) FROM public.referrals r WHERE r.link_id = l.id),
        'payingCustomers', (SELECT count(DISTINCT r.user_id) FROM public.referrals r
          JOIN public.orders o ON o.user_id = r.user_id AND o.status = 'paid' AND o.platform = l.platform AND o.created_at >= r.created_at
          WHERE r.link_id = l.id),
        'earnedPence', (SELECT coalesce(sum(c.commission_pence), 0) FROM public.creator_commissions c WHERE c.link_id = l.id AND c.status <> 'reversed'))
        ORDER BY l.created_at) FROM public.creator_links l WHERE l.creator_id = v_creator.id), '[]'::jsonb),
    'earnings', jsonb_build_object(
      'holdPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions WHERE creator_id = v_creator.id AND status = 'pending' AND available_at > now()),
      'readyPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions WHERE creator_id = v_creator.id AND status = 'pending' AND available_at <= now()),
      'paidPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions WHERE creator_id = v_creator.id AND status = 'paid')),
    'recent', coalesce((SELECT jsonb_agg(x ORDER BY x->>'date' DESC) FROM (
        SELECT jsonb_build_object('date', c.created_at, 'platform', c.platform, 'credits', c.credits,
          'amountPaidPence', c.amount_paid_pence, 'commissionPence', c.commission_pence,
          'status', CASE WHEN c.status = 'pending' AND c.available_at > now() THEN 'hold'
                         WHEN c.status = 'pending' THEN 'ready' ELSE c.status END,
          'availableAt', c.available_at) AS x
        FROM public.creator_commissions c WHERE c.creator_id = v_creator.id ORDER BY c.created_at DESC LIMIT 25) recent), '[]'::jsonb),
    'payouts', coalesce((SELECT jsonb_agg(jsonb_build_object('date', p.created_at, 'amountPence', p.amount_pence, 'status', p.status, 'paidAt', p.paid_at)
        ORDER BY p.created_at DESC) FROM public.creator_payouts p WHERE p.creator_id = v_creator.id), '[]'::jsonb));
END;
$$;

-- Administrators: every creator and link with traffic, revenue, credits sold and allocations.
CREATE OR REPLACE FUNCTION public.admin_creator_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  RETURN jsonb_build_object(
    'costs', (SELECT to_jsonb(pc) - 'id' - 'updated_by' FROM public.programme_costs pc WHERE pc.id),
    'links', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'linkId', l.id, 'creatorId', l.creator_id,
      'visits', (SELECT count(*) FROM public.referral_visits v WHERE v.link_id = l.id),
      'signups', (SELECT count(*) FROM public.referrals r WHERE r.link_id = l.id),
      'payingCustomers', s.customers, 'orders', s.orders, 'revenuePence', s.revenue, 'credits', s.credits, 'discountPence', s.discount,
      'holdPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions c WHERE c.link_id = l.id AND c.status = 'pending' AND c.available_at > now()),
      'readyPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions c WHERE c.link_id = l.id AND c.status = 'pending' AND c.available_at <= now()),
      'paidPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions c WHERE c.link_id = l.id AND c.status = 'paid'),
      'reversedPence', (SELECT coalesce(sum(commission_pence), 0) FROM public.creator_commissions c WHERE c.link_id = l.id AND c.status = 'reversed')))
      FROM public.creator_links l
      CROSS JOIN LATERAL (
        SELECT count(DISTINCT o.user_id) AS customers, count(o.id) AS orders, coalesce(sum(o.amount), 0) AS revenue,
          coalesce(sum(o.credits_purchased), 0) AS credits,
          coalesce(sum(CASE WHEN (o.metadata->>'discount_pence') ~ '^[0-9]+$' THEN (o.metadata->>'discount_pence')::integer ELSE 0 END), 0) AS discount
        FROM public.referrals r JOIN public.orders o ON o.user_id = r.user_id AND o.status = 'paid'
          AND o.platform = l.platform AND o.created_at >= r.created_at
        WHERE r.link_id = l.id) s), '[]'::jsonb),
    'recent', coalesce((SELECT jsonb_agg(x ORDER BY x->>'date' DESC) FROM (
      SELECT jsonb_build_object('id', c.id, 'date', c.created_at, 'creatorId', c.creator_id, 'linkId', c.link_id, 'platform', c.platform,
        'credits', c.credits, 'listPricePence', c.list_price_pence, 'discountPence', c.discount_pence,
        'amountPaidPence', c.amount_paid_pence, 'commissionPence', c.commission_pence, 'status', c.status,
        'availableAt', c.available_at, 'reversedReason', c.reversed_reason) AS x
      FROM public.creator_commissions c ORDER BY c.created_at DESC LIMIT 50) recent), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_creator_commission(p_commission_id uuid, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  UPDATE public.creator_commissions SET status = 'reversed', reversed_reason = btrim(p_reason)
    WHERE id = p_commission_id AND status = 'pending' AND payout_id IS NULL;
  RETURN FOUND;
END;
$$;

-- Called inside settlement. Earns only on paid orders on the link's platform, after the referral,
-- for an active creator who is not the buyer, within the link's scope.
CREATE OR REPLACE FUNCTION public.record_creator_commission(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_order public.orders%ROWTYPE; v_ref public.referrals%ROWTYPE;
  v_link public.creator_links%ROWTYPE; v_creator public.creators%ROWTYPE;
  v_list integer; v_discount integer; v_commission integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.status <> 'paid' THEN RETURN; END IF;
  SELECT * INTO v_ref FROM public.referrals WHERE user_id = v_order.user_id;
  IF NOT FOUND OR v_ref.created_at > v_order.created_at THEN RETURN; END IF;
  SELECT * INTO v_link FROM public.creator_links WHERE id = v_ref.link_id;
  SELECT * INTO v_creator FROM public.creators WHERE id = v_link.creator_id;
  IF v_link.platform <> v_order.platform OR NOT v_link.active OR v_creator.status <> 'active'
    OR v_creator.user_id IS NOT DISTINCT FROM v_order.user_id THEN RETURN; END IF;
  IF v_link.commission_scope = 'first_purchase' AND EXISTS (
    SELECT 1 FROM public.creator_commissions WHERE creator_id = v_creator.id AND referred_user_id = v_order.user_id) THEN RETURN; END IF;
  IF v_link.commission_scope = 'twelve_months' AND v_ref.created_at < now() - interval '12 months' THEN RETURN; END IF;
  v_discount := CASE WHEN (v_order.metadata->>'discount_pence') ~ '^[0-9]+$' THEN (v_order.metadata->>'discount_pence')::integer ELSE 0 END;
  v_list := v_order.amount + v_discount;
  v_commission := CASE WHEN v_link.commission_type = 'percent' THEN round(v_order.amount * v_link.commission_percent / 100.0)::integer
                       ELSE least(v_link.commission_fixed_pence, v_order.amount) END;
  IF v_commission <= 0 THEN RETURN; END IF;
  INSERT INTO public.creator_commissions (creator_id, link_id, order_id, referred_user_id, platform, list_price_pence,
    discount_pence, amount_paid_pence, credits, commission_pence, available_at)
  VALUES (v_creator.id, v_link.id, v_order.id, v_order.user_id, v_order.platform, v_list, v_discount, v_order.amount,
    v_order.credits_purchased, v_commission, now() + interval '30 days')
  ON CONFLICT (order_id) DO NOTHING;
END;
$$;

-- Payouts: reserve the creator's ready earnings under one in-flight payout (resumed if one exists),
-- then record the Stripe transfer's outcome. The transfer uses the payout id as its idempotency key.
CREATE OR REPLACE FUNCTION public.begin_creator_payout(p_creator_id uuid, p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_creator public.creators%ROWTYPE; v_payout public.creator_payouts%ROWTYPE; v_amount integer;
BEGIN
  SELECT * INTO v_creator FROM public.creators WHERE id = p_creator_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Creator not found'; END IF;
  IF v_creator.stripe_account_id IS NULL OR v_creator.payout_status <> 'verified' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payouts_not_ready');
  END IF;
  SELECT * INTO v_payout FROM public.creator_payouts WHERE creator_id = p_creator_id AND status = 'processing';
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'resumed', true, 'payoutId', v_payout.id, 'amountPence', v_payout.amount_pence,
      'destination', v_creator.stripe_account_id);
  END IF;
  SELECT coalesce(sum(commission_pence), 0) INTO v_amount FROM public.creator_commissions
    WHERE creator_id = p_creator_id AND status = 'pending' AND available_at <= now() AND payout_id IS NULL;
  IF v_amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'nothing_ready'); END IF;
  INSERT INTO public.creator_payouts (creator_id, amount_pence, created_by) VALUES (p_creator_id, v_amount, p_admin_id) RETURNING * INTO v_payout;
  UPDATE public.creator_commissions SET payout_id = v_payout.id
    WHERE creator_id = p_creator_id AND status = 'pending' AND available_at <= now() AND payout_id IS NULL;
  RETURN jsonb_build_object('ok', true, 'resumed', false, 'payoutId', v_payout.id, 'amountPence', v_amount,
    'destination', v_creator.stripe_account_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_creator_payout(p_payout_id uuid, p_transfer_id text, p_failure text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_failure IS NULL THEN
    UPDATE public.creator_payouts SET status = 'paid', stripe_transfer_id = p_transfer_id, paid_at = now()
      WHERE id = p_payout_id AND status = 'processing';
    UPDATE public.creator_commissions SET status = 'paid' WHERE payout_id = p_payout_id AND status = 'pending';
  ELSE
    UPDATE public.creator_payouts SET status = 'failed', failure_reason = left(p_failure, 300)
      WHERE id = p_payout_id AND status = 'processing';
    UPDATE public.creator_commissions SET payout_id = NULL WHERE payout_id = p_payout_id AND status = 'pending';
  END IF;
END;
$$;

-- Checkout settlement, as in 20261022000003, plus the creator commission in the same transaction.
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
  PERFORM public.record_creator_commission(purchase.id);
  RETURN jsonb_build_object('ok', true, 'alreadyProcessed', false,
    'credits_added', purchase.credits_purchased, 'balance', balance_after, 'platform', purchase.platform);
END;
$$;

REVOKE ALL ON FUNCTION public.record_referral_visit(text), public.referral_offer_for(uuid, text),
  public.get_my_referral_offer(text), public.attach_referral(text), public.claim_creator_account(),
  public.creator_dashboard(), public.admin_creator_overview(), public.reverse_creator_commission(uuid, text),
  public.record_creator_commission(uuid), public.begin_creator_payout(uuid, uuid),
  public.finish_creator_payout(uuid, text, text), public.touch_creator_row(),
  public.settle_checkout_payment(text, integer, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_visit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_offer(text), public.attach_referral(text), public.claim_creator_account(),
  public.creator_dashboard(), public.admin_creator_overview(), public.reverse_creator_commission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.referral_offer_for(uuid, text), public.begin_creator_payout(uuid, uuid),
  public.finish_creator_payout(uuid, text, text), public.settle_checkout_payment(text, integer, text, uuid, integer) TO service_role;
