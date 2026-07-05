-- Question of the Day: a dated multiple-choice question with per-option reasoning (why each option
-- is right or wrong). Authored from the admin "Daily Q" tab; shown on the student Questions page.
CREATE TABLE IF NOT EXISTS public.daily_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_date date NOT NULL UNIQUE,     -- the day this question is "live" (latest published one shows)
  subject text,                         -- maths | logic | currentaffairs | general
  title text,
  question text NOT NULL,
  -- [{ key:'A', text, correct:boolean, reasoning }]  (reasoning = why right / why wrong)
  options jsonb NOT NULL DEFAULT '[]',
  explanation text,                     -- optional overall takeaway
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;

-- Anyone (logged-in students) can read a question once its date has arrived; unpublished/future ones stay hidden.
CREATE POLICY "Read published daily questions" ON public.daily_questions
  FOR SELECT USING (active_date <= current_date);
-- Admins author/schedule them.
CREATE POLICY "Admins manage daily questions" ON public.daily_questions
  FOR ALL USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP TRIGGER IF EXISTS daily_questions_updated_at ON public.daily_questions;
CREATE TRIGGER daily_questions_updated_at BEFORE UPDATE ON public.daily_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_questions_updated_at();
