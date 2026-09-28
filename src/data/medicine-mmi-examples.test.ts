import { describe, expect, it } from "vitest";
import { MEDICINE_MMI_EXAMPLES, MMI_SOURCES } from "./medicine-mmi-examples";
import { PRACTICE_EXAMPLES } from "./practice-examples";

const station = (id: string) =>
  MEDICINE_MMI_EXAMPLES.find((example) => example.id === id)!;
const number = (value: string | number) => Number(value);

describe("MMI teaching data", () => {
  it("keeps medical links and bookmarked IDs valid without mixing in the 11+ library", () => {
    const ids = MEDICINE_MMI_EXAMPLES.map((example) => example.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const example of MEDICINE_MMI_EXAMPLES) {
      expect(PRACTICE_EXAMPLES.some((school) => school.id === example.id)).toBe(
        false,
      );
      for (const source of example.sources)
        expect(new URL(MMI_SOURCES[source].url).protocol).toBe("https:");
      if (example.data)
        for (const row of example.data.rows)
          expect(row).toHaveLength(example.data.columns.length);
      if (example.format === "Reflection") expect(example.personal).toBe(true);
    }
    expect(PRACTICE_EXAMPLES.every((example) => example.topic === "11+")).toBe(
      true,
    );
  });

  it("derives absolute and relative treatment benefits from the displayed counts", () => {
    const example = station("mmi-absolute-risk");
    const [control, treatment] = example.data!.rows;
    const controlRisk = number(control[2]) / number(control[1]);
    const treatmentRisk = number(treatment[2]) / number(treatment[1]);
    expect(example.calculations![0].expected).toBeCloseTo(
      (controlRisk - treatmentRisk) * 100,
    );
    expect(example.calculations![1].expected).toBeCloseTo(
      ((controlRisk - treatmentRisk) / controlRisk) * 100,
    );
    expect(1 / (controlRisk - treatmentRisk)).toBe(100);
  });

  it("uses all positive screens as the denominator, not all people with disease", () => {
    const example = station("mmi-screening-result");
    const [present, absent] = example.data!.rows;
    const positives = number(present[1]) + number(absent[1]);
    const total = example
      .data!.rows.flatMap((row) => row.slice(1))
      .reduce<number>((sum, value) => sum + number(value), 0);
    expect(total).toBe(1000);
    expect(example.calculations![0].expected).toBe(positives);
    expect(example.calculations![1].expected).toBeCloseTo(
      (number(present[1]) / positives) * 100,
    );
    expect(example.calculations![1].expected).not.toBeCloseTo(
      (number(present[1]) / (number(present[1]) + number(present[2]))) * 100,
    );
  });

  it("weights hospital outcomes by their denominators and preserves the case-mix lesson", () => {
    const example = station("mmi-hospital-comparison");
    const [al, ah, bl, bh] = example.data!.rows;
    const rate = (rows: (string | number)[][]) =>
      (rows.reduce((sum, row) => sum + number(row[2]), 0) /
        rows.reduce((sum, row) => sum + number(row[1]), 0)) *
      100;
    expect(example.calculations![0].expected).toBeCloseTo(rate([al, ah]));
    expect(example.calculations![1].expected).toBeCloseTo(rate([bl, bh]));
    expect(rate([bl, bh])).toBeGreaterThan(rate([al, ah]));
    expect(rate([bl])).toBe(rate([al]));
    expect(rate([bh])).toBeLessThan(rate([ah]));
  });

  it("separates percentage-point and relative changes in missed appointments", () => {
    const example = station("mmi-appointment-reminders");
    const [before, after] = example.data!.rows;
    const beforeRate = (number(before[2]) / number(before[1])) * 100;
    const afterRate = (number(after[2]) / number(after[1])) * 100;
    expect(example.calculations![0].expected).toBeCloseTo(
      beforeRate - afterRate,
    );
    expect(example.calculations![1].expected).toBeCloseTo(
      ((beforeRate - afterRate) / beforeRate) * 100,
    );
    expect(example.calculations![0].unit).toBe("percentage points");
  });
});
