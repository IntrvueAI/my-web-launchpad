-- Create user_feedback table for collecting user feedback
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'new',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for users to manage their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON public.user_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policies for admins to manage all feedback
CREATE POLICY "Admins can view all feedback" 
ON public.user_feedback 
FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Admins can update feedback status and responses" 
ON public.user_feedback 
FOR UPDATE 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_feedback_updated_at
BEFORE UPDATE ON public.user_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraints for valid categories and statuses
ALTER TABLE public.user_feedback 
ADD CONSTRAINT check_category 
CHECK (category IN ('bug_report', 'feature_request', 'general', 'other'));

ALTER TABLE public.user_feedback 
ADD CONSTRAINT check_status 
CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed'));

-- Add constraint for non-empty message
ALTER TABLE public.user_feedback 
ADD CONSTRAINT check_message_not_empty 
CHECK (length(trim(message)) > 0);