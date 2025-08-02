-- Update feedback table to store detailed scoring and transcription
ALTER TABLE public.feedback 
ADD COLUMN transcription TEXT,
ADD COLUMN personal_insight_score INTEGER CHECK (personal_insight_score >= 1 AND personal_insight_score <= 5),
ADD COLUMN reasoning_score INTEGER CHECK (reasoning_score >= 1 AND reasoning_score <= 5),
ADD COLUMN extracurricular_score INTEGER CHECK (extracurricular_score >= 1 AND extracurricular_score <= 5),
ADD COLUMN current_awareness_score INTEGER CHECK (current_awareness_score >= 1 AND current_awareness_score <= 5),
ADD COLUMN total_score INTEGER CHECK (total_score >= 4 AND total_score <= 20),
ADD COLUMN detailed_feedback JSONB;