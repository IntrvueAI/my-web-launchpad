-- Phase 1: Dynamic Database Schema for Scalable Scoring
-- Add flexible scores JSONB column to replace hardcoded score columns
ALTER TABLE public.feedback 
ADD COLUMN scores JSONB;

-- Create index for efficient querying of scores
CREATE INDEX idx_feedback_scores ON public.feedback USING GIN(scores);

-- Migrate existing data to the new flexible format
UPDATE public.feedback 
SET scores = jsonb_build_object(
  'personal_insight', personal_insight_score,
  'reasoning', reasoning_score,
  'extracurricular', extracurricular_score,
  'current_awareness', current_awareness_score,
  'fluency_coherence', fluency_coherence_score,
  'lexical_resource', lexical_resource_score,
  'grammatical_range', grammatical_range_score,
  'pronunciation', pronunciation_score
) WHERE scores IS NULL;

-- Add validation function for scores structure
CREATE OR REPLACE FUNCTION validate_feedback_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure scores is a valid JSON object
  IF NEW.scores IS NOT NULL AND NOT (NEW.scores ? 'dummy' OR jsonb_typeof(NEW.scores) = 'object') THEN
    RAISE EXCEPTION 'scores must be a valid JSON object';
  END IF;
  
  -- Validate score values are within reasonable range (0-20 to accommodate different systems)
  IF NEW.scores IS NOT NULL THEN
    DECLARE
      key TEXT;
      value INTEGER;
    BEGIN
      FOR key, value IN SELECT * FROM jsonb_each_text(NEW.scores)
      LOOP
        IF value::INTEGER < 0 OR value::INTEGER > 20 THEN
          RAISE EXCEPTION 'Score values must be between 0 and 20, got % for %', value, key;
        END IF;
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for score validation
CREATE TRIGGER validate_scores_trigger
  BEFORE INSERT OR UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION validate_feedback_scores();