import { describe, it, expect } from 'vitest';
import {
  getScoreRange,
  getScoreBands,
  getScoreBand,
  calculateTotalScore,
  scoreToPercentage,
} from '../scoringSystem';

describe('getScoreRange', () => {
  it('returns 0-20 for 11-plus interview id', () => {
    const range = getScoreRange('0-5', '11-plus');
    expect(range).toEqual({ min: 0, max: 20, type: '0-5' });
  });

  it('returns 0-5 for 0-5 scoring system without special id', () => {
    expect(getScoreRange('0-5')).toEqual({ min: 0, max: 5, type: '0-5' });
  });

  it('returns 0-9 for 0-9 scoring system', () => {
    expect(getScoreRange('0-9')).toEqual({ min: 0, max: 9, type: '0-9' });
  });

  it('returns 0-10 for 0-10 scoring system', () => {
    expect(getScoreRange('0-10')).toEqual({ min: 0, max: 10, type: '0-10' });
  });

  it('defaults to 0-5 for unknown scoring system', () => {
    expect(getScoreRange('unknown' as any)).toEqual({ min: 0, max: 5, type: '0-5' });
  });
});

describe('getScoreBands', () => {
  it('returns 6 bands for 0-5 system', () => {
    expect(getScoreBands('0-5')).toHaveLength(6);
  });

  it('returns 10 bands for 0-9 system', () => {
    expect(getScoreBands('0-9')).toHaveLength(10);
  });

  it('0-5 top band is Outstanding at score 5', () => {
    const bands = getScoreBands('0-5');
    expect(bands[0].label).toBe('Outstanding');
    expect(bands[0].range).toEqual([5, 5]);
  });

  it('0-9 top band is Expert User at score 9', () => {
    const bands = getScoreBands('0-9');
    expect(bands[0].label).toBe('Expert User');
    expect(bands[0].range).toEqual([9, 9]);
  });
});

describe('getScoreBand', () => {
  it('identifies Outstanding for score 5 in 0-5 system', () => {
    expect(getScoreBand(5, '0-5').label).toBe('Outstanding');
  });

  it('identifies Developing for score 2 in 0-5 system', () => {
    expect(getScoreBand(2, '0-5').label).toBe('Developing');
  });

  it('identifies Expert User for score 9 in 0-9 system', () => {
    expect(getScoreBand(9, '0-9').label).toBe('Expert User');
  });

  it('identifies Non-User for score 1 in 0-9 system', () => {
    expect(getScoreBand(1, '0-9').label).toBe('Non-User');
  });

  it('falls back to lowest band for out-of-range score', () => {
    const band = getScoreBand(99, '0-5');
    expect(band).toBeDefined();
  });
});

describe('calculateTotalScore', () => {
  it('returns 0 for empty scores array', () => {
    expect(calculateTotalScore([], '0-5')).toBe(0);
  });

  it('averages scores correctly', () => {
    expect(calculateTotalScore([4, 4, 4, 4], '0-5')).toBe(4);
  });

  it('clamps result to max of scoring system', () => {
    expect(calculateTotalScore([10, 10], '0-5')).toBe(5);
  });

  it('clamps result to 0 minimum', () => {
    expect(calculateTotalScore([-1, -1], '0-5')).toBe(0);
  });
});

describe('scoreToPercentage', () => {
  it('converts max score to 100%', () => {
    expect(scoreToPercentage(5, '0-5')).toBe(100);
  });

  it('converts 0 to 0%', () => {
    expect(scoreToPercentage(0, '0-5')).toBe(0);
  });

  it('converts mid score correctly', () => {
    expect(scoreToPercentage(4.5, '0-9')).toBe(50);
  });

  it('clamps over-range scores to 100', () => {
    expect(scoreToPercentage(99, '0-5')).toBe(100);
  });
});
