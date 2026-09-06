import { supabase } from '@/integrations/supabase/client';

export type AppLogLevel = 'info' | 'warn' | 'error';

export interface LogAppEventArgs {
  level?: AppLogLevel;
  eventType: string;
  message: string;
  interviewSessionId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Site-wide durable log — a real Postgres row, not just a console line, so an error or API
 * failure is still visible after the tab closes, on a different device, or by someone other than
 * whoever hit it. Fire-and-forget by design: logging must never be able to break the caller, so
 * every failure here is swallowed after a console.warn.
 *
 * `app_logs.types.ts` isn't in the generated Supabase types yet (same situation as
 * `interview_flows` — see useInterviewFlowsAdmin.ts's identical `as any` workaround) so this casts
 * rather than blocking on a type regeneration that needs the Management API token anyway.
 */
export async function logAppEvent(args: LogAppEventArgs): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id ?? null;

    const { error } = await (supabase as any).from('app_logs').insert({
      level: args.level ?? 'info',
      source: 'client',
      event_type: args.eventType,
      message: args.message,
      user_id: userId,
      interview_session_id: args.interviewSessionId ?? null,
      request_id: args.requestId ?? null,
      metadata: { ...args.metadata, url: window.location.href },
    });
    if (error) console.warn('logAppEvent insert failed:', error);
  } catch (err) {
    console.warn('logAppEvent failed:', err);
  }
}
