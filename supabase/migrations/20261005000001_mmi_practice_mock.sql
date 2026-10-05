-- Add the general MMI mock to the existing guest policy without changing trial allowances.
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
    'medicine-mmi-practice','medicine-mmi','medicine-mmi-manchester','medicine-ethics-practice','medicine-roleplay-practice',
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
    IF NEW.interview_type NOT IN ('medicine-mmi-practice','medicine-mmi','medicine-mmi-manchester','medicine-ethics-practice',
      'medicine-roleplay-practice','medicine-motivation-practice','medicine-data-practice',
      'medicine-oxford-pilot','medicine-cambridge-pilot','medicine-imperial-pilot')
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
REVOKE ALL ON FUNCTION public.authorize_mmi_guest_run(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_mmi_guest_run(uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.guard_mmi_guest_session() FROM PUBLIC,anon,authenticated;
