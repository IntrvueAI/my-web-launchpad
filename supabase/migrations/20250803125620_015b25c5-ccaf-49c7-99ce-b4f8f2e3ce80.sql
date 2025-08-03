-- Fix the check constraints to allow 0-5 range for all scoring fields
-- This allows for proper scoring when students don't engage or provide no response

-- Drop existing constraints
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_current_awareness_score_check;
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_extracurricular_score_check;
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_personal_insight_score_check;
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_reasoning_score_check;
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_total_score_check;

-- Add new constraints allowing 0-5 range
ALTER TABLE public.feedback ADD CONSTRAINT feedback_current_awareness_score_check 
CHECK (current_awareness_score >= 0 AND current_awareness_score <= 5);

ALTER TABLE public.feedback ADD CONSTRAINT feedback_extracurricular_score_check 
CHECK (extracurricular_score >= 0 AND extracurricular_score <= 5);

ALTER TABLE public.feedback ADD CONSTRAINT feedback_personal_insight_score_check 
CHECK (personal_insight_score >= 0 AND personal_insight_score <= 5);

ALTER TABLE public.feedback ADD CONSTRAINT feedback_reasoning_score_check 
CHECK (reasoning_score >= 0 AND reasoning_score <= 5);

-- Update total score to allow 0-20 range (sum of four 0-5 scores)
ALTER TABLE public.feedback ADD CONSTRAINT feedback_total_score_check 
CHECK (total_score >= 0 AND total_score <= 20);