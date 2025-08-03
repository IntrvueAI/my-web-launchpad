-- Add IELTS-specific scoring columns to feedback table
ALTER TABLE public.feedback 
ADD COLUMN fluency_coherence_score INTEGER,
ADD COLUMN lexical_resource_score INTEGER,
ADD COLUMN grammatical_range_score INTEGER,
ADD COLUMN pronunciation_score INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN public.feedback.fluency_coherence_score IS 'IELTS Fluency & Coherence score (0-9)';
COMMENT ON COLUMN public.feedback.lexical_resource_score IS 'IELTS Lexical Resource score (0-9)';
COMMENT ON COLUMN public.feedback.grammatical_range_score IS 'IELTS Grammatical Range & Accuracy score (0-9)';
COMMENT ON COLUMN public.feedback.pronunciation_score IS 'IELTS Pronunciation score (0-9)';