-- Add session_reference column to feedback table for better tracking
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS session_reference VARCHAR(10);

-- Add index for better performance when querying by session reference
CREATE INDEX IF NOT EXISTS idx_feedback_session_reference 
ON public.feedback(session_reference);

-- Add a comment to document the purpose
COMMENT ON COLUMN public.feedback.session_reference 
IS 'Unique session identifier from interview_sessions table for tracking feedback to specific interview sessions';