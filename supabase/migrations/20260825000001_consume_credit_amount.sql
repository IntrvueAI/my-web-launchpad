-- consume_credit() previously always decremented exactly 1 credit, with no way to charge an
-- interview's real cost (11+ = 5 credits, Maths/Logic/Current Affairs = 3) in a single atomic call.
-- The app currently works around this by calling the zero-arg version once per credit
-- (src/pages/Index.tsx handleSelectInterview) — safe, but not atomic across multiple round trips.
--
-- This adds an optional amount parameter, defaulting to 1 so any caller still using the old
-- no-args form keeps working unchanged, and makes the check-and-decrement atomic for the real
-- cost in one call. Once this migration is applied, Index.tsx's per-credit loop can be replaced
-- with a single `supabase.rpc('consume_credit', { p_amount: cost })` call.
CREATE OR REPLACE FUNCTION public.consume_credit(p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be a positive integer';
  END IF;

  UPDATE public.credits_balance
  SET credits = credits - p_amount
  WHERE user_id = auth.uid()
    AND credits >= p_amount;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 1 THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;
