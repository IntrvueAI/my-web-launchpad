import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { FeedbackSummary } from "./FeedbackSummary";
import type { FeedbackData } from "@/types/interview";

describe("In-place Medicine coaching", () => {
  let node: HTMLDivElement, root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    node = document.createElement("div");
    document.body.append(node);
    root = createRoot(node);
  });
  afterEach(() => {
    act(() => root.unmount());
    node.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });
  const feedback: FeedbackData = {
    total_score: null,
    transcription: "Student: I would help them.",
    detailed_feedback: {
      overall: "You offered support.",
      band_assessment: "Partial assessment",
      answer_coaching: {
        question_index: 1,
        original_quote: "I would help them.",
        improved_answer:
          "What is worrying you most? I would listen before suggesting the next step.",
        why: "An open question lets their concern guide the response.",
        structure: [
          "Acknowledge the concern.",
          "Ask an open question.",
          "Agree a realistic next step.",
        ],
      },
    },
  };
  const render = (data: FeedbackData, type = "medicine-roleplay-practice") =>
    act(() =>
      root.render(
        <MemoryRouter>
          <FeedbackSummary feedback={data} interviewType={type} />
        </MemoryRouter>,
      ),
    );
  it("shows the actual excerpt, a suggested improvement and a private practice pad on the result", () => {
    render(feedback);
    expect(node.textContent).toContain("You said");
    expect(node.textContent).toContain("I would help them.");
    expect(node.textContent).toContain("A possible stronger version");
    expect(node.textContent).toContain("Why it helps:");
    expect(node.querySelector('a[href*="examples"]')).toBeNull();
    act(() =>
      [...node.querySelectorAll("button")]
        .find((b) => b.textContent?.includes("Try it in your own words"))!
        .click(),
    );
    expect(node.querySelector("textarea")).not.toBeNull();
    expect(node.textContent).toContain("not scored or saved");
  });
  it("provides a structure for older or unanswered results without inventing something the candidate said", () => {
    render({
      ...feedback,
      detailed_feedback: {
        overall: "Not enough evidence.",
        band_assessment: "Partial",
      },
    });
    expect(node.textContent).toContain("Build your answer, step by step");
    expect(node.textContent).not.toContain("You said");
    expect(node.querySelectorAll("ol li")).toHaveLength(3);
  });
  it("keeps school and academic results outside this focused-station coaching flow", () => {
    render(feedback, "11-plus");
    expect(
      node.querySelector('[aria-label="Improve this station answer"]'),
    ).toBeNull();
    render(feedback, "medicine-oxford-pilot");
    expect(
      node.querySelector('[aria-label="Improve this station answer"]'),
    ).toBeNull();
  });
});
