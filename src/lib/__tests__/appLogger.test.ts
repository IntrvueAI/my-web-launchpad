import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { logAppEvent } from '../appLogger';

const mockInsertChain = (result: unknown) => ({
  insert: vi.fn().mockResolvedValue(result),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
  } as any);
});

describe('logAppEvent', () => {
  it('inserts a row with the resolved user id and level defaulted to info', async () => {
    const chain = mockInsertChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await logAppEvent({ eventType: 'invoke:test-fn', message: 'ok' });

    expect(supabase.from).toHaveBeenCalledWith('app_logs');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info', event_type: 'invoke:test-fn', message: 'ok', user_id: 'user-1' }),
    );
  });

  it('passes through an explicit level and interviewSessionId/requestId', async () => {
    const chain = mockInsertChain({ error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await logAppEvent({
      level: 'error',
      eventType: 'invoke:test-fn',
      message: 'failed',
      interviewSessionId: 'session-1',
      requestId: 'req-1',
      metadata: { foo: 'bar' },
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        interview_session_id: 'session-1',
        request_id: 'req-1',
        metadata: expect.objectContaining({ foo: 'bar' }),
      }),
    );
  });

  it('never throws, even when the insert itself fails', async () => {
    const chain = { insert: vi.fn().mockRejectedValue(new Error('network down')) };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await expect(logAppEvent({ eventType: 'x', message: 'y' })).resolves.toBeUndefined();
  });

  it('never throws when getSession itself fails', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('no session'));
    await expect(logAppEvent({ eventType: 'x', message: 'y' })).resolves.toBeUndefined();
  });
});
