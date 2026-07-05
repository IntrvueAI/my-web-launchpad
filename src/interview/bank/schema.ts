/**
 * Question-bank schema + validation.
 *
 * The bank is authored by hand as tiered JSON under `questions/<subject>/<topic>/<difficulty>.json`.
 * This schema is the contract those files must satisfy; `validateBankFile` is used by the data-layer
 * tests (and can be run as a content lint) so a malformed question never reaches a live interview.
 */
import { z } from 'zod';
import type { BankQuestion, Difficulty } from '../engine/types';

export const DifficultySchema = z.number().int().min(1).max(5);

export const BankQuestionSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: DifficultySchema, // star level (1 = easiest)
  questionType: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().optional(),
  options: z.array(z.string()).optional(),

  // Rich 6-part tutoring spec (all optional).
  modelReasoningPath: z.string().optional(),
  rubric: z
    .object({
      strong: z.string().min(1),
      developing: z.string().min(1),
      weak: z.string().min(1),
      finalAnswerNote: z.string().optional(),
    })
    .optional(),
  commonMistakes: z.array(z.object({ mistake: z.string().min(1), reveals: z.string().min(1) })).optional(),
  liveProbes: z.array(z.object({ probe: z.string().min(1), goodResponse: z.string().min(1) })).optional(),
  hints: z.array(z.string().min(1)).optional(),
});

export const BankFileSchema = z.array(BankQuestionSchema);

export interface BankValidationResult {
  ok: boolean;
  count: number;
  errors: string[];
}

/**
 * Validate one parsed bank file. Also enforces cross-cutting invariants the Zod shape can't:
 * unique ids, and that every question's `difficulty`/`topic` matches the folder it's filed under.
 */
export function validateBankFile(
  raw: unknown,
  expected?: { subject?: string; topic?: string; difficulty?: Difficulty },
): BankValidationResult {
  const errors: string[] = [];
  const parsed = BankFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, count: 0, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }

  const questions = parsed.data as BankQuestion[];
  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) errors.push(`duplicate id: ${q.id}`);
    seen.add(q.id);
    if (expected?.subject && q.subject !== expected.subject) {
      errors.push(`${q.id}: subject "${q.subject}" != expected "${expected.subject}"`);
    }
    if (expected?.topic && q.topic !== expected.topic) {
      errors.push(`${q.id}: topic "${q.topic}" != folder "${expected.topic}"`);
    }
    if (expected?.difficulty && q.difficulty !== expected.difficulty) {
      errors.push(`${q.id}: difficulty "${q.difficulty}" != folder "${expected.difficulty}"`);
    }
  }
  return { ok: errors.length === 0, count: questions.length, errors };
}
