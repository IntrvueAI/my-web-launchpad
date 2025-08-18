import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InterviewType } from '@/config/interviewTypes';

export interface SessionLoggerReturn {
  sessionReference: string | null;
  startSession: (interviewType: InterviewType, userId: string) => Promise<string>;
  logEvent: (type: string, message: string, level?: 'info' | 'warn' | 'error', metadata?: Record<string, any>) => Promise<void>;
  logError: (error: string, metadata?: Record<string, any>) => Promise<void>;
  endSession: (status?: 'completed' | 'error' | 'timeout') => Promise<void>;
  updateActivity: () => Promise<void>;
}

export const useInterviewSessionLogger = (): SessionLoggerReturn => {
  const sessionIdRef = useRef<string | null>(null);
  const sessionReferenceRef = useRef<string | null>(null);

  const startSession = useCallback(async (interviewType: InterviewType, userId: string): Promise<string> => {
    try {
      // Generate session reference
      const { data: sessionRef, error: refError } = await supabase.rpc('generate_session_reference');
      if (refError) {
        console.warn('Failed to generate session reference:', refError);
        // Fallback to timestamp-based reference
        const fallbackRef = `S${Date.now().toString(36).toUpperCase()}`;
        sessionReferenceRef.current = fallbackRef;
        return fallbackRef;
      }

      // Create session record
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          session_reference: sessionRef,
          user_id: userId,
          interview_type: interviewType.id,
          status: 'active',
          session_metadata: {
            interview_name: interviewType.name,
            duration_minutes: interviewType.duration,
            category: interviewType.category,
            scoring_system: interviewType.scoringSystem,
            browser_info: {
              user_agent: navigator.userAgent,
              language: navigator.language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          }
        })
        .select('id, session_reference')
        .single();

      if (error) {
        console.warn('Failed to create session record:', error);
        // Still return a reference for tracking
        const fallbackRef = sessionRef || `S${Date.now().toString(36).toUpperCase()}`;
        sessionReferenceRef.current = fallbackRef;
        return fallbackRef;
      }

      sessionIdRef.current = data.id;
      sessionReferenceRef.current = data.session_reference;

      console.log('🟢 Interview session started:', data.session_reference);
      return data.session_reference;
    } catch (error) {
      console.warn('Session logging failed - using fallback:', error);
      // Always provide a fallback reference
      const fallbackRef = `F${Date.now().toString(36).toUpperCase()}`;
      sessionReferenceRef.current = fallbackRef;
      return fallbackRef;
    }
  }, []);

  const logEvent = useCallback(async (
    type: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    if (!sessionIdRef.current) {
      console.warn('No session ID - skipping log event:', type, message);
      return;
    }

    try {
      await supabase
        .from('interview_logs')
        .insert({
          session_id: sessionIdRef.current,
          log_type: type,
          log_level: level,
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            url: window.location.href
          }
        });
    } catch (error) {
      console.warn('Failed to log event (continuing):', error);
    }
  }, []);

  const logError = useCallback(async (error: string, metadata: Record<string, any> = {}): Promise<void> => {
    await logEvent('error', error, 'error', metadata);
  }, [logEvent]);

  const updateActivity = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current) {
      console.warn('No session ID - skipping activity update');
      return;
    }

    try {
      await supabase
        .from('interview_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionIdRef.current);
    } catch (error) {
      console.warn('Failed to update activity (continuing):', error);
    }
  }, []);

  const endSession = useCallback(async (status: 'completed' | 'error' | 'timeout' = 'completed'): Promise<void> => {
    if (!sessionIdRef.current) {
      console.warn('No session ID - skipping end session');
      return;
    }

    try {
      await supabase
        .from('interview_sessions')
        .update({
          status,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionIdRef.current);

      await logEvent('session_end', `Session ended with status: ${status}`, 'info', { final_status: status });
      
      console.log('🔴 Interview session ended:', sessionReferenceRef.current, 'Status:', status);
    } catch (error) {
      console.warn('Failed to end session (continuing):', error);
    }
  }, [logEvent]);

  return {
    sessionReference: sessionReferenceRef.current,
    startSession,
    logEvent,
    logError,
    updateActivity,
    endSession
  };
};