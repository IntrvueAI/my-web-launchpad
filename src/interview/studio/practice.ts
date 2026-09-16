import { z } from "zod";
import type { BankQuestion } from "../engine/types";

export const TOPICS: Record<string, string> = {
  "motivation-reflection": "Motivation & reflection",
  "teamwork-resilience-judgement": "Teamwork & resilience",
  "ethics-professionalism": "Professional judgement",
  "ethics-scenarios": "Ethical reasoning",
  "data-interpretation": "Evidence & data",
};
export const CONFIDENCE = [
  "Needs another attempt",
  "Getting there",
  "Ready to stretch",
] as const;
export const REVIEW_DAYS = [1, 3, 7] as const;
const isoDate = z.string().datetime();
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)));
export const attemptSchema = z.object({
  id: z.string().min(1).max(100),
  questionId: z.string().min(1).max(100),
  completedAt: isoDate,
  revisitAt: isoDate,
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  answer: z.string().max(10000),
  reflection: z.string().max(2000),
  nextStep: z.string().max(500),
  seconds: z.number().int().min(0).max(3600),
  checks: z.array(z.string().max(50)).max(4),
});
export const experienceSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(120),
  skill: z.enum(["reflection", "teamwork", "communication", "judgement"]),
  situation: z.string().max(1500),
  action: z.string().max(1500),
  outcome: z.string().max(1500),
  learning: z.string().max(1500),
  updatedAt: isoDate,
});
export type PracticeExperience = z.infer<typeof experienceSchema>;
export const profileSchema = z.object({
  version: z.literal(1),
  goal: z.object({
    minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
    days: z.union([z.literal(3), z.literal(5), z.literal(7)]),
    focus: z.string().max(100),
    school: z.enum(["general", "oxford", "cambridge", "imperial"]),
    interviewDate: day.or(z.literal("")),
  }),
  bookmarks: z.array(z.string().max(100)).max(250),
  attempts: z.array(attemptSchema).max(100),
  experiences: z.array(experienceSchema).max(30).default([]),
});
export type PracticeAttempt = z.infer<typeof attemptSchema>;
export type PracticeProfile = z.infer<typeof profileSchema>;
export function emptyProfile(): PracticeProfile {
  return {
    version: 1,
    goal: {
      minutes: 5,
      days: 3,
      focus: "all",
      school: "general",
      interviewDate: "",
    },
    bookmarks: [],
    attempts: [],
    experiences: [],
  };
}
export function parseProfile(raw: string | null): PracticeProfile {
  try {
    const parsed = profileSchema.safeParse(JSON.parse(raw ?? "null"));
    return parsed.success ? parsed.data : emptyProfile();
  } catch {
    return emptyProfile();
  }
}
/** Only existing bundled solo discussion tasks. Never imports the draft bank or actor scripts. */
export function eligibleQuestions(
  bank: BankQuestion[],
  now = Date.now(),
): BankQuestion[] {
  return bank.filter(
    (q) =>
      q.subject === "medicine" &&
      Object.prototype.hasOwnProperty.call(TOPICS, q.topic) &&
      !q.roleplay &&
      !q.clinicalReviewRequired &&
      !!q.rubric &&
      (!q.currentAffairsExpiry || Date.parse(q.currentAffairsExpiry) >= now),
  );
}
export function latestAttempts(
  attempts: PracticeAttempt[],
): Map<string, PracticeAttempt> {
  const latest = new Map<string, PracticeAttempt>();
  for (const a of attempts)
    if (
      !latest.has(a.questionId) ||
      a.completedAt > latest.get(a.questionId)!.completedAt
    )
      latest.set(a.questionId, a);
  return latest;
}
export function addAttempt(
  profile: PracticeProfile,
  attempt: PracticeAttempt,
): PracticeProfile {
  const valid = attemptSchema.parse(attempt);
  return {
    ...profile,
    attempts: [
      ...profile.attempts.filter((a) => a.id !== valid.id),
      valid,
    ].slice(-100),
  };
}
export function mergeProfiles(
  destination: PracticeProfile,
  incoming: PracticeProfile,
  restorePlan = false,
): PracticeProfile {
  const attempts = new Map(incoming.attempts.map((a) => [a.id, a]));
  for (const a of destination.attempts) attempts.set(a.id, a);
  const experiences = new Map(incoming.experiences.map((e) => [e.id, e]));
  for (const e of destination.experiences) {
    const imported = experiences.get(e.id);
    if (!imported || e.updatedAt >= imported.updatedAt)
      experiences.set(e.id, e);
  }
  return {
    version: 1,
    goal: restorePlan ? incoming.goal : destination.goal,
    attempts: [...attempts.values()]
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .slice(-100),
    experiences: [...experiences.values()]
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(-30),
    bookmarks: [
      ...new Set([...destination.bookmarks, ...incoming.bookmarks]),
    ].slice(0, 250),
  };
}
export function revisitAt(confidence: 1 | 2 | 3, now: number): string {
  return new Date(now + REVIEW_DAYS[confidence - 1] * 86400000).toISOString();
}
/** Due reflections, then unseen tasks. No inferred admissions score or opaque mastery model. */
export function practiceQueue(
  bank: BankQuestion[],
  profile: PracticeProfile,
  now = Date.now(),
): { question: BankQuestion; reason: string }[] {
  const latest = latestAttempts(profile.attempts);
  const pool = eligibleQuestions(bank, now).filter(
    (q) => profile.goal.focus === "all" || q.topic === profile.goal.focus,
  );
  const due = pool
    .filter(
      (q) => latest.has(q.id) && Date.parse(latest.get(q.id)!.revisitAt) <= now,
    )
    .sort((a, b) =>
      latest.get(a.id)!.revisitAt.localeCompare(latest.get(b.id)!.revisitAt),
    );
  const fresh = pool
    .filter((q) => !latest.has(q.id))
    .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
  // Alternate topics within each level so one long strand cannot monopolise the plan.
  const varied: BankQuestion[] = [];
  while (fresh.length) {
    const last = varied.at(-1)?.topic;
    let i = fresh.findIndex(
      (q) => q.topic !== last && q.difficulty <= fresh[0].difficulty + 1,
    );
    if (i < 0) i = 0;
    varied.push(fresh.splice(i, 1)[0]);
  }
  return [
    ...due.map((question) => ({ question, reason: "Ready to revisit" })),
    ...varied.map((question) => ({ question, reason: "A fresh perspective" })),
  ];
}
export function localDay(time: number | string): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function weekActivity(
  attempts: PracticeAttempt[],
  now = Date.now(),
): { day: string; completed: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + i);
    const key = localDay(date.getTime());
    return {
      day: key,
      completed: attempts.filter((a) => localDay(a.completedAt) === key).length,
    };
  });
}
export const REVIEW_CHECKS = [
  { id: "direct", label: "I answered the actual question." },
  { id: "reason", label: "I explained why, with an example or evidence." },
  {
    id: "perspective",
    label: "I considered uncertainty or another perspective.",
  },
  { id: "next", label: "I made my next step or conclusion clear." },
];
