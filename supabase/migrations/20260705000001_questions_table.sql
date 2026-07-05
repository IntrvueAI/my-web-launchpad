-- The interview question bank, moved from bundled JSON into the database so it can be edited from
-- the admin Questions page. The interview-brain reads from here (service role, bypasses RLS);
-- admins do full CRUD; nobody else has access (answers/guidance must not leak to students).
CREATE TABLE IF NOT EXISTS public.questions (
  id text PRIMARY KEY,                 -- keep existing ids (e.g. MA-A1, LG-C2, CA-A1)
  subject text NOT NULL,               -- maths | logic | currentaffairs
  topic text NOT NULL,                 -- strand id (e.g. numerical-reasoning)
  question_type text,                  -- category label (e.g. "Numerical Reasoning")
  difficulty int NOT NULL DEFAULT 3,   -- star level 1–5 (1 = easiest)
  title text,
  question text NOT NULL,
  answer text,
  explanation text,
  model_reasoning_path text,
  rubric jsonb,                        -- { strong, developing, weak, finalAnswerNote? }
  common_mistakes jsonb,               -- [{ mistake, reveals }]
  live_probes jsonb,                   -- [{ probe, goodResponse }]
  hints jsonb,                         -- [ "hint 1", "hint 2", "hint 3" ]
  options jsonb,                       -- reserved for MCQ (question-of-the-day)
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_subject_active_idx ON public.questions (subject, active);
CREATE INDEX IF NOT EXISTS questions_topic_idx ON public.questions (topic);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Admins only (the brain uses the service role, which bypasses RLS).
CREATE POLICY "Admins read questions"   ON public.questions FOR SELECT USING (public.is_current_user_admin());
CREATE POLICY "Admins insert questions" ON public.questions FOR INSERT WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins update questions" ON public.questions FOR UPDATE USING (public.is_current_user_admin());
CREATE POLICY "Admins delete questions" ON public.questions FOR DELETE USING (public.is_current_user_admin());

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_questions_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS questions_updated_at ON public.questions;
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_questions_updated_at();
