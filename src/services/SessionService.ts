import { supabase } from '@/integrations/supabase/client';
import { InterviewSession, SessionStatus } from '@/models/Session';
import { InterviewType } from '@/config/interviewTypes';

export const SessionService = {
  async createSession(userId: string, interviewType: InterviewType): Promise<InterviewSession> {
    const { data: sessionRef, error: refError } = await supabase.rpc('generate_session_reference');
    const ref = refError
      ? `S${Date.now().toString(36).toUpperCase()}`
      : (sessionRef as string);

    const { data, error } = await supabase
      .from('interview_sessions')
      .insert({
        session_reference: ref,
        user_id: userId,
        interview_type: interviewType.id,
        status: 'active',
        session_metadata: {
          interview_name: interviewType.name,
          duration_minutes: interviewType.duration,
          category: interviewType.category,
          scoring_system: interviewType.scoringSystem,
        },
      })
      .select()
      .single();
    if (error) throw error;
    return data as InterviewSession;
  },

  async endSession(sessionId: string, status: SessionStatus): Promise<void> {
    const { error } = await supabase
      .from('interview_sessions')
      .update({ status, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('status', 'active');
    if (error) throw error;
  },

  async getActiveSession(userId: string): Promise<InterviewSession | null> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data as InterviewSession | null;
  },

  async getUserSessions(userId: string, limit = 20, offset = 0): Promise<InterviewSession[]> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []) as InterviewSession[];
  },

  async updateActivity(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('interview_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  async logEvent(
    sessionId: string,
    type: string,
    level: 'info' | 'warn' | 'error' = 'info',
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('interview_logs')
      .insert({
        session_id: sessionId,
        log_type: type,
        log_level: level,
        message,
        metadata: { ...metadata, timestamp: new Date().toISOString() },
      });
    if (error) console.warn('Failed to log session event:', error);
  },
};
