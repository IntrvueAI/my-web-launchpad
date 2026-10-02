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
      expect(node.querySelectorAll("button")).toHaveLength(1);
      expect(node.querySelector("button")?.textContent).toBe(quote);
      expect(
        node.querySelector("button")?.getAttribute("aria-label"),
      ).toContain("Feedback on");
      expect(node.textContent).toContain("Try next");
      expect(node.textContent).not.toContain("Lexical");
    } finally {
      act(() => root.unmount());
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    }
  });
});
