-- Editorial decisions are separate from live interview content. Approval never publishes a question.
CREATE TABLE IF NOT EXISTS public.interview_question_reviews (
  batch_id text NOT NULL,
  question_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','changes_requested','rejected')),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 4000),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id,question_id)
);
CREATE TABLE IF NOT EXISTS public.interview_question_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  question_id text NOT NULL,
  content_hash text NOT NULL,
  status text NOT NULL,
  notes text NOT NULL,
  revision integer NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (batch_id,question_id) REFERENCES public.interview_question_reviews(batch_id,question_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS question_review_events_lookup ON public.interview_question_review_events(batch_id,question_id,created_at DESC);
ALTER TABLE public.interview_question_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_question_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interview_question_reviews, public.interview_question_review_events FROM anon,authenticated;
GRANT SELECT ON public.interview_question_reviews, public.interview_question_review_events TO authenticated;
GRANT ALL ON public.interview_question_reviews, public.interview_question_review_events TO service_role;
DROP POLICY IF EXISTS question_reviews_admin_read ON public.interview_question_reviews;
CREATE POLICY question_reviews_admin_read ON public.interview_question_reviews FOR SELECT TO authenticated USING (public.is_current_user_admin());
DROP POLICY IF EXISTS question_review_events_admin_read ON public.interview_question_review_events;
CREATE POLICY question_review_events_admin_read ON public.interview_question_review_events FOR SELECT TO authenticated USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.save_interview_question_review(
  p_batch_id text, p_question_id text, p_content_hash text, p_status text,
  p_notes text, p_expected_revision integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE saved public.interview_question_reviews;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_current_user_admin(),false) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_batch_id IS NULL OR p_batch_id !~ '^[a-zA-Z0-9_-]{1,100}$'
    OR p_question_id IS NULL OR p_question_id !~ '^[a-zA-Z0-9_-]{1,100}$'
    OR p_content_hash IS NULL OR p_content_hash !~ '^[a-f0-9]{64}$'
    OR p_status IS NULL OR p_status NOT IN ('pending','approved','changes_requested','rejected')
    OR p_notes IS NULL OR length(p_notes) > 4000
    OR p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'Invalid review' USING ERRCODE = '22023';
  END IF;
  IF p_status IN ('changes_requested','rejected') AND length(btrim(p_notes)) = 0 THEN
    RAISE EXCEPTION 'Add a reason for this decision' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.interview_question_reviews(batch_id,question_id,content_hash)
    VALUES(p_batch_id,p_question_id,p_content_hash) ON CONFLICT DO NOTHING;
  SELECT * INTO saved FROM public.interview_question_reviews
    WHERE batch_id=p_batch_id AND question_id=p_question_id FOR UPDATE;
  IF saved.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'This review changed elsewhere. Reload it before saving.' USING ERRCODE = '40001';
  END IF;
  UPDATE public.interview_question_reviews SET content_hash=p_content_hash,status=p_status,
    notes=btrim(p_notes),revision=revision+1,reviewer_id=auth.uid(),updated_at=clock_timestamp()
    WHERE batch_id=p_batch_id AND question_id=p_question_id RETURNING * INTO saved;
  INSERT INTO public.interview_question_review_events(batch_id,question_id,content_hash,status,notes,revision,reviewer_id)
    VALUES(saved.batch_id,saved.question_id,saved.content_hash,saved.status,saved.notes,saved.revision,saved.reviewer_id);
  RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.save_interview_question_review(text,text,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_interview_question_review(text,text,text,text,text,integer) TO authenticated;
