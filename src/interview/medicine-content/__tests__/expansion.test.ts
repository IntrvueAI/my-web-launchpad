import { describe, it, expect } from 'vitest';
import drafts from '@/data/interview-staging/medicine-expansion.json';
import research from '../expansion/research.json';
import { getBank } from '@/interview/bank';
import { selectQuestion } from '@/interview/bank/select';

describe('Medicine expansion release boundary', () => {
  it('keeps staged IDs out of browser and edge runtime banks', async () => {
    const browser = getBank('medicine');
    const brain = (await import('../../../../supabase/functions/interview-brain/_shared/medicine-bank.json')).default;
    const feedback = (await import('../../../../supabase/functions/generate-interview-feedback/_shared/medicine-bank.json')).default;
    const draftIds = new Set(drafts.map((q) => q.id));
    for (const bank of [browser,brain,feedback]) expect(bank.some((q) => draftIds.has(q.id))).toBe(false);
  });
  it('cannot select new unreviewed drafts through the student selector', () => {
    const bank = getBank('medicine'); const askedIds: string[] = [];
    const draftIds = new Set(drafts.map((q) => q.id));
    for (let i = 0; i < bank.length; i++) {
      const selected = selectQuestion({ bank, mode: 'mock', difficulty: 2, askedIds, questionIndex: i, seed: 10, now: new Date('2026-09-15') });
      if (!selected) break;
      expect(draftIds.has(selected.id)).toBe(false); askedIds.push(selected.id);
    }
    expect(askedIds.length).toBeGreaterThan(0);
    expect(new Set(askedIds).size).toBe(askedIds.length);
  });
  it('keeps academic practice distinct from MMI practice while sharing suitable stations', () => {
    expect(drafts.some((q) => q.tracks.includes('academic') && !q.tracks.includes('mmi'))).toBe(true);
    expect(drafts.some((q) => q.tracks.includes('mmi') && !q.tracks.includes('academic'))).toBe(true);
    expect(drafts.some((q) => q.tracks.includes('academic') && q.tracks.includes('mmi'))).toBe(true);
  });
  it('does not convert applications per place into an offer probability', () => {
    const imperial = research.schools.find((s) => s.id === 'imperial-a100')!;
    expect(imperial.metric.unit).toBe('ratio');
    expect(imperial.metric.numerator).toBeNull();
    expect(imperial.metric.denominator).toBeNull();
  });
});
