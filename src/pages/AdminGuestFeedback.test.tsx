import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import type { TrialInboxEntry } from "@/lib/guestTrials";
import {
  FeedbackSummary,
  type SummaryFeedback,
} from "@/components/feedback/FeedbackSummary";
// No live Supabase connection is needed to exercise the display boundary.
vi.mock("@/lib/guestTrials", () => ({
  GUEST_HISTORY_INTERVIEW_IDS: [],
  trialApi: vi.fn(),
  trialReviewExperience: { "some-issues": "I had a few issues" },
}));
import { ProductReview } from "./AdminGuestFeedback";

describe("Founder feedback display", () => {
  it("labels tester comments as trial-wide, keeps them separate from AI scores and filters profanity", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    const root = createRoot(node);
    const entry = {
      review: {
        rating: 4,
        experience: "some-issues",
        improvement: "The microphone was shit but the feedback was useful.",
        created_at: "2026-10-01T10:00:00Z",
      },
    } as TrialInboxEntry;
    try {
      act(() => root.render(<ProductReview entry={entry} />));
      expect(node.textContent).toContain("About their whole trial");
      expect(node.textContent).toContain("written by the tester");
      expect(node.textContent).toContain("4/5 usefulness");
      expect(node.textContent).not.toContain("shit");
      expect(node.textContent).not.toContain("Practice score");
      act(() =>
        root.render(<ProductReview entry={{ ...entry, review: null }} />),
      );
      expect(node.textContent).toContain("No product review yet");
      expect(node.textContent).not.toContain("4/5");
    } finally {
      act(() => root.unmount());
    }
  });
  it("shows an unscored assessment without inventing a zero or offering the founder candidate practice actions", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    const root = createRoot(node);
    const feedback = {
      total_score: null,
      detailed_feedback: {
        overall: "Insufficient evidence",
        band_assessment: "",
      },
    } as unknown as SummaryFeedback;
    try {
      act(() =>
        root.render(
          <MemoryRouter>
            <FeedbackSummary
              audience="admin"
              feedback={feedback}
              interviewType="medicine-cambridge-pilot"
            />
          </MemoryRouter>,
        ),
      );
      expect(node.textContent).toContain("AI assessment");
      expect(node.textContent).toContain("Scientific Reasoning");
      expect(node.querySelector('[aria-label="0 of 4 skills assessed"]')).not.toBeNull();
      expect(node.textContent).not.toContain("0/20");
      expect(node.querySelectorAll("a")).toHaveLength(0);
    } finally {
      act(() => root.unmount());
    }
  });
});
