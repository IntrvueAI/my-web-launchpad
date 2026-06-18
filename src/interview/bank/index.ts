/**
 * Bank loader for the browser + Vitest (Vite environments).
 *
 * Eagerly globs every subject's tiered JSON folders into memory and groups by `subject`. The edge
 * function does NOT use this file (Deno has no `import.meta.glob`) — it reads vendored combined
 * banks instead; the two stay in sync via `npm run brain:build` (scripts/build-interview-brain.mjs).
 */
import type { BankQuestion } from '../engine/types';
import { validateBankFile } from './schema';

const modules = import.meta.glob<{ default: BankQuestion[] }>('./questions/**/*.json', { eager: true });

let allQuestions: BankQuestion[] | null = null;

function loadAll(): BankQuestion[] {
  if (allQuestions) return allQuestions;
  const out: BankQuestion[] = [];
  for (const mod of Object.values(modules)) {
    if (Array.isArray(mod.default)) out.push(...mod.default);
  }
  if (import.meta.env?.DEV) {
    const result = validateBankFile(out);
    if (!result.ok) console.warn('[bank] question bank failed validation:', result.errors);
  }
  allQuestions = out;
  return out;
}

/** All questions for a subject across every strand/tier. */
export function getBank(subject: string): BankQuestion[] {
  return loadAll().filter((q) => q.subject === subject);
}

/** Back-compat helper. */
export function getMathsBank(): BankQuestion[] {
  return getBank('maths');
}
