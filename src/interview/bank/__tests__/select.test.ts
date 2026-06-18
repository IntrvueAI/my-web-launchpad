import { describe, it, expect } from 'vitest';
import { selectQuestion, makeRng, listTopics, type SelectParams } from '../select';
import { getMathsBank } from '../index';
import type { BankQuestion, Difficulty } from '../../engine/types';

function q(id: string, topic: string, difficulty: Difficulty): BankQuestion {
  return { id, subject: 'maths', topic, difficulty, question: `Q ${id}`, answer: 'a' };
}

const BANK: BankQuestion[] = [
  q('a-f', 'arithmetic', 'foundation'),
  q('a-s', 'arithmetic', 'standard'),
  q('a-x', 'arithmetic', 'stretch'),
  q('w-f', 'word-problems', 'foundation'),
  q('w-s', 'word-problems', 'standard'),
  q('w-x', 'word-problems', 'stretch'),
];

const base = (over: Partial<SelectParams> = {}): SelectParams => ({
  bank: BANK,
  mode: 'mock',
  difficulty: 'standard',
  askedIds: [],
  questionIndex: 0,
  seed: 12345,
  ...over,
});

describe('makeRng', () => {
  it('is deterministic for a given seed and varies across seeds', () => {
    expect(makeRng(1)()).toBe(makeRng(1)());
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});

describe('selectQuestion', () => {
  it('never returns an already-asked question', () => {
    const askedIds: string[] = [];
    for (let i = 0; i < BANK.length; i++) {
      const chosen = selectQuestion(base({ askedIds: [...askedIds], questionIndex: i }));
      expect(chosen).not.toBeNull();
      expect(askedIds).not.toContain(chosen!.id);
      askedIds.push(chosen!.id);
    }
    // Bank exhausted → null.
    expect(selectQuestion(base({ askedIds, questionIndex: BANK.length }))).toBeNull();
  });

  it('practice mode draws only from the chosen topic while it has questions', () => {
    const askedIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const chosen = selectQuestion(
        base({ mode: 'practice', topic: 'word-problems', askedIds: [...askedIds], questionIndex: i }),
      );
      expect(chosen!.topic).toBe('word-problems');
      askedIds.push(chosen!.id);
    }
  });

  it('prefers the requested difficulty, falling back to a neighbouring tier', () => {
    // Only a stretch arithmetic question left at standard request → should still resolve.
    const onlyStretch = [q('a-x', 'arithmetic', 'stretch')];
    const chosen = selectQuestion(base({ bank: onlyStretch, difficulty: 'foundation' }));
    expect(chosen!.id).toBe('a-x');
  });

  it('mock mode rotates across strands for coverage', () => {
    const first = selectQuestion(base({ questionIndex: 0 }))!;
    const second = selectQuestion(base({ questionIndex: 1, askedIds: [first.id] }))!;
    expect(first.topic).not.toBe(second.topic);
  });

  it('returns null on an empty bank', () => {
    expect(selectQuestion(base({ bank: [] }))).toBeNull();
  });
});

describe('real sample bank', () => {
  it('loads tiered maths questions across all six strands', () => {
    const bank = getMathsBank();
    expect(bank.length).toBeGreaterThanOrEqual(18);
    expect(listTopics(bank).sort()).toEqual(
      [
        'arithmetic',
        'fractions-decimals-percent',
        'geometry-measure',
        'ratio-proportion',
        'sequences-algebra',
        'word-problems',
      ].sort(),
    );
    // Every tier present for arithmetic.
    const tiers = new Set(bank.filter((x) => x.topic === 'arithmetic').map((x) => x.difficulty));
    expect(tiers).toEqual(new Set(['foundation', 'standard', 'stretch']));
  });
});
