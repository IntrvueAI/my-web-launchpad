-- Private founder-sponsored trials. Guests are distinct, unprivileged auth users.
-- Existing accounts, balances, history and permissive RLS policies remain intact.
CREATE TABLE IF NOT EXISTS public.mmi_trial_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
  expires_at timestamptz NOT NULL,
  max_guests integer NOT NULL DEFAULT 10 CHECK (max_guests BETWEEN 1 AND 50),
  max_interviews integer NOT NULL DEFAULT 12 CHECK (max_interviews BETWEEN 1 AND 12),
  guest_hours integer NOT NULL DEFAULT 6 CHECK (guest_hours BETWEEN 1 AND 24),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mmi_guest_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.mmi_trial_invites(id) ON DELETE CASCADE,
  guest_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  client_nonce uuid NOT NULL,
  notice_version text NOT NULL DEFAULT '2026-10-01',
  interviews_started integer NOT NULL DEFAULT 0 CHECK (interviews_started BETWEEN 0 AND 12),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, client_nonce)
);
CREATE TABLE IF NOT EXISTS public.mmi_guest_runs (
  trial_id uuid NOT NULL REFERENCES public.mmi_guest_trials(id) ON DELETE CASCADE,
  session_id uuid PRIMARY KEY REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  token_requests integer NOT NULL DEFAULT 0,
  brain_requests integer NOT NULL DEFAULT 0,
  feedback_requests integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mmi_trial_owner_idx ON public.mmi_trial_invites(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mmi_guest_invite_idx ON public.mmi_guest_trials(invite_id);
CREATE INDEX IF NOT EXISTS mmi_guest_run_trial_idx ON public.mmi_guest_runs(trial_id);
ALTER TABLE public.mmi_trial_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmi_guest_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmi_guest_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mmi_trial_invites, public.mmi_guest_trials, public.mmi_guest_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.mmi_trial_invites, public.mmi_guest_trials, public.mmi_guest_runs TO service_role;

-- The edge function verifies the signed invitation before calling this service-only RPC.
-- Locking the invitation makes the admission cap safe under concurrent redemptions.
CREATE OR REPLACE FUNCTION public.reserve_mmi_guest_trial(p_invite_id uuid, p_display_name text, p_client_nonce uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_invite public.mmi_trial_invites; v_trial public.mmi_guest_trials; v_count integer;
BEGIN
  IF p_display_name IS NULL OR char_length(btrim(p_display_name)) NOT BETWEEN 2 AND 80 OR p_client_nonce IS NULL THEN
    RAISE EXCEPTION 'Please enter your name';
  END IF;
  SELECT * INTO v_invite FROM public.mmi_trial_invites WHERE id=p_invite_id FOR UPDATE;
  IF NOT FOUND OR v_invite.revoked_at IS NOT NULL OR v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'This trial invitation has expired or been closed';
  END IF;
  SELECT * INTO v_trial FROM public.mmi_guest_trials WHERE invite_id=p_invite_id AND client_nonce=p_client_nonce;
  IF FOUND THEN
    IF v_trial.display_name <> btrim(p_display_name) OR v_trial.expires_at <= now() THEN
      RAISE EXCEPTION 'This trial attempt cannot be resumed';
    END IF;
    RETURN to_jsonb(v_trial);
  END IF;
  SELECT count(*) INTO v_count FROM public.mmi_guest_trials WHERE invite_id=p_invite_id;
  IF v_count >= v_invite.max_guests THEN RAISE EXCEPTION 'This invitation has reached its guest limit'; END IF;
  INSERT INTO public.mmi_guest_trials(invite_id,display_name,client_nonce,expires_at)
    VALUES(p_invite_id,btrim(p_display_name),p_client_nonce,least(v_invite.expires_at,now()+make_interval(hours=>v_invite.guest_hours)))
    RETURNING * INTO v_trial;
  RETURN to_jsonb(v_trial);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_mmi_guest_trial(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_mmi_guest_trial(uuid,text,uuid) TO service_role;

-- Every costly guest request is checked against a real owned session and live invitation.
-- No app-supplied owner, user role, interview type or limit is trusted.
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

-- Guests may read their own results through existing policies; only the server writes feedback.
-- A forged client row must never be presented to the founder as generated trial feedback.
DROP POLICY IF EXISTS "Guest feedback insert restriction" ON public.feedback;
CREATE POLICY "Guest feedback insert restriction" ON public.feedback AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT coalesce((auth.jwt()->'app_metadata') ? 'mmi_guest_trial',false));
DROP POLICY IF EXISTS "Guest feedback update restriction" ON public.feedback;
CREATE POLICY "Guest feedback update restriction" ON public.feedback AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT coalesce((auth.jwt()->'app_metadata') ? 'mmi_guest_trial',false));
DROP POLICY IF EXISTS "Guest feedback delete restriction" ON public.feedback;
CREATE POLICY "Guest feedback delete restriction" ON public.feedback AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT coalesce((auth.jwt()->'app_metadata') ? 'mmi_guest_trial',false));

-- Guest browsers can create an attempt, send heartbeats and end it. The interview
-- brain alone may change its authoritative state, type, ownership and timestamps.
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
    IF NEW.interview_type NOT IN ('medicine-mmi','medicine-mmi-manchester','medicine-ethics-practice',
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
REVOKE ALL ON FUNCTION public.guard_mmi_guest_session() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_mmi_guest_session ON public.interview_sessions;
CREATE TRIGGER guard_mmi_guest_session BEFORE INSERT OR UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_mmi_guest_session();
