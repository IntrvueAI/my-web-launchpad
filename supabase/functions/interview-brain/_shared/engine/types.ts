/**
 * Core engine types — shared by the client and the (vendored) interview-brain edge function.
 *
 * IMPORTANT: keep this file dependency-free (no browser, Node, or `@/` imports) so a verbatim
 * copy can run inside Deno. See docs/INTERVIEW-ENGINE-ROADMAP.md and the approved plan.
 */

/** How the interview is run (the flow diagram's "modefork"). */
export type Mode = 'practice' | 'mock';

/** Difficulty tiers questions are folded into so `adapt` has something to climb. */
export type Difficulty = 'foundation' | 'standard' | 'stretch';

export const DIFFICULTY_ORDER: Difficulty[] = ['foundation', 'standard', 'stretch'];

/**
 * The evaluation outcome of a single answered (or skipped) question — mirrors the
 * `judge → o1..o4` branch in the *-flow.json diagrams.
 */
export type Outcome =
  | 'correct_method'   // o1: correct + clear method
  | 'correct_no_method'// o2: correct, no method shown
  | 'incorrect'        // o3: wrong (after a hint + single retry)
  | 'stuck'            // o4: stuck / silent
  | 'skipped';         // student chose to skip (recorded, not scored as wrong)

/** Reasoning-band rubric for a question (the gold standard Clara scores the transcript against). */
export interface QuestionRubric {
  strong: string;        // what strong reasoning looks like
  developing: string;    // partial / prompted reasoning
  weak: string;          // little or no reasoning
  finalAnswerNote?: string; // note about the final answer (e.g. "accept 2.8 or £2.80")
}

/** A specific wrong turn to watch for, and what it reveals about the student's thinking. */
export interface CommonMistake {
  mistake: string;
  reveals: string;
}

/** An interviewer follow-up line, with what a good response to it sounds like. */
export interface LiveProbe {
  probe: string;
  goodResponse: string;
}

/**
 * A single bank question. The first six fields are the minimum; the rich fields below let you
 * author the full 6-part tutoring spec (model reasoning, rubric, mistakes, probes, hint ladder)
 * that Clara uses to probe, hint, and score. All rich fields are OPTIONAL — a question with just
 * question+answer still works. Answers and guidance live server-side and never reach the client.
 */
export interface BankQuestion {
  id: string;
  subject: string;
  topic: string;          // strand id, e.g. 'arithmetic' — MUST match the bank folder
  difficulty: Difficulty; // MUST match the file it's in
  question: string;       // 1. read verbatim, exactly as written
  answer: string;         // the final answer (server-side only — NEVER spoken)
  /** Optional short worked method (legacy field; superseded by modelReasoningPath). */
  explanation?: string;
  /** Optional MCQ options (kept for the shared minigame bank; ignored in the spoken interview). */
  options?: string[];

  // ---- Rich 6-part tutoring spec (all optional) ----
  /** 2. Model reasoning path — a top candidate's thinking, narrated step by step (a process). */
  modelReasoningPath?: string;
  /** 3. Scoring rubric — Strong / Developing / Weak reasoning bands + a final-answer note. */
  rubric?: QuestionRubric;
  /** 4. Common mistakes — the specific wrong turns to watch for and what each reveals. */
  commonMistakes?: CommonMistake[];
  /** 5. Live probes — exact follow-up lines to use mid-conversation, and what good looks like. */
  liveProbes?: LiveProbe[];
  /** 6. Hints if stuck — a three-step ladder, gentle nudge → near-reveal (used in order). */
  hints?: string[];
}

/**
 * One entry in the append-only evidence log. The feedback step scores from these instead of
 * re-parsing the raw transcript, and renders the "questions asked / skipped" review from them.
 */
export interface Evidence {
  index: number;          // 1-based order asked
  id: string;             // bank question id
  topic: string;
  difficulty: Difficulty;
  question: string;
  outcome: Outcome;
  skipped: boolean;
  hintsUsed: number;
  studentAnswer: string;  // best capture of what they said (may be empty if skipped/stuck)
  /** Coarse method-quality read used for scoring: did they show sound working? */
  methodQuality: 'sound' | 'partial' | 'none' | 'unknown';
  /** Reasoning band from the question's rubric, when one was authored. */
  band?: 'strong' | 'developing' | 'weak';
  notes: string;          // short interviewer-side note ("misread the question", etc.)
}

/** Which node of the flow the engine is currently at (1:1 with the flow diagram). */
export type EngineNode =
  | 'greet'      // greeting + unmarked opener (not scored)
  | 'ask'        // a question is live, awaiting the first attempt
  | 'probe'      // they answered; push for working / reasoning
  | 'hint_retry' // wrong/stuck: gave a hint, awaiting their single retry
  | 'wrap'       // winding down
  | 'done';      // report

/** Full resumable engine state — persisted to `interview_sessions.engine_state` (JSONB). */
export interface SessionState {
  subject: string;
  mode: Mode;
  node: EngineNode;
  /** Practice: the chosen strand. Mock: undefined (samples all strands). */
  currentTopic?: string;
  difficulty: Difficulty;
  questionIndex: number;        // how many scored questions have been asked
  askedIds: string[];           // dedupe across the run
  /** The question currently on the table (null at greet/wrap/done). */
  currentQuestion: BankQuestion | null;
  hintsUsed: number;            // hints spent on the current question
  /** Best capture of what the student has said about the current question so far (across probe/retry). */
  pendingAnswer?: string;
  evidence: Evidence[];
  /** Seed for deterministic-but-varied question selection (varies per session). */
  seed: number;
  /** Target number of scored questions before wrap (mock). */
  targetQuestions: number;
}

/** Actions the client can send the brain each turn. */
export type BrainAction =
  | 'start'
  | 'answer'
  | 'skip'
  | 'repeat'
  | 'switch_topic'
  | 'set_mode'
  | 'end';

/** Request body for the interview-brain edge function. */
export interface BrainRequest {
  sessionId: string;
  action: BrainAction;
  studentText?: string;
  /** For 'start' / 'set_mode' / 'switch_topic'. */
  mode?: Mode;
  topic?: string;
}

/** Response the brain returns; `say` is spoken verbatim by the avatar. */
export interface BrainResponse {
  say: string;
  done: boolean;
  uiState: {
    mode: Mode;
    topic?: string;
    difficulty: Difficulty;
    questionIndex: number;
    targetQuestions: number;
  };
}
