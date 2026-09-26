import type { BankQuestion } from './types.ts';

/** Candidate-facing context only. Actor instructions and marking guidance stay private. */
export function publicQuestionPrompt(question: BankQuestion): string {
  if (!question.roleplay) return question.question;
  return `${question.roleplay.applicantRole}\n\nSpeak directly to ${question.roleplay.name}.\n\n${question.question}`;
}
