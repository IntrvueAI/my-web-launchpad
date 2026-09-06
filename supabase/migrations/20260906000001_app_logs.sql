-- Site-wide error/event log — durable, queryable, cross-session, cross-user. Complements the
-- existing per-interview interview_logs table (which stays untouched) with a broader layer that
-- covers every client error and every edge function call/failure across the whole app.
CREATE TABLE public.app_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  source TEXT NOT NULL, -- 'client' | 'edge:<function-name>'
  event_type TEXT NOT NULL, -- e.g. 'invoke:get-anam-session-token', 'unhandled_exception', 'react_error_boundary'
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interview_session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  request_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Mirrors interview_logs' own SEC-04-tightened insert policy: an actor may only insert logs
-- attributed to themselves (or anonymously pre-login, where user_id is left null), and if tagging
-- an interview session, must own that session.
CREATE POLICY "Users can insert their own app logs"
ON public.app_logs
FOR INSERT
WITH CHECK (
  user_id IS NOT DISTINCT FROM auth.uid()
  AND (
    interview_session_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = app_logs.interview_session_id
        AND interview_sessions.user_id = auth.uid()
    )
  )
);

-- Mirrors admin_audit_log: this table can hold stack traces and raw request/response payloads
-- that shouldn't be end-user-visible, so reads are admin-only.
CREATE POLICY "Admins can view all app logs"
ON public.app_logs
FOR SELECT
USING (public.is_current_user_admin());

-- No update/delete policies for anon/authenticated — denied by default. Service-role callers
-- (edge functions, the query script, the retention function) bypass RLS entirely.

CREATE INDEX idx_app_logs_created_at ON public.app_logs (created_at DESC);
CREATE INDEX idx_app_logs_level ON public.app_logs (level);
CREATE INDEX idx_app_logs_source ON public.app_logs (source);
CREATE INDEX idx_app_logs_event_type ON public.app_logs (event_type);
CREATE INDEX idx_app_logs_user_id ON public.app_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_app_logs_interview_session_id ON public.app_logs (interview_session_id) WHERE interview_session_id IS NOT NULL;
CREATE INDEX idx_app_logs_request_id ON public.app_logs (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_app_logs_level_created_at ON public.app_logs (level, created_at DESC);
