-- Interview Lab: founder drafts of Clara's behaviour and notes on test interviews.
-- Administrators only. Real interviews never read these tables.
CREATE TABLE IF NOT EXISTS public.interview_lab_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  platform text NOT NULL CHECK (platform IN ('medicine', '11plus')),
  base_version text NOT NULL CHECK (char_length(base_version) BETWEEN 1 AND 40),
  behaviour jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(behaviour) = 'object'),
  opening_line text CHECK (opening_line IS NULL OR char_length(opening_line) <= 600),
  closing_line text CHECK (closing_line IS NULL OR char_length(closing_line) <= 600),
  extra_instructions text CHECK (extra_instructions IS NULL OR char_length(extra_instructions) <= 2000),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_lab_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_reference text NOT NULL CHECK (char_length(session_reference) BETWEEN 1 AND 100),
  interview_type text NOT NULL CHECK (char_length(interview_type) BETWEEN 1 AND 80),
  version text NOT NULL CHECK (char_length(version) BETWEEN 1 AND 40),
  draft_id uuid REFERENCES public.interview_lab_drafts(id) ON DELETE SET NULL,
  rating integer CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, session_reference)
);
CREATE INDEX IF NOT EXISTS interview_lab_notes_version_idx ON public.interview_lab_notes(version, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_interview_lab_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS touch_interview_lab_drafts ON public.interview_lab_drafts;
CREATE TRIGGER touch_interview_lab_drafts BEFORE UPDATE ON public.interview_lab_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_interview_lab_row();
DROP TRIGGER IF EXISTS touch_interview_lab_notes ON public.interview_lab_notes;
CREATE TRIGGER touch_interview_lab_notes BEFORE UPDATE ON public.interview_lab_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_interview_lab_row();

ALTER TABLE public.interview_lab_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_lab_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interview_lab_drafts, public.interview_lab_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_lab_drafts, public.interview_lab_notes TO authenticated;
GRANT ALL ON public.interview_lab_drafts, public.interview_lab_notes TO service_role;

-- Administrators share drafts and notes; each row records who created it.
DROP POLICY IF EXISTS "Admins manage lab drafts" ON public.interview_lab_drafts;
CREATE POLICY "Admins manage lab drafts" ON public.interview_lab_drafts FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin() AND owner_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage lab notes" ON public.interview_lab_notes;
CREATE POLICY "Admins manage lab notes" ON public.interview_lab_notes FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin() AND owner_id = auth.uid());
