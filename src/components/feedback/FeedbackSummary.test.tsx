import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { FeedbackSummary } from "./FeedbackSummary";
import type { FeedbackData } from "@/types/interview";

describe("Concise interview feedback", () => {
  it("shows unassessed skills without a misleading total and reveals the supporting quote", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    const feedback: FeedbackData = {
      total_score: null,
      pattern_recognition_score: 3,
      logical_deduction_score: null,
      mathematical_logic_score: null,
      clarity_of_thought_score: null,
      detailed_feedback: {
        overall: "You explained an assumption.",
        band_assessment: "Partial assessment",
        pattern_recognition: "Check it against another observation.",
        evidence_quotes: {
          pattern_recognition_score: "I would compare the groups.",
        },
      },
    };
    try {
      act(() =>
        root.render(
          <MemoryRouter>
            <FeedbackSummary
              feedback={feedback}
              interviewType="medicine-oxford-pilot"
            />
          </MemoryRouter>,
        ),
      );
      expect(
        node.querySelector('[aria-label="1 of 4 skills assessed"]'),
      ).not.toBeNull();
      expect(node.textContent).toContain(
        "Unassessed skills are not zero marks",
      );
      expect(node.textContent).not.toContain("/20");
      expect(node.textContent?.match(/Not assessed/g)).toHaveLength(3);
      const button = [...node.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Scientific Reasoning"),
      )!;
      act(() => button.click());
      expect(node.querySelector("blockquote")?.textContent).toContain(
        "I would compare the groups.",
      );
    } finally {
      act(() => root.unmount());
      node.remove();
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
  it("shows the correct academic skills and keeps lengthy evidence behind disclosure controls", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    const feedback: FeedbackData = {
      total_score: 12,
      pattern_recognition_score: 4,
      logical_deduction_score: 3,
      mathematical_logic_score: 3,
      clarity_of_thought_score: 2,
      detailed_feedback: {
        overall: "You compared two explanations.",
        band_assessment: "Developing evidence.",
        pattern_recognition:
          "You tested the mechanism. Explain your assumptions next.",
        logical_deduction: "You noticed uncertainty.",
        mathematical_logic: "Your explanation was organised.",
        clarity_of_thought: "Explain how you changed your mind.",
      },
      transcription: "Student: shit. I would compare the groups.",
      overall_improvement_feedback:
        "Name the observation that would distinguish your two explanations.",
    };
    try {
      act(() =>
        root.render(
          <MemoryRouter>
            <FeedbackSummary
              feedback={feedback}
              interviewType="medicine-oxford-pilot"
            />
          </MemoryRouter>,
        ),
      );
      expect(node.textContent).toContain("Scientific Reasoning");
      expect(node.textContent).not.toContain("Ethical & Clinical Reasoning");
      expect(node.textContent).not.toContain("Student: shit");
      expect(node.querySelector("a")?.getAttribute("href")).toContain(
        "medicine-oxford-pilot",
      );
      expect(node.querySelectorAll("details[open]")).toHaveLength(0);
      const button = [...node.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Scientific Reasoning"),
      )!;
      act(() => button.click());
      expect(node.textContent).toContain("Explain your assumptions next.");
    } finally {
      act(() => root.unmount());
      node.remove();
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});
