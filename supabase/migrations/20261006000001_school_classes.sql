-- Private 11+ classrooms. All cross-account reads pass through the scoped RPC below.
-- Existing interview, feedback, payment and Medicine policies are unchanged.
CREATE TABLE IF NOT EXISTS public.school_teachers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  school_name text NOT NULL CHECK (char_length(school_name) BETWEEN 2 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.school_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.school_teachers(user_id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  year_group text NOT NULL DEFAULT '' CHECK (char_length(year_group) <= 40),
  weekly_target integer NOT NULL DEFAULT 2 CHECK (weekly_target BETWEEN 1 AND 10),
  invite_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  invite_expires_at timestamptz NOT NULL DEFAULT now()+interval '14 days',
  invite_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.school_memberships (
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','left','removed','declined')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  consent_at timestamptz NOT NULL DEFAULT now(),
  consent_version text NOT NULL DEFAULT '11plus-after-approval-v1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(class_id,student_id),
  CHECK (status <> 'active' OR approved_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.school_interview_reviews (
  class_id uuid NOT NULL,
  student_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note)<=2000),
  reviewed_feedback_id uuid REFERENCES public.feedback(id) ON DELETE SET NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY(class_id,session_id),
  FOREIGN KEY(class_id,student_id) REFERENCES public.school_memberships(class_id,student_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS school_classes_teacher_idx ON public.school_classes(teacher_id,created_at DESC);
CREATE INDEX IF NOT EXISTS school_memberships_student_idx ON public.school_memberships(student_id,status);
CREATE INDEX IF NOT EXISTS school_interviews_user_created_idx ON public.interview_sessions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS school_feedback_reference_idx ON public.feedback(user_id,session_reference,created_at DESC);
ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_interview_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_teachers,public.school_classes,public.school_memberships,public.school_interview_reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.school_teachers,public.school_classes,public.school_memberships,public.school_interview_reviews TO service_role;

-- Internal helper. Scope is checked here as well as at the API boundary. No client execution grant.
CREATE OR REPLACE FUNCTION public.school_visible_interviews(p_class uuid,p_student uuid DEFAULT NULL)
RETURNS TABLE(id uuid,student_id uuid,interview_type text,session_reference text,started_at timestamptz,
  ended_at timestamptz,status text,minutes numeric,feedback_id uuid,score numeric,reviewed_at timestamptz,note text,note_version integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT s.id,s.user_id,s.interview_type,s.session_reference,s.started_at,s.ended_at,s.status,
   CASE WHEN s.status='completed' AND s.ended_at>=s.started_at
     THEN round(least(extract(epoch FROM s.ended_at-s.started_at)/60,90)::numeric,1) ELSE 0 END,
   f.id,CASE WHEN s.interview_type IN ('11-plus','11-plus-v2') AND f.total_score BETWEEN 0 AND 20
     AND f.personal_insight_score BETWEEN 0 AND 5 AND f.reasoning_score BETWEEN 0 AND 5
     AND f.extracurricular_score BETWEEN 0 AND 5 AND f.current_awareness_score BETWEEN 0 AND 5
     THEN f.total_score::numeric END,
   CASE WHEN n.reviewed_feedback_id=f.id AND n.reviewed_at>=f.created_at THEN n.reviewed_at END,
   coalesce(n.note,''),coalesce(n.version,0)
 FROM public.school_classes c JOIN public.school_memberships m ON m.class_id=c.id
 JOIN public.interview_sessions s ON s.user_id=m.student_id
 LEFT JOIN LATERAL (
   SELECT x.id,x.total_score,x.created_at,x.personal_insight_score,x.reasoning_score,x.extracurricular_score,x.current_awareness_score FROM public.feedback x
   WHERE x.user_id=s.user_id AND x.interview_type=s.interview_type
     AND (x.interview_session_id=s.id::text OR (x.interview_session_id IS NULL AND x.session_reference=s.session_reference))
     AND x.created_at<=now() ORDER BY x.created_at DESC,x.id DESC LIMIT 1
 ) f ON s.status='completed'
 LEFT JOIN public.school_interview_reviews n ON n.class_id=c.id AND n.session_id=s.id AND n.student_id=m.student_id
 WHERE c.id=p_class AND (p_student IS NULL OR m.student_id=p_student) AND m.status='active'
   AND (c.teacher_id=auth.uid() OR m.student_id=auth.uid())
   AND s.interview_type IN ('11-plus','11-plus-v2','maths-interview','logic-puzzles','verbal-interview','current-affairs-interview','chat-with-clara')
   AND s.created_at>=m.approved_at AND s.started_at>=m.approved_at AND s.started_at<=now()
   AND (c.archived_at IS NULL OR (s.started_at<c.archived_at AND s.ended_at<=c.archived_at))
$$;
CREATE OR REPLACE FUNCTION public.school_practice_stats(p_class uuid,p_student uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object(
   'completed',count(*) FILTER(WHERE status='completed'),
   'this_week',count(*) FILTER(WHERE status='completed' AND started_at>=date_trunc('week',now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'),
   'practice_days',count(DISTINCT (started_at AT TIME ZONE 'Europe/London')::date) FILTER(WHERE status='completed'),
   'minutes',coalesce(round(sum(minutes) FILTER(WHERE status='completed')),0),
   'last_practice',max(started_at) FILTER(WHERE status='completed'),
   'unreviewed',count(*) FILTER(WHERE feedback_id IS NOT NULL AND reviewed_at IS NULL),
   'average_score',round(avg(score) FILTER(WHERE interview_type IN ('11-plus','11-plus-v2') AND score BETWEEN 0 AND 20),1),
   'scored',count(*) FILTER(WHERE interview_type IN ('11-plus','11-plus-v2') AND score BETWEEN 0 AND 20)
 ) FROM public.school_visible_interviews(p_class,p_student)
$$;
REVOKE ALL ON FUNCTION public.school_visible_interviews(uuid,uuid),public.school_practice_stats(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.school_portal(p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  uid uuid:=auth.uid(); c public.school_classes; m public.school_memberships; t public.school_teachers;
  v_student uuid; v_session uuid; v_page integer:=1; v_expected integer; v_token text; v_name text;
  v_result jsonb; v_items jsonb; v_count integer; v_review public.school_interview_reviews;
  v_interview record;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=uid AND u.email_confirmed_at IS NOT NULL
   AND NOT coalesce(u.raw_app_meta_data ? 'mmi_guest_trial',false) AND NOT coalesce(u.is_anonymous,false)) THEN
   RAISE EXCEPTION 'Sign in with a verified personal or school account to use classes';
 END IF;
 IF p_action IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>12000 THEN
   RAISE EXCEPTION 'Invalid classroom request';
 END IF;
 IF p_action='setup_teacher' THEN
   IF p_payload->>'confirmed_teacher' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Confirm that you teach or support this class'; END IF;
   IF char_length(trim(coalesce(p_payload->>'name',''))) NOT BETWEEN 2 AND 80 OR char_length(trim(coalesce(p_payload->>'school',''))) NOT BETWEEN 2 AND 120 THEN
     RAISE EXCEPTION 'Enter your name and school or tuition organisation'; END IF;
   INSERT INTO public.school_teachers(user_id,display_name,school_name) VALUES(uid,trim(p_payload->>'name'),trim(p_payload->>'school'))
     ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,school_name=excluded.school_name RETURNING * INTO t;
   RETURN to_jsonb(t)-'user_id';
 ELSIF p_action='create_class' THEN
   SELECT * INTO t FROM public.school_teachers WHERE user_id=uid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Set up your teacher profile first'; END IF;
   IF (SELECT count(*) FROM public.school_classes WHERE teacher_id=uid AND archived_at IS NULL)>=25 THEN RAISE EXCEPTION 'You can have up to 25 active classes'; END IF;
   v_name:=trim(coalesce(p_payload->>'name',''));
   IF char_length(v_name) NOT BETWEEN 2 AND 80 OR char_length(coalesce(p_payload->>'year_group',''))>40
     OR coalesce(p_payload->>'weekly_target','2') !~ '^(10|[1-9])$' THEN RAISE EXCEPTION 'Enter a class name and a weekly target from 1 to 10'; END IF;
   INSERT INTO public.school_classes(teacher_id,name,year_group,weekly_target) VALUES(uid,v_name,trim(coalesce(p_payload->>'year_group','')),
     coalesce((p_payload->>'weekly_target')::integer,2)) RETURNING * INTO c;
   RETURN to_jsonb(c)-'teacher_id';
 ELSIF p_action='state' THEN
   SELECT * INTO t FROM public.school_teachers WHERE user_id=uid;
   SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_items FROM (
     SELECT cl.id,cl.name,cl.year_group,cl.weekly_target,cl.created_at,cl.archived_at,
       (SELECT count(*) FROM public.school_memberships mem WHERE mem.class_id=cl.id AND mem.status='active') AS students,
       (SELECT count(*) FROM public.school_memberships mem WHERE mem.class_id=cl.id AND mem.status='pending') AS pending,
       public.school_practice_stats(cl.id) AS stats
     FROM public.school_classes cl WHERE cl.teacher_id=uid
   ) x;
   v_result:=jsonb_build_object('teacher',CASE WHEN t.user_id IS NULL THEN NULL ELSE to_jsonb(t)-'user_id' END,'classes',v_items);
   SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.requested_at DESC),'[]'::jsonb) INTO v_items FROM (
     SELECT cl.id,cl.name,cl.year_group,cl.weekly_target,cl.archived_at,teach.display_name AS teacher_name,teach.school_name,
       mem.status,mem.display_name,mem.approved_at,mem.requested_at,public.school_practice_stats(cl.id,uid) AS stats,
       (SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.reviewed_at DESC),'[]'::jsonb) FROM (
         SELECT v.id AS session_id,v.interview_type,v.started_at,v.note,v.reviewed_at
         FROM public.school_visible_interviews(cl.id,uid) v WHERE v.note<>'' ORDER BY v.reviewed_at DESC NULLS LAST,v.started_at DESC LIMIT 10
       ) n) AS teacher_notes
     FROM public.school_memberships mem JOIN public.school_classes cl ON cl.id=mem.class_id
     JOIN public.school_teachers teach ON teach.user_id=cl.teacher_id WHERE mem.student_id=uid
   ) x;
   RETURN v_result||jsonb_build_object('memberships',v_items);
 ELSIF p_action IN ('preview_invite','join_class') THEN
   v_token:=p_payload->>'token';
   IF v_token IS NULL OR v_token !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'This class invitation is not available'; END IF;
   SELECT * INTO c FROM public.school_classes WHERE invite_token=v_token FOR UPDATE;
   IF NOT FOUND OR NOT c.invite_enabled OR c.archived_at IS NOT NULL OR c.invite_expires_at<=now() THEN RAISE EXCEPTION 'This class invitation is not available'; END IF;
   SELECT * INTO t FROM public.school_teachers WHERE user_id=c.teacher_id;
   IF c.teacher_id=uid THEN RAISE EXCEPTION 'This is your class invitation. Share it with your students'; END IF;
   SELECT * INTO m FROM public.school_memberships WHERE class_id=c.id AND student_id=uid;
   IF p_action='preview_invite' THEN RETURN jsonb_build_object('id',c.id,'name',c.name,'year_group',c.year_group,'teacher_name',t.display_name,
     'school_name',t.school_name,'weekly_target',c.weekly_target,'status',m.status); END IF;
   v_name:=trim(coalesce(p_payload->>'name',''));
   IF char_length(v_name) NOT BETWEEN 2 AND 80 OR p_payload->>'consent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Enter the pupil name and confirm what will be shared'; END IF;
   IF m.status IN ('active','pending') THEN RETURN jsonb_build_object('id',c.id,'status',m.status); END IF;
   IF m.status IN ('removed','declined') THEN RAISE EXCEPTION 'Contact your teacher before joining this class again'; END IF;
   IF (SELECT count(*) FROM public.school_memberships WHERE class_id=c.id AND status IN ('pending','active'))>=200 THEN RAISE EXCEPTION 'This class is full. Contact your teacher'; END IF;
   -- Serialize joins for one pupil across different classes as well as capacity within a class.
   PERFORM id FROM auth.users WHERE id=uid FOR UPDATE;
   IF (SELECT count(*) FROM public.school_memberships WHERE student_id=uid AND status IN ('pending','active'))>=10 THEN RAISE EXCEPTION 'You can join up to ten classes'; END IF;
   INSERT INTO public.school_memberships(class_id,student_id,display_name) VALUES(c.id,uid,v_name)
     ON CONFLICT(class_id,student_id) DO UPDATE SET display_name=excluded.display_name,status='pending',approved_at=NULL,
       requested_at=now(),consent_at=now(),consent_version='11plus-after-approval-v1',updated_at=now();
   RETURN jsonb_build_object('id',c.id,'status','pending');
 ELSIF p_action='leave_class' THEN
   SELECT * INTO c FROM public.school_classes WHERE id=(p_payload->>'class_id')::uuid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;
   UPDATE public.school_memberships SET status='left',updated_at=now() WHERE class_id=c.id AND student_id=uid AND status IN ('pending','active');
   RETURN jsonb_build_object('left',true);
 END IF;

 -- Every remaining route is teacher-only and verifies ownership before any student lookup.
 IF p_action NOT IN ('class','student','feedback','review','update_class','invite','membership') THEN RAISE EXCEPTION 'Unknown classroom action'; END IF;
 SELECT * INTO c FROM public.school_classes WHERE id=(p_payload->>'class_id')::uuid AND teacher_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;
 IF p_action IN ('update_class','invite','membership','review') THEN
   SELECT * INTO c FROM public.school_classes WHERE id=c.id AND teacher_id=uid FOR UPDATE;
   IF c.archived_at IS NOT NULL AND NOT(p_action='membership' AND p_payload->>'decision'='remove') THEN RAISE EXCEPTION 'Archived classes are read-only'; END IF;
 END IF;
 IF p_action='update_class' THEN
   IF p_payload->>'archive'='true' THEN
     UPDATE public.school_classes SET archived_at=now(),invite_enabled=false WHERE id=c.id RETURNING * INTO c;
   ELSE
     v_name:=trim(coalesce(p_payload->>'name',''));
     IF char_length(v_name) NOT BETWEEN 2 AND 80 OR char_length(coalesce(p_payload->>'year_group',''))>40
       OR coalesce(p_payload->>'weekly_target','') !~ '^(10|[1-9])$' THEN RAISE EXCEPTION 'Enter a class name and a weekly target from 1 to 10'; END IF;
     UPDATE public.school_classes SET name=v_name,year_group=trim(coalesce(p_payload->>'year_group','')),weekly_target=(p_payload->>'weekly_target')::integer WHERE id=c.id RETURNING * INTO c;
   END IF;
   RETURN to_jsonb(c)-'teacher_id';
 ELSIF p_action='invite' THEN
   IF p_payload->>'decision'='rotate' THEN UPDATE public.school_classes SET invite_token=replace(gen_random_uuid()::text,'-',''),invite_enabled=true,invite_expires_at=now()+interval '14 days' WHERE id=c.id RETURNING * INTO c;
   ELSIF p_payload->>'decision'='close' THEN UPDATE public.school_classes SET invite_enabled=false WHERE id=c.id RETURNING * INTO c;
   ELSE RAISE EXCEPTION 'Choose a new link or close invitations'; END IF;
   RETURN to_jsonb(c)-'teacher_id';
 ELSIF p_action='membership' THEN
   v_student:=(p_payload->>'student_id')::uuid;
   SELECT * INTO m FROM public.school_memberships WHERE class_id=c.id AND student_id=v_student FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Join request not found'; END IF;
   IF p_payload->>'decision'='approve' AND m.status='pending' THEN
     UPDATE public.school_memberships SET status='active',approved_at=now(),updated_at=now() WHERE class_id=c.id AND student_id=v_student;
   ELSIF p_payload->>'decision'='decline' AND m.status='pending' THEN
     UPDATE public.school_memberships SET status='declined',updated_at=now() WHERE class_id=c.id AND student_id=v_student;
   ELSIF p_payload->>'decision'='remove' AND m.status IN ('active','pending') THEN
     UPDATE public.school_memberships SET status='removed',updated_at=now() WHERE class_id=c.id AND student_id=v_student;
   ELSIF p_payload->>'decision'='allow_rejoin' AND m.status IN ('removed','declined') THEN
     UPDATE public.school_memberships SET status='left',approved_at=NULL,updated_at=now() WHERE class_id=c.id AND student_id=v_student;
   ELSE RAISE EXCEPTION 'This membership has changed. Refresh the class'; END IF;
   RETURN jsonb_build_object('saved',true);
 ELSIF p_action='class' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY CASE x.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,lower(x.display_name),x.student_id),'[]'::jsonb) INTO v_items FROM (
     SELECT mem.student_id,mem.display_name,mem.status,mem.requested_at,mem.approved_at,
       CASE WHEN mem.status='active' THEN public.school_practice_stats(c.id,mem.student_id) ELSE NULL END AS stats
     FROM public.school_memberships mem WHERE mem.class_id=c.id
   ) x;
   RETURN jsonb_build_object('class',to_jsonb(c)-'teacher_id','students',v_items,'stats',public.school_practice_stats(c.id));
 END IF;

 v_student:=(p_payload->>'student_id')::uuid;
 SELECT * INTO m FROM public.school_memberships WHERE class_id=c.id AND student_id=v_student AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Student is not sharing with this class'; END IF;
 IF p_action='student' THEN
   IF coalesce(p_payload->>'page','1') !~ '^[1-9][0-9]{0,4}$' THEN RAISE EXCEPTION 'Invalid page'; END IF;
   v_page:=coalesce((p_payload->>'page')::integer,1);
   SELECT count(*) INTO v_count FROM public.school_visible_interviews(c.id,v_student);
   SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.started_at DESC,x.id DESC),'[]'::jsonb) INTO v_items FROM (
     SELECT * FROM public.school_visible_interviews(c.id,v_student) ORDER BY started_at DESC,id DESC LIMIT 20 OFFSET (v_page-1)*20
   ) x;
   RETURN jsonb_build_object('student',jsonb_build_object('id',m.student_id,'name',m.display_name,'approved_at',m.approved_at),
     'stats',public.school_practice_stats(c.id,v_student),'interviews',v_items,'total',v_count,'page',v_page);
 END IF;
 v_session:=(p_payload->>'session_id')::uuid;
 SELECT * INTO v_interview FROM public.school_visible_interviews(c.id,v_student) WHERE id=v_session;
 IF NOT FOUND THEN RAISE EXCEPTION 'Interview not available to this class'; END IF;
 IF p_action='review' THEN
   IF v_interview.status<>'completed' OR v_interview.feedback_id IS NULL THEN RAISE EXCEPTION 'Wait until interview feedback is available'; END IF;
   IF char_length(coalesce(p_payload->>'note',''))>2000 OR coalesce(p_payload->>'expected_version','0') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'Invalid teacher feedback'; END IF;
   v_expected:=coalesce((p_payload->>'expected_version')::integer,0);
   IF v_interview.note_version<>v_expected THEN RAISE EXCEPTION 'Teacher feedback changed in another tab. Reload it before saving'; END IF;
   INSERT INTO public.school_interview_reviews(class_id,student_id,session_id,teacher_id,note,reviewed_feedback_id)
     VALUES(c.id,v_student,v_session,uid,trim(coalesce(p_payload->>'note','')),v_interview.feedback_id)
     ON CONFLICT(class_id,session_id) DO UPDATE SET note=excluded.note,reviewed_feedback_id=excluded.reviewed_feedback_id,reviewed_at=now(),version=school_interview_reviews.version+1
     RETURNING * INTO v_review;
   RETURN jsonb_build_object('version',v_review.version,'note',v_review.note,'reviewed_at',v_review.reviewed_at);
 END IF;
 IF v_interview.feedback_id IS NULL THEN RETURN jsonb_build_object('feedback',NULL); END IF;
 SELECT jsonb_build_object('id',f.id,'created_at',f.created_at,'interview_type',f.interview_type,'total_score',f.total_score,
   'personal_insight_score',f.personal_insight_score,'reasoning_score',f.reasoning_score,'extracurricular_score',f.extracurricular_score,'current_awareness_score',f.current_awareness_score,
   'pattern_recognition_score',f.pattern_recognition_score,'logical_deduction_score',f.logical_deduction_score,'mathematical_logic_score',f.mathematical_logic_score,'clarity_of_thought_score',f.clarity_of_thought_score,
   'detailed_feedback',f.detailed_feedback,'transcription',f.transcription,'annotations',f.annotations,
   'questions_review',to_jsonb(f)->'questions_review','overall_improvement_feedback',f.overall_improvement_feedback)
 INTO v_result FROM public.feedback f WHERE f.id=v_interview.feedback_id AND f.user_id=v_student;
 RETURN jsonb_build_object('feedback',v_result,'note',v_interview.note,'note_version',v_interview.note_version,'reviewed_at',v_interview.reviewed_at);
END;
$$;
REVOKE ALL ON FUNCTION public.school_portal(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_portal(text,jsonb) TO authenticated;
