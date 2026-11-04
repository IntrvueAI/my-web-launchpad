-- Creator codes for existing accounts, and a lookup that doesn't count a visit.
--
-- attach_referral: any account can use a creator's link or code until its first purchase on that
-- platform (it was new accounts only, so links silently did nothing for existing free accounts).
-- Commissions still only count purchases made after the code was added. Using the same link
-- again succeeds instead of reporting "already referred", and results say which platform the
-- code is for so the page can explain where it applies.
--
-- lookup_referral_link: what record_referral_visit returns, without counting. Used when a link is
-- handed over to the other product's domain, which would otherwise count the same click twice,
-- and by the code page, where typing a code isn't a visit.

CREATE OR REPLACE FUNCTION public.attach_referral(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid(); v_link public.creator_links%ROWTYPE; v_creator public.creators%ROWTYPE;
  v_existing public.referrals%ROWTYPE; v_discount integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_link FROM public.creator_links WHERE code = lower(btrim(coalesce(p_code, '')));
  IF NOT FOUND OR NOT v_link.active THEN RETURN jsonb_build_object('attached', false, 'reason', 'unavailable'); END IF;
  SELECT * INTO v_creator FROM public.creators WHERE id = v_link.creator_id;
  IF v_creator.status <> 'active' THEN RETURN jsonb_build_object('attached', false, 'reason', 'unavailable'); END IF;
  v_discount := CASE WHEN v_link.discount_enabled THEN v_link.discount_percent ELSE 0 END;
  SELECT * INTO v_existing FROM public.referrals WHERE user_id = v_user;
  IF FOUND THEN
    IF v_existing.link_id = v_link.id THEN
      RETURN jsonb_build_object('attached', true, 'already', true, 'creator', v_creator.name,
        'platform', v_link.platform, 'discountPercent', v_discount);
    END IF;
    RETURN jsonb_build_object('attached', false, 'reason', 'already_referred',
      'creator', (SELECT name FROM public.creators WHERE id = v_existing.creator_id));
  END IF;
  IF v_creator.user_id = v_user THEN RETURN jsonb_build_object('attached', false, 'reason', 'own_link'); END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_user AND status = 'paid' AND platform = v_link.platform) THEN
    RETURN jsonb_build_object('attached', false, 'reason', 'existing_customer', 'platform', v_link.platform);
  END IF;
  INSERT INTO public.referrals (user_id, link_id, creator_id, platform)
    VALUES (v_user, v_link.id, v_creator.id, v_link.platform) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('attached', true, 'creator', v_creator.name, 'platform', v_link.platform, 'discountPercent', v_discount);
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_referral_link(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_link public.creator_links%ROWTYPE; v_creator public.creators%ROWTYPE;
BEGIN
  IF p_code IS NULL OR char_length(p_code) > 24 THEN RETURN NULL; END IF;
  SELECT * INTO v_link FROM public.creator_links WHERE code = lower(btrim(p_code));
  IF NOT FOUND OR NOT v_link.active THEN RETURN NULL; END IF;
  SELECT * INTO v_creator FROM public.creators WHERE id = v_link.creator_id;
  IF v_creator.status <> 'active' THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('code', v_link.code, 'platform', v_link.platform, 'creator', v_creator.name,
    'discountPercent', CASE WHEN v_link.discount_enabled THEN v_link.discount_percent ELSE 0 END);
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_referral_link(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_referral_link(text) TO anon, authenticated;
