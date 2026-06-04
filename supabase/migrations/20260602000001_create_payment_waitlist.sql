-- Payment waitlist: while purchases are paused, users who try to buy credits
-- can register interest with their email instead of being sent to Stripe.
-- Stripe remains fully wired; this just captures intent in the meantime.
CREATE TABLE IF NOT EXISTS public.payment_waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email      TEXT        NOT NULL,
  source     TEXT        NOT NULL DEFAULT 'credits_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_waitlist ENABLE ROW LEVEL SECURITY;

-- Logged-in users can add themselves to the waitlist (the credits page is
-- behind auth). They may only insert a row tied to their own user_id.
CREATE POLICY "Users can join the waitlist"
ON public.payment_waitlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- No public SELECT policy: only the service role / admins read the list.

CREATE INDEX idx_payment_waitlist_created ON public.payment_waitlist(created_at);
CREATE INDEX idx_payment_waitlist_email   ON public.payment_waitlist(email);
