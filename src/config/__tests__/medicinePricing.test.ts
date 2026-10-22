import { describe, expect, it } from "vitest";
import { INTERVIEW_TYPES, MEDICINE_LIVE_INTERVIEW_IDS, RETIRED_MEDICINE_INTERVIEW_IDS } from "@/config/interviewTypes";
import {
  MEDICINE_CREDIT_PACKS, MEDICINE_INTERVIEW_CREDITS, MEDICINE_PRICE_SUMMARY, medicineInterviewCost, medicinePriceTag,
} from "@/config/medicinePricing";

describe("MMI Practice pricing", () => {
  it("sells a mini interview at £6.99 and the full MMI at £34.99", () => {
    expect(MEDICINE_CREDIT_PACKS.single).toMatchObject({ credits: 1, amountPence: 699 });
    expect(MEDICINE_CREDIT_PACKS.full).toMatchObject({ credits: 6, amountPence: 3499 });
    expect(medicinePriceTag("medicine-mmi-practice")).toBe("6 credits · £34.99");
    for (const id of ["medicine-roleplay-practice", "medicine-motivation-practice", "medicine-data-practice"])
      expect(medicinePriceTag(id)).toBe("1 credit · £6.99");
  });
  it("keeps Ethics & judgement free", () => {
    expect(medicineInterviewCost("medicine-ethics-practice")).toBe(0);
    expect(medicinePriceTag("medicine-ethics-practice")).toBe("Free");
    expect(MEDICINE_PRICE_SUMMARY).toContain("Ethics & judgement: free");
  });
  it("prices every live Medicine interview and matches the catalogue", () => {
    for (const id of MEDICINE_LIVE_INTERVIEW_IDS) {
      expect(MEDICINE_INTERVIEW_CREDITS).toHaveProperty(id);
      expect(INTERVIEW_TYPES[id].costCredits).toBe(MEDICINE_INTERVIEW_CREDITS[id]);
    }
  });
  it("leaves 11+ interviews to their own credits and closes retired Medicine formats", () => {
    expect(medicineInterviewCost("11-plus")).toBeNull();
    expect(medicinePriceTag("maths-interview")).toBeNull();
    expect(INTERVIEW_TYPES["11-plus"].costCredits).toBe(3);
    expect(medicineInterviewCost("medicine-mmi")).toBe("unavailable");
    expect(medicineInterviewCost("medicine-oxford-pilot")).toBe(0);
    expect(RETIRED_MEDICINE_INTERVIEW_IDS.every((id) => medicinePriceTag(id) === null || medicinePriceTag(id) === "Free")).toBe(true);
  });
});
