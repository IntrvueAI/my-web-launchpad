import { describe, expect, it } from "vitest";
import {
  addAttempt,
  eligibleQuestions,
  emptyProfile,
  latestAttempts,
  mergeProfiles,
  parseProfile,
  practiceQueue,
  revisitAt,
  weekActivity,
  type PracticeAttempt,
} from "../practice";
import { getStudioBank, SOLO_PROMPT_IDS } from "../bank";
import { growthScenario, GROWTH_DEFAULTS } from "../growth";
import type { BankQuestion } from "../../engine/types";
import { practiceDates, practiceCalendar } from "../calendar";

const now = Date.parse("2026-09-16T12:00:00Z");
const question = (
  id: string,
  patch: Partial<BankQuestion> = {},
): BankQuestion => ({
  id,
  subject: "medicine",
  topic: "motivation-reflection",
  difficulty: 1,
  question: "Why medicine?",
  answer: "Reasoning",
  rubric: { strong: "Specific", developing: "General", weak: "No reasoning" },
  ...patch,
});
const attempt = (
  questionId = "a",
  patch: Partial<PracticeAttempt> = {},
): PracticeAttempt => ({
  id: "attempt-" + questionId,
  questionId,
  completedAt: "2026-09-12T12:00:00Z",
  revisitAt: "2026-09-13T12:00:00Z",
  confidence: 1,
  answer: "An example",
  reflection: "Reflect",
  nextStep: "Use one example",
  seconds: 120,
  checks: [],
  ...patch,
});
describe("Solo practice boundaries and planning", () => {
  it("only loads existing eligible solo prompts and never new school drafts", () => {
    const bank = getStudioBank(now);
    expect(bank.length).toBeGreaterThan(40);
    expect(new Set(bank.map((q) => q.id))).toEqual(SOLO_PROMPT_IDS);
    for (const withheld of [
      "MED-D1",
      "MED-D10",
      "MED-EP-19",
      "MED-E6",
      "MED-TRJ-07",
    ])
      expect(bank.some((q) => q.id === withheld)).toBe(false);
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
    expect(
      bank.every(
        (q) =>
          q.id.startsWith("MED-") &&
          !q.roleplay &&
          !q.clinicalReviewRequired &&
          q.rubric,
      ),
    ).toBe(true);
  });
  it("withholds expired, malformed, flagged, actor and unsupported prompts", () => {
    const bank = [
      question("ok"),
      question("expired", { currentAffairsExpiry: "2026-09-01" }),
      question("bad-date", { currentAffairsExpiry: "garbled" }),
      question("clinical", { clinicalReviewRequired: true }),
      question("wrong-topic", { topic: "roleplay-stations" }),
      question("wrong-subject", { subject: "maths" }),
      question("no-guide", { rubric: undefined }),
    ];
    expect(eligibleQuestions(bank, now).map((q) => q.id)).toEqual(["ok"]);
  });
  it("prioritises due questions, excludes not-due attempts and interleaves fresh skills", () => {
    const profile = {
      ...emptyProfile(),
      attempts: [
        attempt("due"),
        attempt("later", { revisitAt: "2026-10-01T00:00:00Z" }),
      ],
    };
    const bank = [
      question("new-a"),
      question("new-b"),
      question("different", { topic: "data-interpretation", difficulty: 2 }),
      question("due"),
      question("later"),
    ];
    const ids = practiceQueue(bank, profile, now).map(
      (item) => item.question.id,
    );
    expect(ids).toEqual(["due", "new-a", "different", "new-b"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("uses only the latest attempt when deciding whether to revisit", () => {
    const profile = {
      ...emptyProfile(),
      attempts: [
        attempt("a"),
        attempt("a", {
          id: "later",
          completedAt: "2026-09-16T08:00:00Z",
          revisitAt: "2026-09-23T08:00:00Z",
        }),
      ],
    };
    expect(practiceQueue([question("a")], profile, now)).toEqual([]);
    expect(latestAttempts([...profile.attempts].reverse()).get("a")!.id).toBe(
      "later",
    );
  });
  it("applies topic focus to both due and fresh questions", () => {
    const profile = emptyProfile();
    profile.goal.focus = "data-interpretation";
    profile.attempts = [attempt("a")];
    expect(
      practiceQueue(
        [question("a"), question("b", { topic: "data-interpretation" })],
        profile,
        now,
      ).map((x) => x.question.id),
    ).toEqual(["b"]);
  });
  it("uses explicit confidence intervals, without manufacturing a grade", () => {
    expect(
      [1, 2, 3].map(
        (c) => (Date.parse(revisitAt(c as 1 | 2 | 3, now)) - now) / 86400000,
      ),
    ).toEqual([1, 3, 7]);
    expect(attempt()).not.toHaveProperty("score");
  });
  it("caps retained reflections and makes duplicate saves idempotent", () => {
    let profile = emptyProfile();
    for (let i = 0; i < 105; i++)
      profile = addAttempt(profile, attempt(String(i)));
    expect(profile.attempts).toHaveLength(100);
    expect(profile.attempts[0].questionId).toBe("5");
    profile = addAttempt(profile, attempt("104"));
    expect(profile.attempts).toHaveLength(100);
    expect(() =>
      addAttempt(profile, attempt("bad", { confidence: 9 as 1 })),
    ).toThrow();
  });
  it("rejects corrupt and incompatible browser state", () => {
    for (const raw of [
      "{",
      "null",
      "[]",
      '{"version":2}',
      JSON.stringify({
        ...emptyProfile(),
        attempts: [{ ...attempt(), seconds: -1 }],
      }),
    ])
      expect(parseProfile(raw)).toEqual(emptyProfile());
    const saved = addAttempt(emptyProfile(), attempt());
    expect(parseProfile(JSON.stringify(saved))).toEqual(saved);
  });
  it("counts practice days rather than inflating the weekly goal with multiple attempts", () => {
    const sameDay = [
      attempt("a", { completedAt: new Date(now).toISOString() }),
      attempt("b", { completedAt: new Date(now).toISOString() }),
    ];
    const activity = weekActivity(sameDay, now);
    expect(activity).toHaveLength(7);
    expect(activity.filter((d) => d.completed)).toHaveLength(1);
    expect(activity.at(-1)!.completed).toBe(2);
  });
});
describe("Revenue scenario boundaries", () => {
  it("rounds required learners up and reconciles costs with revenue", () => {
    const model = growthScenario(GROWTH_DEFAULTS)!;
    expect(model.subscribers).toBe(2041);
    expect(model.revenue).toBe(100009);
    expect(model.afterFixed).toBeCloseTo(
      model.revenue - model.subscribers * model.costPerCustomer - 2000,
    );
    expect(model.replacements).toBe(164);
    expect(model.replacementVisitors).toBe(8200);
  });
  it("handles unprofitable usage and zero conversion without infinity", () => {
    const model = growthScenario({
      ...GROWTH_DEFAULTS,
      costPerMinute: 5,
      conversionPercent: 0,
    })!;
    expect(model.breakEvenCustomers).toBeNull();
    expect(model.marginPercent).toBeLessThan(0);
    expect(model.replacementVisitors).toBeNull();
    expect(
      growthScenario({
        ...GROWTH_DEFAULTS,
        conversionPercent: 0,
        churnPercent: 0,
      })!.replacementVisitors,
    ).toBe(0);
  });
  it("rejects invalid prices, non-finite values and impossible percentages", () => {
    expect(
      growthScenario({ ...GROWTH_DEFAULTS, price: Number.MIN_VALUE }),
    ).toBeNull();
    for (const patch of [
      { price: 0 },
      { target: -1 },
      { price: NaN },
      { minutes: Infinity },
      { feePercent: 101 },
      { churnPercent: 101 },
      { conversionPercent: 101 },
    ])
      expect(growthScenario({ ...GROWTH_DEFAULTS, ...patch })).toBeNull();
  });
});
describe("Practice calendar and story compatibility", () => {
  it("merges backups without duplicates and preserves the current plan by default", () => {
    const current = {
      ...emptyProfile(),
      attempts: [attempt("a")],
      bookmarks: ["a"],
    };
    const backup = {
      ...emptyProfile(),
      attempts: [attempt("a"), attempt("b")],
      bookmarks: ["a", "b"],
    };
    backup.goal.minutes = 15;
    const merged = mergeProfiles(current, backup);
    expect(merged.attempts).toHaveLength(2);
    expect(merged.bookmarks).toEqual(["a", "b"]);
    expect(merged.goal.minutes).toBe(5);
    expect(mergeProfiles(merged, backup).attempts).toHaveLength(2);
    expect(mergeProfiles(current, backup, true).goal.minutes).toBe(15);
  });
  it("keeps the newer experience when a backup and local notes share an id", () => {
    const story = {
      id: "story",
      title: "A team experience",
      skill: "teamwork" as const,
      situation: "A difficult task",
      action: "Asked for help",
      outcome: "Shared the work",
      learning: "Ask earlier",
      updatedAt: "2026-09-16T12:00:00Z",
    };
    const current = { ...emptyProfile(), experiences: [story] };
    const backup = {
      ...emptyProfile(),
      experiences: [
        { ...story, learning: "Old note", updatedAt: "2026-09-15T12:00:00Z" },
      ],
    };
    expect(mergeProfiles(current, backup).experiences[0].learning).toBe(
      "Ask earlier",
    );
    expect(mergeProfiles(backup, current).experiences[0].learning).toBe(
      "Ask earlier",
    );
  });
  it("generates real calendar dates across month boundaries and DST changes", () => {
    const goal = emptyProfile().goal;
    expect(practiceDates(goal, "2026-10-24")).toEqual([
      "2026-10-24",
      "2026-10-26",
      "2026-10-28",
      "2026-10-31",
      "2026-11-02",
      "2026-11-04",
    ]);
    expect(practiceDates({ ...goal, days: 7 }, "2026-09-16")).toHaveLength(14);
  });
  it("stops before an interview and does not emit past plans for a past interview", () => {
    const goal = { ...emptyProfile().goal, interviewDate: "2026-09-19" };
    expect(practiceDates(goal, "2026-09-16")).toEqual([
      "2026-09-16",
      "2026-09-18",
    ]);
    expect(
      practiceDates({ ...goal, interviewDate: "2026-09-15" }, "2026-09-16"),
    ).toEqual([]);
    expect(practiceDates(goal, "garbled")).toEqual([]);
  });
  it("exports all-day events with unique dates, exclusive end dates and valid line folding", () => {
    const ics = practiceCalendar(emptyProfile().goal, "2026-09-16", now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(6);
    expect(ics).toContain(
      "DTSTART;VALUE=DATE:20260916\r\nDTEND;VALUE=DATE:20260917",
    );
    expect(ics).toContain("DTSTAMP:20260916T120000Z");
    expect(
      ics
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    expect(ics).not.toContain("VALARM");
  });
  it("loads earlier profiles without a story bank and retains existing reflections", () => {
    const profile = { ...emptyProfile(), attempts: [attempt()] };
    delete (profile as Partial<typeof profile>).experiences;
    const restored = parseProfile(JSON.stringify(profile));
    expect(restored.experiences).toEqual([]);
    expect(restored.attempts).toHaveLength(1);
  });
});
