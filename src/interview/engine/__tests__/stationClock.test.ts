import { describe, it, expect } from 'vitest';
import { computeStationClock } from '../stationClock';

// Leeds-style: 2 min prep + 6 min response. Manchester-style: 0 prep + 8 min response.
const LEEDS = { prep: 120, response: 360 };
const MANCHESTER = { prep: 0, response: 480 };

describe('computeStationClock', () => {
  it('starts in prep phase when the school mode has reading time', () => {
    const clock = computeStationClock(0, LEEDS);
    expect(clock).toEqual({ phase: 'prep', secondsRemaining: 120, totalSeconds: 120, expired: false });
  });

  it('skips straight to response phase when prep is zero (Manchester: cold start)', () => {
    const clock = computeStationClock(0, MANCHESTER);
    expect(clock).toEqual({ phase: 'response', secondsRemaining: 480, totalSeconds: 480, expired: false });
  });

  it('counts down within prep, then transitions to response exactly at the boundary', () => {
    expect(computeStationClock(60_000, LEEDS).secondsRemaining).toBe(60); // 1 min into 2 min prep
    const atBoundary = computeStationClock(120_000, LEEDS); // exactly 2 min elapsed
    expect(atBoundary.phase).toBe('response');
    expect(atBoundary.secondsRemaining).toBe(360); // full response clock, untouched
  });

  it('counts down within response and expires exactly once the full duration has elapsed', () => {
    const midway = computeStationClock(120_000 + 180_000, LEEDS); // 2min prep + 3min into 6min response
    expect(midway).toEqual({ phase: 'response', secondsRemaining: 180, totalSeconds: 360, expired: false });

    const justBefore = computeStationClock(120_000 + 359_000, LEEDS);
    expect(justBefore.expired).toBe(false);
    expect(justBefore.secondsRemaining).toBe(1);

    const atExpiry = computeStationClock(120_000 + 360_000, LEEDS);
    expect(atExpiry).toEqual({ phase: 'response', secondsRemaining: 0, totalSeconds: 360, expired: true });
  });

  it('stays expired (never negative, never re-enters prep) well past the deadline — a delayed/throttled tick must still read correctly', () => {
    const wayLate = computeStationClock(120_000 + 360_000 + 45_000, LEEDS); // tab backgrounded for 45s past the bell
    expect(wayLate).toEqual({ phase: 'response', secondsRemaining: 0, totalSeconds: 360, expired: true });
  });

  it('Manchester (no prep) expires correctly off its own full duration', () => {
    expect(computeStationClock(479_000, MANCHESTER).expired).toBe(false);
    expect(computeStationClock(480_000, MANCHESTER).expired).toBe(true);
  });
});
