import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ImprovementNotes, parseImprovementNotes } from "./ImprovementNotes";

describe("Improvement notes", () => {
  it("turns older Keep doing / Practise next notes into What went well / Even better if", () => {
    const s = parseImprovementNotes("Keep doing\n- You weighed both sides.\n\n**Practise next:**\n- State your position first.\n- Name what would change your mind.");
    expect(s.map((x) => [x.heading, x.kind, x.lines.length])).toEqual([["What went well", "well", 1], ["Even better if", "ebi", 2]]);
    expect(s[1].lines[0]).toBe("State your position first.");
  });

  it("renders highlighted headings and keeps unheaded notes readable", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    const root = createRoot(node);
    try {
      act(() => root.render(<ImprovementNotes text={"What went well\nClear structure.\n\nEven better if\nAsk open questions earlier."} />));
      expect([...node.querySelectorAll("h4")].map((h) => h.textContent)).toEqual(["What went well", "Even better if"]);
      act(() => root.render(<ImprovementNotes text="Plain note without headings." />));
      expect(node.querySelectorAll("h4")).toHaveLength(0);
      expect(node.textContent).toContain("Plain note without headings.");
    } finally {
      act(() => root.unmount());
    }
  });
});
