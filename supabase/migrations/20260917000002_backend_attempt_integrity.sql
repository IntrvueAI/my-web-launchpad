-- Preserve existing history when a feedback retry fails halfway through rebuilding attempts.
CREATE OR REPLACE FUNCTION public.replace_session_question_attempts(p_user_id uuid, p_session_reference text, p_attempts jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM id FROM public.interview_sessions WHERE user_id = p_user_id AND session_reference = p_session_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF jsonb_typeof(p_attempts) IS DISTINCT FROM 'array' OR jsonb_array_length(p_attempts) > 300 THEN
    RAISE EXCEPTION 'Invalid question attempts';
  END IF;
  DELETE FROM public.question_attempts WHERE user_id = p_user_id AND session_reference = p_session_reference;
  INSERT INTO public.question_attempts(user_id, session_reference, interview_type, subject, topic, difficulty,
    question_id, question, outcome, band, skipped, hints_used, student_answer, question_index)
  SELECT p_user_id, p_session_reference, a.interview_type, a.subject, a.topic, a.difficulty,
    a.question_id, a.question, a.outcome, a.band, coalesce(a.skipped,false), coalesce(a.hints_used,0), a.student_answer, a.question_index
  FROM jsonb_to_recordset(p_attempts) AS a(interview_type text, subject text, topic text, difficulty text,
    question_id text, question text, outcome text, band text, skipped boolean, hints_used integer, student_answer text, question_index integer);
END;
$$;
REVOKE ALL ON FUNCTION public.replace_session_question_attempts(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_session_question_attempts(uuid,text,jsonb) TO service_role;
