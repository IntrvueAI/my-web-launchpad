import { describe, expect, it } from "vitest";
import { KEY_CONCEPTS, conceptsIn } from "./KeyConcepts";

describe("Key concepts", () => {
  it("finds concepts that actually arose and nothing else", () => {
    const ids = conceptsIn("An elderly patient with full mental capacity refuses a blood transfusion. I would respect her autonomy and check consent.").map((c) => c.id);
    expect(ids).toEqual(["autonomy", "consent", "capacity"]);
    expect(conceptsIn("Tell me about a time you led a team.")).toEqual([]);
  });
  it("links every concept to an https source from an official or professional body", () => {
    for (const c of KEY_CONCEPTS) expect(c.source.url).toMatch(/^https:\/\/(?:www\.gmc-uk\.org|www\.nhs\.uk|learning\.nspcc\.org\.uk|www\.bma\.org\.uk)\//);
  });
});
