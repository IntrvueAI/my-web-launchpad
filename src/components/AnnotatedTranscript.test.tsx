import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { AnnotatedTranscript } from "./AnnotatedTranscript";
describe("Transcript evidence highlights", () => {
  it("keeps multiline student answers together and highlights only their exact evidence", () => {
    const transcript =
      "Interviewer: Compare the groups.\nStudent: My first idea.\n\nCompare the groups.\nThen check the evidence.\nInterviewer: Thank you.";
    const quote = "Compare the groups.\nThen check the evidence.";
    const start = transcript.indexOf(quote);
    const node = document.createElement("div");
    const root = createRoot(node);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    try {
      act(() =>
        root.render(
          <AnnotatedTranscript
            transcript={transcript}
            annotations={[
              {
                quote,
                start,
                end: start + quote.length,
                category: "development",
                explanation: "Name a useful comparison.",
              },
              {
                quote: "Compare the groups.",
                start: 13,
                end: 32,
                category: "strength",
                explanation: "Interviewer words must not be assessed.",
              },
            ]}
          />,
        ),
      );
      expect(node.querySelectorAll("[role=button]")).toHaveLength(1);
      expect(node.querySelector("[role=button]")?.textContent).toBe(quote);
      expect(
        node.querySelector("[role=button]")?.getAttribute("aria-label"),
      ).toContain("Feedback on");
      expect(node.textContent).toContain("Even better if");
      expect(node.textContent).not.toContain("Lexical");
    } finally {
      act(() => root.unmount());
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});

describe("Chat-style transcript preview", () => {
  it("shows speakers as left and right bubbles and keeps highlights clickable", async () => {
    const { AnnotatedTranscript } = await import("./AnnotatedTranscript");
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const transcript = "Interviewer: What should happen?\nStudent: I would respect her decision because she has capacity.";
    const quote = "she has capacity";
    const node = document.createElement("div");
    const root = createRoot(node);
    try {
      act(() => root.render(<AnnotatedTranscript chat transcript={transcript} annotations={[{ quote, category: "strength", explanation: "Clear principle." } as never]} />));
      const bubbles = [...node.querySelectorAll(".self-start, .self-end")];
      expect(bubbles.map((b) => b.className.includes("self-end"))).toEqual([false, true]);
      expect(bubbles[0].textContent).toContain("Interviewer");
      expect(bubbles[1].textContent).toMatch(/^YouI would respect/);
      expect(node.textContent).not.toContain("Student:");
      expect(node.querySelector("[role=button]")?.textContent).toBe(quote);
    } finally {
      act(() => root.unmount());
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});
