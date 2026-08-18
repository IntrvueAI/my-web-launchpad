import { describe, expect, it } from 'vitest';
import { validateBankFile } from '../schema';
import { getBank } from '../index';

// Every bank question file must satisfy the shared Zod contract (schema.ts) — this is authored-content
// validation (typos, missing required fields), not engine logic, but nothing else exercises it against
// the real files today. Covers every subject folder, not just the newest one.
describe('question bank content', () => {
  const subjects = ['maths', 'logic', 'currentaffairs', 'elevenplus', 'medicine', 'chat'];

  it.each(subjects)('%s bank validates against the schema', (subject) => {
    const bank = getBank(subject);
    expect(bank.length).toBeGreaterThan(0);
    const result = validateBankFile(bank, { subject });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('every question id is globally unique across subjects', () => {
    const all = subjects.flatMap((s) => getBank(s));
    const ids = all.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
