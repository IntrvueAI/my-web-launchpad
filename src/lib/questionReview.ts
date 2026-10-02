import type {
  QuestionSource,
  ReviewQuestion,
} from "@/data/interview-staging/medicine-sourced-review";
import { RELATED_LIVE_QUESTIONS } from "@/data/interview-staging/medicine-sourced-review";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "rejected";
export interface QuestionReview {
  batch_id: string;
  question_id: string;
  content_hash: string;
  status: ReviewStatus;
  notes: string;
  revision: number;
  updated_at: string;
  reviewer_id: string | null;
}
export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "To review",
  approved: "Approved for release preparation",
  changes_requested: "Changes requested",
  rejected: "Rejected",
};

/** Source verification is part of the approved version, as well as the question wording. */
export async function reviewFingerprint(
  question: ReviewQuestion,
  source: QuestionSource,
) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      question,
      source,
      relatedExistingQuestions: RELATED_LIVE_QUESTIONS[question.id] ?? [],
    }),
  );
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function currentReviewStatus(
  review: QuestionReview | undefined,
  hash: string | undefined,
): ReviewStatus {
  return hash && review?.content_hash === hash ? review.status : "pending";
}
export function approvedReviewExport(
  batchId: string,
  questions: ReviewQuestion[],
  sources: QuestionSource[],
  reviews: QuestionReview[],
  hashes: Record<string, string>,
) {
  return {
    batchId,
    exportedAt: new Date().toISOString(),
    publicationStatus: "not-published",
    purpose:
      "Approved editorial proposals. Complete listed release checks and a separate reviewed content release before live use.",
    questions: questions
      .filter(
        (q) =>
          currentReviewStatus(
            reviews.find((r) => r.question_id === q.id),
            hashes[q.id],
          ) === "approved",
      )
      .map((q) => ({
        ...q,
        source: sources.find((s) => s.id === q.sourceId),
        review: reviews.find((r) => r.question_id === q.id),
        relatedExistingQuestions: RELATED_LIVE_QUESTIONS[q.id] ?? [],
      })),
  };
}
