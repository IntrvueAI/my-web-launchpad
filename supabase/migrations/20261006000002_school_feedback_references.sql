-- Feedback writes use the public session reference as their text interview_session_id.
-- Resolve canonical references within the same pupil and interview type.
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
     AND (x.session_reference=s.session_reference OR (x.session_reference IS NULL AND x.interview_session_id IN (s.id::text,s.session_reference)))
     AND x.created_at<=now() ORDER BY x.created_at DESC,x.id DESC LIMIT 1
 ) f ON s.status='completed'
 LEFT JOIN public.school_interview_reviews n ON n.class_id=c.id AND n.session_id=s.id AND n.student_id=m.student_id
 WHERE c.id=p_class AND (p_student IS NULL OR m.student_id=p_student) AND m.status='active'
   AND (c.teacher_id=auth.uid() OR m.student_id=auth.uid())
   AND s.interview_type IN ('11-plus','11-plus-v2','maths-interview','logic-puzzles','verbal-interview','current-affairs-interview','chat-with-clara')
   AND s.created_at>=m.approved_at AND s.started_at>=m.approved_at AND s.started_at<=now()
   AND (c.archived_at IS NULL OR (s.started_at<c.archived_at AND s.ended_at<=c.archived_at))
$$;
