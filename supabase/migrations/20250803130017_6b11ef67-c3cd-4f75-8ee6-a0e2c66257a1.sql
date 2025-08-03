-- Complete RLS policy implementation for feedback table
-- Add explicit UPDATE and DELETE policies to document security intent

-- Add UPDATE policy (denies all updates to maintain data integrity)
CREATE POLICY "Feedback records are immutable - no updates allowed" 
ON public.feedback 
FOR UPDATE 
USING (false);

-- Add DELETE policy (denies all deletes to maintain audit trail)
CREATE POLICY "Feedback records are permanent - no deletions allowed" 
ON public.feedback 
FOR DELETE 
USING (false);

-- Add comment to document the security design
COMMENT ON TABLE public.feedback IS 'Interview feedback records are immutable once created to maintain data integrity and audit trail. Users can only view and create their own feedback records.';