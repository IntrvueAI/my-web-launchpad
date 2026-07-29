import { useRef, useCallback } from 'react';
import { InterviewType } from '@/config/interviewTypes';
import { SessionService } from '@/services/SessionService';

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
      const session = await SessionService.createSession(userId, interviewType);
      sessionIdRef.current = session.id;
      sessionReferenceRef.current = session.session_reference;
      return session.session_reference;
    } catch (error) {
      console.warn('Session logging failed - using fallback:', error);
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
    await SessionService.logEvent(
      sessionIdRef.current,
      type,
      level,
      message,
      { ...metadata, url: window.location.href }
    );
  }, []);

  const logError = useCallback(async (error: string, metadata: Record<string, any> = {}): Promise<void> => {
    await logEvent('error', error, 'error', metadata);
  }, [logEvent]);

  const updateActivity = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current) return;
    await SessionService.updateActivity(sessionIdRef.current);
  }, []);

  const endSession = useCallback(async (status: 'completed' | 'error' | 'timeout' = 'completed'): Promise<void> => {
    if (!sessionIdRef.current) return;
    try {
      await SessionService.endSession(sessionIdRef.current, status === 'timeout' ? 'timed_out' : status);
      await logEvent('session_end', `Session ended with status: ${status}`, 'info', { final_status: status });
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