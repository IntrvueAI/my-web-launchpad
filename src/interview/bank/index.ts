/**
 * Bank loader for the browser + Vitest (Vite environments).
 *
 * Eagerly globs the tiered JSON folders into a single in-memory array. The edge function does NOT
 * use this file (Deno has no `import.meta.glob`) — it reads a vendored combined bank instead; the
 * two stay in sync via `npm run bank:build` (scripts/build-bank.mjs). `selectQuestion` consumes the
 * array either way, so the selection logic has one home.
 */
import type { BankQuestion } from '../engine/types';
import { validateBankFile } from './schema';

const mathsModules = import.meta.glob<{ default: BankQuestion[] }>(
  './questions/maths/**/*.json',
  { eager: true },
);

function flatten(modules: Record<string, { default: BankQuestion[] }>): BankQuestion[] {
  const out: BankQuestion[] = [];
  for (const mod of Object.values(modules)) {
    if (Array.isArray(mod.default)) out.push(...mod.default);
  }
  return out;
}

let mathsBank: BankQuestion[] | null = null;

/** All maths questions across every strand/tier (memoised). */
export function getMathsBank(): BankQuestion[] {
  if (mathsBank) return mathsBank;
  const bank = flatten(mathsModules);
  if (import.meta.env?.DEV) {
    const result = validateBankFile(bank);
    if (!result.ok) console.warn('[bank] maths bank failed validation:', result.errors);
  }
  mathsBank = bank;
  return bank;
}

/** Subject → loader. Add logic/verbal/etc. here as each subject's folders land. */
export function getBank(subject: string): BankQuestion[] {
  switch (subject) {
    case 'maths':
      return getMathsBank();
    default:
      return [];
  }
}
