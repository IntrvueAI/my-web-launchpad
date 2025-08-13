-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;

-- Add a more restrictive policy for payment processing
-- Only allows updating status from 'pending' to 'paid' and updating the updated_at timestamp
CREATE POLICY "Payment processing can update order status" 
ON public.orders 
FOR UPDATE 
USING (
  -- Only allow updates to specific fields needed for payment processing
  auth.role() = 'service_role'
)
WITH CHECK (
  -- Only allow status change from pending to paid
  (OLD.status = 'pending' AND NEW.status = 'paid') AND
  -- Ensure other critical fields cannot be changed
  NEW.user_id = OLD.user_id AND
  NEW.amount = OLD.amount AND
  NEW.credits_purchased = OLD.credits_purchased AND
  NEW.stripe_session_id = OLD.stripe_session_id AND
  NEW.currency = OLD.currency AND
  NEW.created_at = OLD.created_at
);