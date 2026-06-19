/**
 * Adaptive difficulty controller (the flow's "adapt" node).
 * Strong + fluent → step up. Shaky / needed hints → hold or ease. Pure and deterministic.
 */
import type { Difficulty, Outcome } from './types.ts';
import { DIFFICULTY_ORDER } from './types.ts';

function step(d: Difficulty, by: number): Difficulty {
  const i = DIFFICULTY_ORDER.indexOf(d);
  const next = Math.min(DIFFICULTY_ORDER.length - 1, Math.max(0, i + by));
  return DIFFICULTY_ORDER[next];
}

/**
 * Decide the difficulty of the NEXT question from how the last one went.
 * Only meaningful in mock mode; practice holds the level the student is exploring.
 */
export function nextDifficulty(current: Difficulty, outcome: Outcome, hintsUsed: number): Difficulty {
  switch (outcome) {
    case 'correct_method':
      // Clean solve, no hints → climb. With hints → hold.
      return hintsUsed === 0 ? step(current, +1) : current;
    case 'correct_no_method':
      return current; // right but couldn't explain → consolidate at the same level
    case 'incorrect':
    case 'stuck':
      return step(current, -1); // ease off
    case 'skipped':
    default:
      return current; // a skip tells us nothing about level
  }
}
