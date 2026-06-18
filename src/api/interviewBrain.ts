/**
 * Client for the interview-brain edge function (the orchestrated "brain").
 * Each call is one turn: the student's latest speech in, the avatar's next line out.
 */
import { supabase } from '@/integrations/supabase/client';
import type { BrainAction, BrainResponse, Mode } from '@/interview/engine/types';

export interface BrainTurnArgs {
  sessionId: string;        // the session_reference
  action: BrainAction;
  studentText?: string;
  mode?: Mode;
  topic?: string;
}

export async function brainTurn(args: BrainTurnArgs): Promise<BrainResponse> {
  const { data, error } = await supabase.functions.invoke<BrainResponse>('interview-brain', {
    body: args,
  });
  if (error) {
    console.error('interview-brain error:', error);
    throw new Error(error.message || 'Interview brain request failed');
  }
  if (!data) throw new Error('No response from interview brain');
  return data;
}
