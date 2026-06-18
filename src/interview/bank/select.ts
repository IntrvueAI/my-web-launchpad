/**
 * Question selection — the "folders the model calls from", picked one at a time.
 *
 * Pure and dependency-free: operates on an in-memory `BankQuestion[]` so it runs identically in
 * the browser, in Vitest, and in the Deno edge function. Loading the array is the caller's job
 * (see ./index.ts for the client/test loader).
 *
 * Practice mode: draw from the chosen `topic` at the running difficulty.
 * Mock mode: sample across all strands for coverage, at the running difficulty.
 * Selection is seeded so a run is reproducible in tests but varies session-to-session.
 */
import type { BankQuestion, Difficulty } from '../engine/types';
import { DIFFICULTY_ORDER } from '../engine/types';

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

/** Distinct strand ids present in the bank, in stable first-seen order. */
export function listTopics(bank: BankQuestion[]): string[] {
  const seen: string[] = [];
  for (const q of bank) if (!seen.includes(q.topic)) seen.push(q.topic);
  return seen;
}

/** Difficulty tiers ordered by closeness to `target` (target first, then outward). */
function difficultyFallback(target: Difficulty): Difficulty[] {
  const i = DIFFICULTY_ORDER.indexOf(target);
  const out: Difficulty[] = [DIFFICULTY_ORDER[i]];
  for (let d = 1; d < DIFFICULTY_ORDER.length; d++) {
    if (DIFFICULTY_ORDER[i - d]) out.push(DIFFICULTY_ORDER[i - d]);
    if (DIFFICULTY_ORDER[i + d]) out.push(DIFFICULTY_ORDER[i + d]);
  }
  return out;
}

export interface SelectParams {
  bank: BankQuestion[];
  mode: 'practice' | 'mock';
  difficulty: Difficulty;
  askedIds: string[];
  /** Practice: the chosen strand. Mock: ignored (samples all strands). */
  topic?: string;
  /** 0-based count of questions already asked — used to rotate strands in mock for coverage. */
  questionIndex: number;
  seed: number;
}

/**
 * Pick the next question. Honours topic (practice) and difficulty, falling back to neighbouring
 * tiers — and, only if a strand is exhausted, to other strands — rather than ever repeating an id.
 * Returns `null` when the whole reachable bank is exhausted (caller should then wrap up).
 */
export function selectQuestion(p: SelectParams): BankQuestion | null {
  const asked = new Set(p.askedIds);
  const unused = p.bank.filter((q) => !asked.has(q.id));
  if (unused.length === 0) return null;

  // Which strands are we allowed to draw from, in priority order?
  let topicOrder: (string | undefined)[];
  if (p.mode === 'practice' && p.topic) {
    topicOrder = [p.topic, undefined]; // chosen strand first, then anything as a last resort
  } else {
    // Mock: rotate strands by questionIndex so a run samples across all of them.
    const topics = listTopics(unused);
    const rotated = topics
      .map((t, i) => ({ t, order: (i - (p.questionIndex % Math.max(topics.length, 1)) + topics.length) % topics.length }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.t);
    topicOrder = [...rotated, undefined];
  }

  // Vary the shuffle per question so repeated runs differ.
  const rng = makeRng((p.seed ^ (p.questionIndex * 0x9e3779b1)) >>> 0);

  for (const topic of topicOrder) {
    for (const diff of difficultyFallback(p.difficulty)) {
      const candidates = unused.filter(
        (q) => (topic === undefined || q.topic === topic) && q.difficulty === diff,
      );
      const chosen = pickRandom(candidates, rng);
      if (chosen) return chosen;
    }
  }
  return null;
}
