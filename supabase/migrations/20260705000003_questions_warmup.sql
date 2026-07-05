-- Whether a bank question may be served as an optional "warm-up" on the student Questions page.
-- Defaults to true so the existing bank works as warm-ups immediately; admins can exclude any
-- question (e.g. to keep it exclusively for live interviews) via the Questions page toggle.
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS warmup boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS questions_warmup_idx ON public.questions (warmup, active);
