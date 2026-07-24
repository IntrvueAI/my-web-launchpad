-- Public marketing waitlist ("Join waitlist" on the landing page / About us / FAQ drafts).
-- Previously that form was purely decorative — it validated the email, showed a fake success
-- message, and threw the value away. This table is what it now actually writes to.
--
-- Distinct from payment_waitlist (src/components/credits/WaitlistDialog.tsx): that one is for
-- already-logged-in users deferring a credits purchase, gated to auth.uid() = user_id. This one is
-- hit by anonymous visitors before they've ever signed up, so it needs an anon-insert policy.
CREATE TABLE public.marketing_waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source     TEXT        NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (signed in or not) can add themselves. No SELECT policy for anon/authenticated — only the
-- service role (dashboard / admin tooling) can read the list back, so a public page can never be
-- used to scrape emails.
CREATE POLICY "Anyone can join the marketing waitlist"
ON public.marketing_waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX idx_marketing_waitlist_created ON public.marketing_waitlist(created_at);
CREATE UNIQUE INDEX idx_marketing_waitlist_email ON public.marketing_waitlist(lower(email));
