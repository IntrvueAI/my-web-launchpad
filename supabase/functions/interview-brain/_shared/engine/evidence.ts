/**
 * Append-only evidence log helpers (the flow's silent "Log evidence" node).
 * The feedback step scores from these and renders the "questions asked / skipped" review.
 */
import type { BankQuestion, Evidence, Outcome } from './types.ts';

export interface JudgeResult {
  outcome: Outcome;
  methodQuality: Evidence['methodQuality'];
  /** Short interviewer-side note, e.g. "right answer but couldn't explain the method". */
  notes: string;
}

/** Build one evidence entry from a judged (or skipped) question. */
export function makeEvidence(
  index: number,
  question: BankQuestion,
  studentAnswer: string,
  hintsUsed: number,
  judged: JudgeResult,
): Evidence {
  return {
    index,
    id: question.id,
    topic: question.topic,
    difficulty: question.difficulty,
    question: question.question,
    outcome: judged.outcome,
    skipped: judged.outcome === 'skipped',
    hintsUsed,
    studentAnswer,
    methodQuality: judged.methodQuality,
    notes: judged.notes,
  };
}

/** The evidence entry for a skipped question (no judging needed). */
export function makeSkipEvidence(index: number, question: BankQuestion): Evidence {
  return makeEvidence(index, question, '', 0, {
    outcome: 'skipped',
    methodQuality: 'unknown',
    notes: 'Student chose to skip this question.',
  });
}
