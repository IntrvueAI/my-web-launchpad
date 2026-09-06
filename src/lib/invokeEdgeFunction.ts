import { supabase } from '@/integrations/supabase/client';
import { logAppEvent } from './appLogger';
import type { FunctionsError } from '@supabase/supabase-js';

export interface InvokeEdgeFunctionOptions {
  // Matches supabase.functions.invoke's own body type (Record<string, any>) — using `unknown`
  // here would reject plain interfaces without an index signature (EmailOptions, BugReportData,
  // etc.), which is exactly what real call sites pass.
  body?: Record<string, any>;
  headers?: Record<string, string>;
  /** Tags the resulting log rows to an interview session, when the call happens inside one — lets
   *  the query script pull a session's full cross-boundary trail. */
  interviewSessionId?: string;
}

export interface InvokeEdgeFunctionResult<T> {
  data: T | null;
  error: FunctionsError | null;
  requestId: string;
}

/**
 * Drop-in replacement for `supabase.functions.invoke` that adds the one thing plain invoke can't:
 * a durable, queryable record of what was sent and what came back. Generates a request id and
 * sends it as a header (not folded into the body) so the edge function can read it before even
 * parsing the body — meaning a request id survives even a JSON-parse failure server-side, which is
 * what actually lets a client-side failure row and a server-side failure row be joined later.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: InvokeEdgeFunctionOptions = {},
): Promise<InvokeEdgeFunctionResult<T>> {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();

  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: options.body,
    headers: { ...options.headers, 'x-request-id': requestId },
  });

  const durationMs = Math.round(performance.now() - startedAt);

  if (error) {
    logAppEvent({
      level: 'error',
      eventType: `invoke:${functionName}`,
      message: error.message || `${functionName} failed`,
      interviewSessionId: options.interviewSessionId,
      requestId,
      metadata: { durationMs, body: options.body },
    }).catch(() => {});
  } else {
    logAppEvent({
      level: 'info',
      eventType: `invoke:${functionName}`,
      message: `${functionName} succeeded`,
      interviewSessionId: options.interviewSessionId,
      requestId,
      metadata: { durationMs },
    }).catch(() => {});
  }

  return { data, error, requestId };
}
