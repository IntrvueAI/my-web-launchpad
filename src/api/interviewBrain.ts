/**
 * Client for the interview-brain edge function (the orchestrated "brain").
 * Each call is one turn: the student's latest speech in, the avatar's next line out.
 */
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';
import type { BrainAction, BrainResponse, Mode } from '@/interview/engine/types';

export interface BrainTurnArgs {
  sessionId: string;        // the session_reference
  action: BrainAction;
  studentText?: string;
  mode?: Mode;
  topic?: string;
  /** The real interview_sessions.id (UUID), for tagging the durable app_logs trail — distinct
   *  from sessionId above, which is the display reference the edge function looks the row up by. */
  interviewSessionId?: string | null;
}

export async function brainTurn(args: BrainTurnArgs): Promise<BrainResponse> {
  const { interviewSessionId, ...body } = args;
  const { data, error } = await invokeEdgeFunction<BrainResponse>('interview-brain', {
    body,
    interviewSessionId: interviewSessionId ?? undefined,
  });
  if (error) {
    console.error('interview-brain error:', error);
    throw new Error(error.message || 'Interview brain request failed');
  }
  if (!data) throw new Error('No response from interview brain');
  return data;
}
