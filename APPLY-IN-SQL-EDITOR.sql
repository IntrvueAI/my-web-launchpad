-- ============================================================================
-- Interview Engine migration — run this ONCE in the Supabase SQL editor.
-- Dashboard → SQL Editor → New query → paste → Run.
--   https://supabase.com/dashboard/project/fjkuuzfuysemrofcmnvd/sql/new
--
-- Safe: only ADDS columns (IF NOT EXISTS). It cannot drop or change existing
-- data, and it is safe to run more than once.
-- (Same content as supabase/migrations/20260618000001_interview_engine_state.sql)
-- ============================================================================

-- Server-side, resumable interview-engine state on each session row.
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS mode text,                                   -- 'practice' | 'mock'
  ADD COLUMN IF NOT EXISTS subject text,                                -- 'maths' (pilot)
  ADD COLUMN IF NOT EXISTS engine_state jsonb,                          -- full resumable state
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb; -- per-question log

-- Per-question review carried on the feedback row (powers the "Questions" section:
-- "you skipped question 12", "you said … for question 11 but …").
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS questions_review jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Optional: confirm the columns landed.
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'interview_sessions' AND column_name IN ('mode','subject','engine_state','evidence');
