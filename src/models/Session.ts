export type SessionStatus = 'active' | 'completed' | 'timed_out' | 'error' | 'abandoned';

export interface InterviewSession {
  id: string;
  session_reference: string;
  user_id: string;
  interview_type: string;
  status: SessionStatus;
  started_at: string;
  ended_at?: string | null;
  last_activity_at: string;
  session_metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SessionLog {
  id: string;
  session_id: string;
  log_type: string;
  log_level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
