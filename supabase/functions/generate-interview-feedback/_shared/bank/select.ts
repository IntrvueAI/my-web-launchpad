/**
 * Question selection — the "folders the model calls from", picked one at a time.
 *
 * Pure and dependency-free: operates on an in-memory `BankQuestion[]` so it runs identically in
 * the browser, in Vitest, and in the Deno edge function.
 *
 * Difficulty is now a numeric STAR LEVEL. The mock climbs the levels (via `adapt`), so selection
 * draws at the running level and falls back to the NEAREST level that still has an unused question.
 * Practice mode draws from the chosen category (`topic`). Selection is seeded so a run is
 * reproducible in tests but varies session-to-session, and prefers a fresh category for variety.
 */
import type { BankQuestion, Difficulty } from '../engine/types.ts';

/** Deterministic PRNG (mulberry32) — small, fast, good enough for question shuffling. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(items: T[], rng: () => number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/** Distinct category ids present in the bank, in stable first-seen order. */
export function listTopics(bank: BankQuestion[]): string[] {
  const seen: string[] = [];
  for (const q of bank) if (!seen.includes(q.topic)) seen.push(q.topic);
  return seen;
}

/** Star levels present in the given questions, ordered by closeness to `target` (nearest first). */
function levelOrderByCloseness(questions: BankQuestion[], target: Difficulty): number[] {
  const levels = [...new Set(questions.map((q) => q.difficulty))];
  return levels.sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
}

export interface SelectParams {
  bank: BankQuestion[];
  mode: 'practice' | 'mock';
  /** Running star level (the target `adapt` is climbing to). */
  difficulty: Difficulty;
  askedIds: string[];
  /** Practice: the chosen category. Mock: ignored (samples across categories). */
  topic?: string;
  /** 0-based count of questions already asked — salts the shuffle. */
  questionIndex: number;
  seed: number;
  /** Categories already covered this run — mock prefers a fresh one for variety. */
  recentTopics?: string[];
  /** Injectable clock for expiry checks below — defaults to the real time. Test-only in practice. */
  now?: Date;
}

/**
 * A dated-content question past its `currentAffairsExpiry` is WITHHELD from selection entirely,
 * never merely flagged — stale current-affairs content doesn't become less useful, it becomes
 * confidently wrong, and an interviewer scoring from it would tell a candidate their correct answer
 * is incorrect. Enforced here (at the one place every subject's selection passes through) rather
 * than per-subject, so any future dated content gets the same protection for free.
 */
function isExpired(q: BankQuestion, now: Date): boolean {
  return !!q.currentAffairsExpiry && new Date(q.currentAffairsExpiry).getTime() < now.getTime();
}

/**
 * Pick the next question at (or nearest to) the running star level, never repeating an id.
 * Returns `null` when the whole reachable bank is exhausted (caller should then wrap up).
 */
export function selectQuestion(p: SelectParams): BankQuestion | null {
  const now = p.now ?? new Date();
  const asked = new Set(p.askedIds);
  const unused = p.bank.filter((q) => !asked.has(q.id) && !isExpired(q, now));
  if (unused.length === 0) return null;

  // Which categories are we allowed to draw from, in priority order?
  const topicOrder: (string | undefined)[] =
    p.mode === 'practice' && p.topic ? [p.topic, undefined] : [undefined];

  const rng = makeRng((p.seed ^ (p.questionIndex * 0x9e3779b1)) >>> 0);
  const recent = new Set(p.recentTopics ?? []);

  for (const topic of topicOrder) {
    const inTopic = unused.filter((q) => topic === undefined || q.topic === topic);
    for (const level of levelOrderByCloseness(inTopic, p.difficulty)) {
      let candidates = inTopic.filter((q) => q.difficulty === level);
      // Mock: prefer a category not yet covered this run, for a good spread.
      if (p.mode === 'mock' && recent.size) {
        const fresh = candidates.filter((q) => !recent.has(q.topic));
        if (fresh.length) candidates = fresh;
      }
      const chosen = pickRandom(candidates, rng);
      if (chosen) return chosen;
    }
  }
  return null;
}
