import { beforeEach, describe, expect, it } from "vitest";
import {
  exportMedicineNotes,
  readMedicineBackup,
  importMedicineNotes,
} from "./medicineTransfer";
import { emptyProfile } from "@/interview/studio/practice";
import { MEDICINE_MMI_EXAMPLES } from "@/data/medicine-mmi-examples";
const id = MEDICINE_MMI_EXAMPLES[0].id;
const example = `intrvue:mmi-example:v1:user:${id}`;
beforeEach(() => localStorage.clear());
describe("Medicine browser notes transfer", () => {
  it("exports only Medicine notes for the selected account, excluding credentials", () => {
    localStorage.setItem("sb-auth-token", "secret");
    localStorage.setItem(
      "intrvue:medicine-studio:v1:other",
      JSON.stringify(emptyProfile()),
    );
    localStorage.setItem(
      example,
      JSON.stringify({ draft: "My answer", followUps: ["", ""], checked: [] }),
    );
    const backup = exportMedicineNotes(localStorage, "user");
    expect(backup.examples[0].attempt.draft).toBe("My answer");
    expect(JSON.stringify(backup)).not.toContain("secret");
    expect(backup.profile).toBeNull();
  });
  it("merges repeat imports without replacing existing answers or sign-in data", () => {
    localStorage.setItem(
      example,
      JSON.stringify({
        draft: "Source answer",
        followUps: ["", ""],
        checked: [],
      }),
    );
    localStorage.setItem(
      "intrvue:medicine-studio:v1:user",
      JSON.stringify(emptyProfile()),
    );
    const backup = exportMedicineNotes(localStorage, "user");
    localStorage.clear();
    localStorage.setItem("sb-auth-token", "preserved");
    importMedicineNotes(localStorage, "user", backup);
    localStorage.setItem(
      example,
      JSON.stringify({
        draft: "Newer answer",
        followUps: ["", ""],
        checked: [],
      }),
    );
    importMedicineNotes(localStorage, "user", backup);
    expect(JSON.parse(localStorage.getItem(example)!).draft).toBe(
      "Newer answer",
    );
    expect(localStorage.getItem("sb-auth-token")).toBe("preserved");
  });
  it("rejects another account and forged station IDs before any writes", () => {
    const backup = exportMedicineNotes(localStorage, "user");
    expect(() => readMedicineBackup(JSON.stringify(backup), "other")).toThrow(
      "same account",
    );
    backup.examples = [
      {
        stationId: "sb-auth-token",
        attempt: { draft: "x", followUps: [], checked: [] },
      },
    ];
    expect(() => importMedicineNotes(localStorage, "user", backup)).toThrow(
      "unknown station",
    );
    expect(localStorage.length).toBe(0);
  });
});
