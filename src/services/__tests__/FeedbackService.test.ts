import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { FeedbackService } from '../FeedbackService';

const mockQueryChain = (result: unknown) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  // Make the chain itself awaitable (for .limit() returning data directly)
  Object.assign(chain, Promise.resolve(result));
  chain.then = (res: any) => Promise.resolve(result).then(res);
  chain.catch = (rej: any) => Promise.resolve(result).catch(rej);
  return chain;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FeedbackService.getUserFeedbackHistory', () => {
  it('returns an array of feedback records', async () => {
    const records = [{ id: '1', total_score: 15 }, { id: '2', total_score: 12 }];
    const chain = mockQueryChain({ data: records, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);

    const result = await FeedbackService.getUserFeedbackHistory('u1');
    expect(result).toHaveLength(2);
    expect(result[0].total_score).toBe(15);
  });

  it('returns empty array when user has no feedback', async () => {
    const chain = mockQueryChain({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);

    const result = await FeedbackService.getUserFeedbackHistory('u1');
    expect(result).toEqual([]);
  });

  it('throws on database error', async () => {
    const chain = mockQueryChain({ data: null, error: new Error('DB error') });
    vi.mocked(supabase.from).mockReturnValue(chain);

    await expect(FeedbackService.getUserFeedbackHistory('u1')).rejects.toThrow('DB error');
  });
});

describe('FeedbackService.getProgressSummary', () => {
  it('keeps partial assessments out of averages and score trends', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockQueryChain({data:[
      {total_score:null,created_at:'2026-10-02'},
      {total_score:0,created_at:'2026-10-01'},
      {total_score:16,created_at:'2026-09-30'},
    ],error:null}));
    const summary=await FeedbackService.getProgressSummary('u1');
    expect(summary.totalSessions).toBe(3);
    expect(summary.scoredSessions).toBe(2);
    expect(summary.averageScore).toBe(8);
    expect(summary.recentTrend.map(point => point.score)).toEqual([16,0]);
  });
  it('calculates average and best score correctly', async () => {
    const records = [
      { total_score: 16, created_at: '2026-01-03' },
      { total_score: 12, created_at: '2026-01-02' },
      { total_score: 14, created_at: '2026-01-01' },
    ];
    const chain = mockQueryChain({ data: records, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);

    const summary = await FeedbackService.getProgressSummary('u1');
    expect(summary.totalSessions).toBe(3);
    expect(summary.bestScore).toBe(16);
    expect(summary.averageScore).toBeCloseTo(14, 0);
    expect(summary.recentTrend).toHaveLength(3);
  });

  it('returns zeroes when user has no feedback', async () => {
    const chain = mockQueryChain({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);

    const summary = await FeedbackService.getProgressSummary('u1');
    expect(summary.totalSessions).toBe(0);
    expect(summary.averageScore).toBe(0);
    expect(summary.bestScore).toBe(0);
  });
});

describe('FeedbackService.submitBugReport', () => {
  it('calls the send-bug-report edge function', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { success: true }, error: null } as any);

    await FeedbackService.submitBugReport({
      subject: 'Test',
      category: 'bug',
      description: 'Something broke',
      currentUrl: 'https://intrvue.ai',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-bug-report', expect.any(Object));
  });

  it('throws when edge function returns an error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new Error('Edge error') } as any);

    await expect(
      FeedbackService.submitBugReport({ subject: 'X', category: 'bug', description: 'Y', currentUrl: '' })
    ).rejects.toThrow('Could not reach the service. Check your connection and try again.');
  });
});
