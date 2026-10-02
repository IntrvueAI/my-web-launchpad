import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  REVIEW_BATCH,
  QUESTION_SOURCES,
  SOURCED_QUESTIONS,
} from "@/data/interview-staging/medicine-sourced-review";
import {
  approvedReviewExport,
  currentReviewStatus,
  reviewFingerprint,
  type QuestionReview,
} from "./questionReview";

Object.defineProperty(globalThis.crypto, "subtle", {
  value: webcrypto.subtle,
  configurable: true,
});
describe("Sourced question approval", () => {
  it("invalidates approval when either wording or source verification changes", async () => {
    const q = SOURCED_QUESTIONS[0],
      s = QUESTION_SOURCES[0];
    const hash = await reviewFingerprint(q, s);
    const review = {
      question_id: q.id,
      status: "approved",
      content_hash: hash,
    } as QuestionReview;
    expect(currentReviewStatus(review, hash)).toBe("approved");
    expect(
      currentReviewStatus(
        review,
        await reviewFingerprint(
          { ...q, question: q.question + " Changed." },
          s,
        ),
      ),
    ).toBe("pending");
    expect(
      currentReviewStatus(
        review,
        await reviewFingerprint(q, { ...s, note: "Verification changed" }),
      ),
    ).toBe("pending");
    expect(currentReviewStatus(review, undefined)).toBe("pending");
  });
  it("exports only currently approved proposals with source and release checks", async () => {
    const hashes = Object.fromEntries(
      await Promise.all(
        SOURCED_QUESTIONS.map(async (q) => [
          q.id,
          await reviewFingerprint(
            q,
            QUESTION_SOURCES.find((s) => s.id === q.sourceId)!,
          ),
        ]),
      ),
    );
    const rows = SOURCED_QUESTIONS.slice(0, 3).map(
      (q, i) =>
        ({
          question_id: q.id,
          content_hash: i === 1 ? "old" : hashes[q.id],
          status: i === 2 ? "rejected" : "approved",
        }) as QuestionReview,
    );
    const result = approvedReviewExport(
      REVIEW_BATCH.id,
      SOURCED_QUESTIONS,
      QUESTION_SOURCES,
      rows,
      hashes,
    );
    expect(result.questions.map((q) => q.id)).toEqual([
      SOURCED_QUESTIONS[0].id,
    ]);
    expect(result.questions[0].source?.url).toMatch(/^https:/);
    expect(result.publicationStatus).toBe("not-published");
  });
  it("keeps every proposal out of both deployed runtime banks", () => {
    for (const slug of ["interview-brain", "generate-interview-feedback"]) {
      const bank = readFileSync(
        `supabase/functions/${slug}/_shared/medicine-bank.json`,
        "utf8",
      );
      const pilots = readFileSync(
        `supabase/functions/${slug}/_shared/medicine-pilot-bank.json`,
        "utf8",
      );
      for (const q of SOURCED_QUESTIONS) {
        expect(bank).not.toContain(q.id);
        expect(pilots).not.toContain(q.id);
      }
    }
  });
  it("has a distinct public example and source locator for every proposal", () => {
    expect(SOURCED_QUESTIONS).toHaveLength(24);
    expect(new Set(SOURCED_QUESTIONS.map((q) => q.id)).size).toBe(24);
    expect(
      new Set(SOURCED_QUESTIONS.map((q) => q.question.toLowerCase())).size,
    ).toBe(24);
    for (const q of SOURCED_QUESTIONS) {
      expect(QUESTION_SOURCES.some((s) => s.id === q.sourceId)).toBe(true);
      expect(q.locator.length).toBeGreaterThan(10);
      if (q.format === "Roleplay")
        expect(q.releaseChecks.join(" ")).toContain("actor pack");
    }
  });
});
