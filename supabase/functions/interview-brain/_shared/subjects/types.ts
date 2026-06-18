/**
 * SubjectPack — the config-as-data that specialises the shared engine for one subject.
 * Mirrors a `*-mini-interview-flow.json`: persona, strands/topics, watch-list, rubric binding.
 * Adding a new subject = authoring one of these + its bank folders; the engine is untouched.
 */
import type { Difficulty } from '../engine/types.ts';

export interface TopicDef {
  /** Strand id — MUST match the bank folder name, e.g. 'arithmetic'. */
  id: string;
  /** Human label for the topic picker UI. */
  label: string;
  /** One-line description of what the strand covers. */
  blurb: string;
}

export interface SubjectPack {
  subject: string;            // 'maths'
  /** Interviewer name + one-line character, e.g. "Clara — warm, patient British examiner". */
  persona: string;
  /** Subject-specific speaking notes appended to CORE_SPEAKING_STYLE. */
  speakingNotes?: string;
  /** Guardrails for this subject (no answer leakage, no new content taught, etc.). */
  guardrails: string;
  /** Opener lines (greeting + unmarked, unscored loosening question) — one is chosen at random. */
  openers: string[];
  /** The strands the interview samples from (also the practice-mode topic picker). */
  topics: TopicDef[];
  /** Common mistakes the judge should watch for (the flow's "watch" node). */
  watchlist: string[];
  /** The four assessed domains (each 0–5, total /20). */
  domains: [string, string, string, string];
  /** Default difficulty a run starts at before `adapt` moves it. */
  startDifficulty: Difficulty;
  /** Target scored questions in a mock run. */
  mockTargetQuestions: number;
}
