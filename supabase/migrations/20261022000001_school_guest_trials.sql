-- 11+ beta invitations reuse the private guest-trial system. Each invitation now records its
-- product; every existing invitation is Medicine and keeps its rules. Guests may only start the
-- interviews of their invitation's product, checked here on the server.
ALTER TABLE public.mmi_trial_invites ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'medicine';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mmi_trial_invites_product_check') THEN
    ALTER TABLE public.mmi_trial_invites ADD CONSTRAINT mmi_trial_invites_product_check
      CHECK (product IN ('medicine', '11plus'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS mmi_trial_owner_product_idx ON public.mmi_trial_invites(owner_id, product, created_at DESC);

CREATE OR REPLACE FUNCTION public.mmi_guest_interview_types(p_product text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE p_product
    WHEN '11plus' THEN ARRAY['11-plus','maths-interview','logic-puzzles','current-affairs-interview']
    ELSE ARRAY['medicine-mmi-practice','medicine-mmi','medicine-mmi-manchester','medicine-ethics-practice',
      'medicine-roleplay-practice','medicine-motivation-practice','medicine-data-practice',
      'medicine-oxford-pilot','medicine-cambridge-pilot','medicine-imperial-pilot']
  END
$$;
REVOKE ALL ON FUNCTION public.mmi_guest_interview_types(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.authorize_mmi_guest_run(p_user_id uuid, p_session_id uuid, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_trial public.mmi_guest_trials; v_invite public.mmi_trial_invites;
  v_session public.interview_sessions; v_run public.mmi_guest_runs; v_count integer;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('token','brain','feedback') THEN RAISE EXCEPTION 'Unsupported trial operation'; END IF;
  SELECT * INTO v_trial FROM public.mmi_guest_trials WHERE guest_user_id=p_user_id FOR UPDATE;
  IF NOT FOUND OR v_trial.expires_at <= now() THEN RAISE EXCEPTION 'Your guest trial has expired'; END IF;
  SELECT * INTO v_invite FROM public.mmi_trial_invites WHERE id=v_trial.invite_id;
  IF NOT FOUND OR v_invite.revoked_at IS NOT NULL OR v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'This trial invitation has been closed';
  END IF;
  IF p_kind <> 'feedback' AND (v_trial.review_required_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.mmi_trial_reviews WHERE trial_id=v_trial.id)) THEN
    RAISE EXCEPTION 'Please finish your trial feedback';
  END IF;
  SELECT * INTO v_session FROM public.interview_sessions WHERE id=p_session_id AND user_id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'An owned trial interview is required'; END IF;
  IF NOT (v_session.interview_type = ANY(public.mmi_guest_interview_types(v_invite.product))) THEN
    IF v_invite.product = '11plus' THEN RAISE EXCEPTION 'This invitation covers 11+ interviews only'; END IF;
    RAISE EXCEPTION 'This invitation covers Medicine interviews only';
  END IF;
  IF p_kind <> 'feedback' AND v_session.status <> 'active' THEN RAISE EXCEPTION 'This trial interview has ended'; END IF;
  IF v_session.created_at < now()-interval '2 hours' THEN RAISE EXCEPTION 'This interview is too old to resume'; END IF;
  SELECT * INTO v_run FROM public.mmi_guest_runs WHERE session_id=p_session_id;
  IF NOT FOUND THEN
    IF p_kind='feedback' THEN RAISE EXCEPTION 'Start an interview before requesting feedback'; END IF;
    -- Keep the allowance consumed even if a guest deletes their own auth account
    -- (which cascades its interview rows). Deleting data must not reset paid usage.
    IF v_trial.interviews_started >= v_invite.max_interviews THEN RAISE EXCEPTION 'You have used the interviews included in this trial'; END IF;
    INSERT INTO public.mmi_guest_runs(trial_id,session_id) VALUES(v_trial.id,p_session_id) RETURNING * INTO v_run;
    UPDATE public.mmi_guest_trials SET interviews_started=interviews_started+1 WHERE id=v_trial.id;
  END IF;
  IF v_run.trial_id <> v_trial.id THEN RAISE EXCEPTION 'Trial interview ownership mismatch'; END IF;
  IF p_kind='token' THEN
    IF v_run.token_requests >= 3 THEN RAISE EXCEPTION 'This interview has reached its connection retry limit'; END IF;
    UPDATE public.mmi_guest_runs SET token_requests=token_requests+1 WHERE session_id=p_session_id;
  ELSIF p_kind='brain' THEN
    IF v_run.brain_requests >= 120 THEN RAISE EXCEPTION 'This interview has reached its conversation limit'; END IF;
    UPDATE public.mmi_guest_runs SET brain_requests=brain_requests+1 WHERE session_id=p_session_id;
  ELSE
    IF v_run.feedback_requests >= 5 THEN RAISE EXCEPTION 'This interview has reached its feedback retry limit'; END IF;
    UPDATE public.mmi_guest_runs SET feedback_requests=feedback_requests+1 WHERE session_id=p_session_id;
  END IF;
  RETURN jsonb_build_object('trial_id',v_trial.id,'interview_type',v_session.interview_type,
    'expires_at',v_trial.expires_at,'product',v_invite.product);
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_mmi_guest_run(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_mmi_guest_run(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_mmi_guest_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_trial public.mmi_guest_trials; v_invite public.mmi_trial_invites;
BEGIN
  IF NOT coalesce((auth.jwt()->'app_metadata') ? 'mmi_guest_trial',false) THEN RETURN NEW; END IF;
  SELECT * INTO v_trial FROM public.mmi_guest_trials WHERE guest_user_id=auth.uid();
  IF NOT FOUND OR NEW.user_id <> auth.uid() THEN RAISE EXCEPTION 'Guest session ownership required'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT * INTO v_invite FROM public.mmi_trial_invites WHERE id=v_trial.invite_id;
    IF v_trial.expires_at <= now() OR v_invite.expires_at <= now() OR v_invite.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Your guest trial has expired';
    END IF;
    IF NOT (NEW.interview_type = ANY(public.mmi_guest_interview_types(v_invite.product)))
      OR NEW.status <> 'active' OR NEW.engine_state IS NOT NULL OR coalesce(NEW.engine_revision,0) <> 0
    THEN RAISE EXCEPTION 'Invalid guest interview'; END IF;
    NEW.created_at := now(); NEW.started_at := now(); NEW.last_activity_at := now(); NEW.ended_at := NULL;
  ELSE
    IF (to_jsonb(NEW) - ARRAY['status','ended_at','last_activity_at','session_metadata','error_logs','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','ended_at','last_activity_at','session_metadata','error_logs','updated_at'])
      OR (OLD.status <> 'active' AND NEW.status='active') THEN
      RAISE EXCEPTION 'Guest interview state is managed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_mmi_guest_session() FROM PUBLIC,anon,authenticated;

-- The guest pages read their product from the trial status to show the right brand and catalogue.
CREATE OR REPLACE FUNCTION public.get_mmi_guest_trial_status(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.mmi_guest_trials; i public.mmi_trial_invites; r public.mmi_trial_reviews;
  remaining integer; access_closed boolean; phase text;
BEGIN
  SELECT * INTO t FROM public.mmi_guest_trials WHERE guest_user_id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest trial not found'; END IF;
  SELECT * INTO i FROM public.mmi_trial_invites WHERE id=t.invite_id;
  SELECT * INTO r FROM public.mmi_trial_reviews WHERE trial_id=t.id;
  remaining := greatest(0,i.max_interviews-t.interviews_started);
  access_closed := i.revoked_at IS NOT NULL OR least(i.expires_at,t.expires_at)<=now();
  phase := CASE WHEN r.trial_id IS NOT NULL THEN 'complete'
    WHEN t.review_required_at IS NOT NULL OR remaining=0 OR access_closed THEN 'review'
    ELSE 'practice' END;
  RETURN jsonb_build_object('trialId',t.id,'name',t.display_name,
    'expiresAt',least(i.expires_at,t.expires_at),'remaining',remaining,'maxInterviews',i.max_interviews,
    'interviewsStarted',t.interviews_started,'phase',phase,'accessClosed',access_closed,
    'product',i.product,
    'review',CASE WHEN r.trial_id IS NULL THEN NULL ELSE to_jsonb(r) END);
END;
$$;
REVOKE ALL ON FUNCTION public.get_mmi_guest_trial_status(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_mmi_guest_trial_status(uuid) TO service_role;

-- The founder inbox can show one product's testers. Replaced rather than overloaded so a named
-- call stays unambiguous; p_product defaults to every product for the current server code.
DROP FUNCTION IF EXISTS public.get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer);
CREATE OR REPLACE FUNCTION public.get_mmi_feedback_inbox(
  p_owner_id uuid,
  p_search text DEFAULT '',
  p_review text DEFAULT 'all',
  p_interview_type text DEFAULT '',
  p_invite_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_product text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF p_owner_id IS NULL OR p_page IS NULL OR p_page < 1 OR p_page > 100000
    OR p_review IS NULL OR p_review NOT IN ('all','reviewed','waiting','issues')
    OR p_search IS NULL OR char_length(p_search) > 100
    OR p_interview_type IS NULL OR char_length(p_interview_type) > 80
    OR (p_product IS NOT NULL AND p_product NOT IN ('medicine','11plus')) THEN
    RAISE EXCEPTION 'Invalid feedback filter';
  END IF;
  RETURN (
    WITH owned AS MATERIALIZED (
      SELECT t.id, t.guest_user_id, t.display_name, t.created_at,
        t.interviews_started, i.id AS invite_id, i.label AS invite_label, i.product
      FROM mmi_guest_trials t JOIN mmi_trial_invites i ON i.id=t.invite_id
      WHERE i.owner_id=p_owner_id AND (p_invite_id IS NULL OR i.id=p_invite_id)
        AND (p_product IS NULL OR i.product=p_product)
    ), latest_feedback AS MATERIALIZED (
      -- Assessment retries replace the displayed assessment, not the interview count.
      SELECT DISTINCT ON (o.id, coalesce(nullif(f.session_reference,''),f.id::text))
        o.id AS trial_id, f.id, f.session_reference, f.interview_type,
        f.total_score, f.created_at, left(f.detailed_feedback->>'overall',500) AS overview
      FROM owned o JOIN feedback f ON f.user_id=o.guest_user_id
      WHERE (o.product='medicine' AND f.interview_type LIKE 'medicine-%')
         OR (o.product='11plus' AND f.interview_type = ANY(public.mmi_guest_interview_types('11plus')))
      ORDER BY o.id, coalesce(nullif(f.session_reference,''),f.id::text), f.created_at DESC, f.id DESC
    ), interviews AS MATERIALIZED (
      SELECT o.id AS trial_id, s.id::text AS id, f.id AS feedback_id,
        s.interview_type, s.started_at AS created_at, s.status,
        f.total_score, f.overview
      FROM owned o JOIN mmi_guest_runs r ON r.trial_id=o.id
      JOIN interview_sessions s ON s.id=r.session_id AND s.user_id=o.guest_user_id
      LEFT JOIN latest_feedback f ON f.trial_id=o.id AND f.session_reference=s.session_reference
      UNION ALL
      -- Preserve older saved assessments even if their session was removed.
      SELECT f.trial_id, f.id::text, f.id, f.interview_type, f.created_at,
        'completed', f.total_score, f.overview
      FROM latest_feedback f WHERE NOT EXISTS (
        SELECT 1 FROM mmi_guest_runs r JOIN interview_sessions s ON s.id=r.session_id
        JOIN owned o ON o.id=r.trial_id AND s.user_id=o.guest_user_id
        WHERE r.trial_id=f.trial_id AND s.session_reference=f.session_reference
      )
    ), rows AS MATERIALIZED (
      SELECT o.id, o.display_name, o.created_at, o.interviews_started,
        o.invite_id, o.invite_label, o.product,
        CASE WHEN v.trial_id IS NOT NULL THEN jsonb_build_object(
          'trial_id',v.trial_id,'rating',v.rating,'experience',v.experience,
          'improvement',v.improvement,'created_at',v.created_at) END AS review,
        v.experience, v.rating,
        coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id',x.id,'feedback_id',x.feedback_id,'interview_type',x.interview_type,
          'created_at',x.created_at,'status',x.status,'total_score',x.total_score,
          'overview',x.overview) ORDER BY x.created_at DESC,x.id DESC)
          FROM interviews x WHERE x.trial_id=o.id),'[]'::jsonb) AS interviews,
        greatest(o.created_at,v.created_at,(SELECT max(x.created_at)
          FROM interviews x WHERE x.trial_id=o.id)) AS updated_at
      FROM owned o LEFT JOIN mmi_trial_reviews v ON v.trial_id=o.id
    ), matched AS MATERIALIZED (
      SELECT * FROM rows o
      WHERE (p_search='' OR strpos(lower(o.display_name||' '||o.invite_label),lower(btrim(p_search)))>0)
        AND (p_review='all' OR (p_review='reviewed' AND o.review IS NOT NULL)
          OR (p_review='waiting' AND o.review IS NULL)
          OR (p_review='issues' AND o.experience IN ('some-issues','could-not-complete')))
        AND (p_interview_type='' OR EXISTS (SELECT 1 FROM interviews x
          WHERE x.trial_id=o.id AND x.interview_type=p_interview_type))
    ), paged AS (
      SELECT * FROM matched ORDER BY updated_at DESC,id DESC LIMIT 20 OFFSET (p_page-1)*20
    )
    SELECT jsonb_build_object(
      'total',(SELECT count(*) FROM matched),'page',p_page,'pageSize',20,
      'summary',jsonb_build_object(
        'testers',(SELECT count(*) FROM owned),
        'assessments',(SELECT count(*) FROM interviews WHERE feedback_id IS NOT NULL),
        'reviews',(SELECT count(*) FROM rows WHERE review IS NOT NULL),
        'issues',(SELECT count(*) FROM rows WHERE experience IN ('some-issues','could-not-complete')),
        'averageRating',(SELECT round(avg(rating),1) FROM rows)),
      'trials',coalesce((SELECT jsonb_agg(to_jsonb(p)-'experience'-'rating'
        ORDER BY p.updated_at DESC,p.id DESC) FROM paged p),'[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer,text) TO service_role;
