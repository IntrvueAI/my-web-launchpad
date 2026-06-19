-- Pairs each school the student is applying to with its own interview date, so the
-- dashboard can show real per-school dates instead of one shared date for everyone.
-- Each element: { "school": string, "interview_date": "YYYY-MM-DD" | null }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_interviews JSONB NOT NULL DEFAULT '[]'::jsonb;

-- One-time backfill: turn the old single schools[] + interview_date into paired rows
-- so existing users don't lose what they already entered.
UPDATE public.profiles
SET school_interviews = (
  SELECT jsonb_agg(jsonb_build_object('school', school, 'interview_date', interview_date))
  FROM unnest(schools) AS school
)
WHERE schools IS NOT NULL
  AND array_length(schools, 1) > 0
  AND school_interviews = '[]'::jsonb;
