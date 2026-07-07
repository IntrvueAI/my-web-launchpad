-- Keep the raw interview transcript on the session row itself, saved the moment the interview ends —
-- independent of (and before) feedback generation, so a student's words are never lost even if the
-- feedback step errors. Admins can read it via the existing admin-read RLS on interview_sessions.
ALTER TABLE public.interview_sessions ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.interview_sessions ADD COLUMN IF NOT EXISTS transcript_saved_at timestamptz;
