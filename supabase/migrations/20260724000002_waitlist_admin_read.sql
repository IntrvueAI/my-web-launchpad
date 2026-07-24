-- Neither waitlist table had a SELECT policy for anyone, including admins — marketing_waitlist
-- deliberately (public page, no read access at all), payment_waitlist by omission. Admins need to
-- actually see who's on these lists, so add the same "admins can view" policy every other admin
-- table already uses.
CREATE POLICY "Admins can view marketing waitlist"
ON public.marketing_waitlist
FOR SELECT
USING (public.is_current_user_admin());

CREATE POLICY "Admins can view payment waitlist"
ON public.payment_waitlist
FOR SELECT
USING (public.is_current_user_admin());
