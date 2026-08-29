-- Storage for admin-authored "Intrvue A/B/C" flowchart interviews (the flow builder at
-- /admin/interview-flow-builder). This table is authoring/storage ONLY — it is never read by the
-- live interview-brain or feedback edge functions. A flow only reaches real students once it's
-- manually translated into a compiled SubjectPack + INTERVIEW_TYPES entry (see the flow builder's
-- "launch checklist"), exactly like every other interview type. That keeps this table's blast
-- radius limited to draft/in-progress work — nothing here can affect a live interview.
CREATE TABLE IF NOT EXISTS public.interview_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                          -- shown to students once launched, e.g. "Intrvue A"
  description text,                            -- shown on the picker card once launched
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb, -- FlowGraph (see src/interview/engine/flow.ts)
  domains text[] NOT NULL DEFAULT '{}',        -- the 4 assessed dimensions shown on the results page
  scoring_philosophy text,                     -- injected verbatim into the prompt, like SubjectPack.scoringPhilosophy
  custom_instructions text,                    -- injected verbatim into the prompt, like SubjectPack.guardrails
  cost_credits int NOT NULL DEFAULT 1,
  estimated_duration int NOT NULL DEFAULT 20,  -- minutes, for the picker card once launched
  status text NOT NULL DEFAULT 'draft',        -- 'draft' | 'ready' (marked ready = passed publish validation)
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interview_flows_status_check CHECK (status IN ('draft', 'ready'))
);

CREATE INDEX IF NOT EXISTS interview_flows_status_idx ON public.interview_flows (status);

ALTER TABLE public.interview_flows ENABLE ROW LEVEL SECURITY;

-- Admin-only CRUD, identical pattern to public.questions — no public-facing policy needed since
-- this table is never queried by a real interview session.
CREATE POLICY "Admins read flows"   ON public.interview_flows FOR SELECT USING (public.is_current_user_admin());
CREATE POLICY "Admins insert flows" ON public.interview_flows FOR INSERT WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins update flows" ON public.interview_flows FOR UPDATE USING (public.is_current_user_admin());
CREATE POLICY "Admins delete flows" ON public.interview_flows FOR DELETE USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.touch_interview_flows_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS interview_flows_updated_at ON public.interview_flows;
CREATE TRIGGER interview_flows_updated_at BEFORE UPDATE ON public.interview_flows
  FOR EACH ROW EXECUTE FUNCTION public.touch_interview_flows_updated_at();
