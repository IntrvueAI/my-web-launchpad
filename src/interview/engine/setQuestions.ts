/**
 * Preview 'station-sub-questions': set questions within an MMI station.
 *
 * Real MMI stations rarely have a second main question. Once the first answer has been explored,
 * the interviewer more often moves to set questions on a smaller topic that branches off the
 * scenario. Each station's authored probes are those questions. A probe that presupposes the
 * candidate's answer ("You said…") or is a line spoken in character stays an ordinary follow-up.
 */
import type { BankQuestion, LiveProbe } from './types';

export const SET_QUESTIONS_PREVIEW = 'station-sub-questions';

/** Answers in one thread (the question and one follow-up) before the next set question. */
export const SET_QUESTION_THREAD_ANSWERS = 2;

/** A set question needs time for an answer; with less left, the station runs as before. */
export const SET_QUESTION_MIN_SECONDS = 45;

export function setQuestionsFor(q: BankQuestion | null | undefined): LiveProbe[] {
  if (!q || q.roleplay || /explanation task/i.test(q.questionType ?? '')) return [];
  return (q.liveProbes ?? []).filter((p) => standsAlone(p.probe));
}

function standsAlone(probe: string): boolean {
  const text = probe.trim();
  if (!text || text.startsWith('[')) return false;
  return !/^(?:so does that mean|that sounds like|you (?:said|mentioned|described))\b/i.test(text) && !/\byou said\b/i.test(text);
}

/** How Clara signposts a set question: a related, smaller topic, not a new station. */
export function setQuestionLead(index: number): string {
  return index === 0 ? "I'd like to take this in a slightly different direction." : "Here's a related question.";
}
