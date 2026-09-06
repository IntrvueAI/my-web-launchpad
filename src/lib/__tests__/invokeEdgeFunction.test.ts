import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock('../appLogger', () => ({ logAppEvent: vi.fn().mockResolvedValue(undefined) }));

import { supabase } from '@/integrations/supabase/client';
import { logAppEvent } from '../appLogger';
import { invokeEdgeFunction } from '../invokeEdgeFunction';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('invokeEdgeFunction', () => {
  it('sends an x-request-id header and returns data/error/requestId on success', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { ok: true }, error: null } as any);

    const result = await invokeEdgeFunction('some-fn', { body: { a: 1 } });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('some-fn', {
      body: { a: 1 },
      headers: expect.objectContaining({ 'x-request-id': expect.any(String) }),
    });
    expect(result.data).toEqual({ ok: true });
    expect(result.error).toBeNull();
    expect(result.requestId).toEqual(expect.any(String));
  });

  it('logs an info event on success and an error event on failure', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { ok: true }, error: null } as any);
    await invokeEdgeFunction('some-fn');
    expect(logAppEvent).toHaveBeenCalledWith(expect.objectContaining({ level: 'info', eventType: 'invoke:some-fn' }));

    vi.clearAllMocks();
    const fakeError = { name: 'FunctionsError', message: 'boom' };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: fakeError } as any);
    const result = await invokeEdgeFunction('some-fn');
    expect(result.error).toBe(fakeError);
    expect(logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error', eventType: 'invoke:some-fn', message: 'boom' }),
    );
  });

  it('tags the log with interviewSessionId when provided', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: {}, error: null } as any);
    await invokeEdgeFunction('some-fn', { interviewSessionId: 'session-1' });
    expect(logAppEvent).toHaveBeenCalledWith(expect.objectContaining({ interviewSessionId: 'session-1' }));
  });
});
