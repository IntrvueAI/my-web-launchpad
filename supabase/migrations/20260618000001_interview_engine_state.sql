-- Interview Engine: server-side, resumable run state.
--
-- The orchestrated "interview brain" (supabase/functions/interview-brain) drives the avatar one
-- turn at a time and persists its full state here, so a dropped connection is resumable rather
-- than a stuck "active" lock, and generate-interview-feedback can score from the evidence log
-- instead of re-parsing the raw transcript.

ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS mode text,                                  -- 'practice' | 'mock'
  ADD COLUMN IF NOT EXISTS subject text,                               -- 'maths' (pilot)
  ADD COLUMN IF NOT EXISTS engine_state jsonb,                         -- full SessionState (resumable)
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb;-- denormalised log for feedback

COMMENT ON COLUMN public.interview_sessions.engine_state IS
  'Full interview-engine SessionState (node, difficulty, askedIds, evidence, ...). Written by the interview-brain edge function each turn.';
COMMENT ON COLUMN public.interview_sessions.evidence IS
  'Append-only per-question evidence log (mirror of engine_state.evidence) used by generate-interview-feedback for scoring and the questions-asked/skipped review.';

-- The feedback row carries the per-question review (what was asked, answered, or skipped) so the
-- UI can show lines like "you skipped question 12" / "you said … for question 11 but …".
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS questions_review jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.feedback.questions_review IS
  'Per-question review derived from the interview-engine evidence log: index, topic, question, outcome, skipped, student answer, note.';
