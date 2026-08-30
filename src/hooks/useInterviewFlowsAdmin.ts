import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FlowGraph, InterviewFlowRow } from '@/types/interviewFlow';

// `interview_flows` isn't in the generated Supabase types yet (needs a `supabase gen types` run
// against the applied migration) — same workaround already used for `questions`/`daily_questions`
// elsewhere in this admin surface.
const db = () => (supabase as any).from('interview_flows');

const EMPTY_GRAPH: FlowGraph = { nodes: [{ id: 'start', type: 'start' }], edges: [] };

export interface FlowDraftInput {
  name: string;
  description?: string;
  domains: string[];
  scoring_philosophy?: string;
  custom_instructions?: string;
  cost_credits: number;
  estimated_duration: number;
}

export function useInterviewFlowsAdmin() {
  const { toast } = useToast();
  const [flows, setFlows] = useState<InterviewFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db().select('*').order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else { setError(null); setFlows((data ?? []) as InterviewFlowRow[]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: FlowDraftInput): Promise<InterviewFlowRow | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await db()
      .insert({
        name: input.name,
        description: input.description || null,
        graph: EMPTY_GRAPH,
        domains: input.domains,
        scoring_philosophy: input.scoring_philosophy || null,
        custom_instructions: input.custom_instructions || null,
        cost_credits: input.cost_credits,
        estimated_duration: input.estimated_duration,
        status: 'draft',
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single();
    if (error) { toast({ title: 'Could not create flow', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: `"${input.name}" created` });
    await load();
    return data as InterviewFlowRow;
  }, [load, toast]);

  const saveGraph = useCallback(async (id: string, graph: FlowGraph): Promise<boolean> => {
    const { error } = await db().update({ graph }).eq('id', id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return false; }
    return true;
  }, [toast]);

  const saveMetadata = useCallback(async (id: string, input: Partial<FlowDraftInput>): Promise<boolean> => {
    const { error } = await db().update(input).eq('id', id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return false; }
    return true;
  }, [toast]);

  const setStatus = useCallback(async (id: string, status: 'draft' | 'ready'): Promise<boolean> => {
    const { error } = await db().update({ status }).eq('id', id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: status === 'ready' ? 'Marked ready to launch' : 'Moved back to draft' });
    setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    return true;
  }, [toast]);

  const duplicate = useCallback(async (flow: InterviewFlowRow): Promise<InterviewFlowRow | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await db()
      .insert({
        name: `${flow.name} (copy)`,
        description: flow.description,
        graph: flow.graph,
        domains: flow.domains,
        scoring_philosophy: flow.scoring_philosophy,
        custom_instructions: flow.custom_instructions,
        cost_credits: flow.cost_credits,
        estimated_duration: flow.estimated_duration,
        status: 'draft',
        created_by: userData.user?.id ?? null,
      })
      .select()
      .single();
    if (error) { toast({ title: 'Duplicate failed', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: `Duplicated as "${data.name}"` });
    await load();
    return data as InterviewFlowRow;
  }, [load, toast]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await db().delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Flow deleted' });
    setFlows((prev) => prev.filter((f) => f.id !== id));
    return true;
  }, [toast]);

  return { flows, loading, error, reload: load, create, saveGraph, saveMetadata, setStatus, duplicate, remove };
}

export function useInterviewFlow(id: string | undefined) {
  const { toast } = useToast();
  const [flow, setFlow] = useState<InterviewFlowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await db().select('*').eq('id', id).maybeSingle();
    if (error) setError(error.message);
    else { setError(null); setFlow(data as InterviewFlowRow | null); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveGraph = useCallback(async (graph: FlowGraph): Promise<boolean> => {
    if (!id) return false;
    const { error } = await db().update({ graph }).eq('id', id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return false; }
    setFlow((prev) => (prev ? { ...prev, graph } : prev));
    return true;
  }, [id, toast]);

  return { flow, loading, error, reload: load, saveGraph };
}
