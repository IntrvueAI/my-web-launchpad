-- Temporary capture table for the Tavus/Charlie webhook, so we can see the REAL payload shape
-- from a live test run before building the permanent integration into feedback/interview_sessions.
-- Service-role only (the edge function uses the service key; no public policies).
create table if not exists public.tavus_webhook_debug (
  id uuid primary key default gen_random_uuid(),
  payload jsonb,
  headers jsonb,
  created_at timestamptz not null default now()
);

alter table public.tavus_webhook_debug enable row level security;
