-- New beta invitations admit one guest and include exactly two interview attempts.
-- Existing signed invitations remain readable; their original allowances are retained.
ALTER TABLE public.mmi_trial_invites ADD COLUMN IF NOT EXISTS link_code text UNIQUE
  CHECK (link_code IS NULL OR link_code ~ '^[A-Za-z0-9_-]{22}$');
ALTER TABLE public.mmi_trial_invites ALTER COLUMN max_guests SET DEFAULT 1;
ALTER TABLE public.mmi_trial_invites ALTER COLUMN max_interviews SET DEFAULT 2;
ALTER TABLE public.mmi_trial_invites DROP CONSTRAINT IF EXISTS mmi_beta_link_limits;
ALTER TABLE public.mmi_trial_invites ADD CONSTRAINT mmi_beta_link_limits
  CHECK (link_code IS NULL OR (max_guests=1 AND max_interviews=2));
ALTER TABLE public.mmi_guest_trials ADD COLUMN IF NOT EXISTS review_required_at timestamptz;
CREATE TABLE IF NOT EXISTS public.mmi_trial_reviews (
  trial_id uuid PRIMARY KEY REFERENCES public.mmi_guest_trials(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  experience text NOT NULL CHECK (experience IN ('smooth','some-issues','could-not-complete')),
  improvement text NOT NULL CHECK (char_length(btrim(improvement)) BETWEEN 5 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mmi_trial_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mmi_trial_reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.mmi_trial_reviews TO service_role;

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
  IF v_session.interview_type NOT IN (
    'medicine-mmi','medicine-mmi-manchester','medicine-ethics-practice','medicine-roleplay-practice',
    'medicine-motivation-practice','medicine-data-practice','medicine-oxford-pilot',
    'medicine-cambridge-pilot','medicine-imperial-pilot'
  ) THEN RAISE EXCEPTION 'This invitation covers Medicine interviews only'; END IF;
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
  RETURN jsonb_build_object('trial_id',v_trial.id,'interview_type',v_session.interview_type,'expires_at',v_trial.expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_mmi_guest_run(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_mmi_guest_run(uuid,uuid,text) TO service_role;


-- This server read model survives reloads and is also used after the trial expires.
-- A guest may still send product feedback after expiry or host revocation.
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
    'review',CASE WHEN r.trial_id IS NULL THEN NULL ELSE to_jsonb(r) END);
END;
$$;
REVOKE ALL ON FUNCTION public.get_mmi_guest_trial_status(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_mmi_guest_trial_status(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.request_mmi_trial_review(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.mmi_guest_trials;
BEGIN
  SELECT * INTO t FROM public.mmi_guest_trials WHERE guest_user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest trial not found'; END IF;
  UPDATE public.mmi_guest_trials SET review_required_at=coalesce(review_required_at,now()) WHERE id=t.id;
  UPDATE public.interview_sessions s SET status='completed',ended_at=coalesce(s.ended_at,now())
    WHERE s.user_id=p_user_id AND s.status='active'
      AND EXISTS(SELECT 1 FROM public.mmi_guest_runs g WHERE g.trial_id=t.id AND g.session_id=s.id);
  RETURN public.get_mmi_guest_trial_status(p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.request_mmi_trial_review(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_mmi_trial_review(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_mmi_trial_review(p_user_id uuid,p_rating integer,p_experience text,p_improvement text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5
    OR p_experience IS NULL OR p_experience NOT IN ('smooth','some-issues','could-not-complete')
    OR p_improvement IS NULL OR char_length(btrim(p_improvement)) NOT BETWEEN 5 AND 1500 THEN
    RAISE EXCEPTION 'Please complete the short feedback form';
  END IF;
  -- The same row lock as interview admission prevents a start racing trial completion.
  PERFORM public.request_mmi_trial_review(p_user_id);
  INSERT INTO public.mmi_trial_reviews(trial_id,rating,experience,improvement)
    SELECT id,p_rating,p_experience,btrim(p_improvement) FROM public.mmi_guest_trials WHERE guest_user_id=p_user_id
    ON CONFLICT(trial_id) DO NOTHING;
  RETURN public.get_mmi_guest_trial_status(p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_mmi_trial_review(uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mmi_trial_review(uuid,integer,text,text) TO service_role;
