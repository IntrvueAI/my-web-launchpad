import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildMedicineDashboardStats } from '@/hooks/useMedicineDashboardStats';
import type { FeedbackRecord } from '@/types/interview';
import { MedicineHome, MedicineHomeView } from './MedicineHome';
import { MedicineProgress } from './MedicineProgress';
import { MedicineFeedback, MedicineFeedbackView } from './MedicineFeedback';

const state = vi.hoisted(() => ({ error: false, retry: vi.fn() }));
vi.mock('@/hooks/useMedicineDashboardStats', async (original) => ({
  ...await original<typeof import('@/hooks/useMedicineDashboardStats')>(),
  useMedicineDashboardStats: () => ({ error: state.error, retry: state.retry, loading: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useDashboardStats', () => ({ useDashboardStats: () => ({ stats: {} }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, guestSupabase: {} }));
vi.mock('@/components/feedback/FeedbackSummary', () => ({
  FeedbackSummary: ({ feedback }: { feedback: FeedbackRecord }) => <div data-feedback={feedback.id}>Assessment {feedback.id}</div>,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { state.error = false; state.retry.mockClear(); });
const props = { credits: 0, onStartInterview: vi.fn(), onOpenTab: vi.fn(), onOpenCredits: vi.fn() };
const record = (id: string, score: number | null, type = 'medicine-ethics-practice'): FeedbackRecord => ({
  id, total_score: score, interview_type: type, created_at: new Date().toISOString(),
  detailed_feedback: { overall: '', band_assessment: '' }, interview_session_id: id,
});
function render(element: React.ReactNode, check: (node: HTMLDivElement) => void) {
  const node = document.createElement('div'), root = createRoot(node);
  try { act(() => root.render(element)); check(node); } finally { act(() => root.unmount()); }
}

describe('Medicine dashboard feedback reliability', () => {
  it('counts partial practice without treating it as a scored session or mixing school marks', () => {
    const stats = buildMedicineDashboardStats([record('partial', null), record('scored', 16), record('school', 40, '11-plus')]);
    expect(stats.totalSessions).toBe(2);
    expect(stats.scoredSessions).toBe(1);
    expect(stats.averageScore).toBe(16);
    expect(stats.recentTrend.map(r => r.score)).toEqual([16, null]);
  });
  it('keeps a real zero score in the average', () => {
    const stats = buildMedicineDashboardStats([record('zero', 0), record('high', 20), record('partial', null)]);
    expect(stats.scoredSessions).toBe(2);
    expect(stats.averageScore).toBe(10);
  });
  it('labels the latest partial assessment and shows the correct average denominator', () => {
    const stats = buildMedicineDashboardStats([record('partial', null), record('scored', 16)]);
    render(<MedicineHomeView {...props} stats={stats} />, node => {
      expect(node.querySelector('[aria-label="Your last interview"] strong')?.textContent).toBe('Partial assessment');
      expect(node.textContent).toContain('Average across 1 scored session');
      expect(node.textContent).toContain("You've done 2 Medicine sessions");
    });
  });
  it('does not invent a score when no session is fully assessed', () => {
    const stats = buildMedicineDashboardStats([record('partial', null)]);
    expect(stats.averageScore).toBeNull();
    render(<MedicineHomeView {...props} stats={stats} />, node => expect(node.textContent).toContain('No fully scored sessions yet'));
  });
  it.each(['home', 'progress', 'feedback'])('offers a working retry when %s cannot load', page => {
    state.error = true;
    render(page === 'home' ? <MedicineHome {...props} /> : page === 'progress' ? <MedicineProgress /> : <MedicineFeedback />, node => {
      expect(node.querySelector('[role="alert"]')?.textContent).toContain('couldn’t load');
      act(() => node.querySelector('button')!.click());
      expect(state.retry).toHaveBeenCalledOnce();
      expect(node.textContent).not.toContain("Once you've done");
    });
  });
  it('opens an available assessment when a requested feedback record is missing', () => {
    render(<MedicineFeedbackView stats={buildMedicineDashboardStats([record('available', 15)])} selectedFeedbackId="removed" />, node => {
      expect(node.querySelector('[data-feedback]')?.getAttribute('data-feedback')).toBe('available');
    });
  });
});
