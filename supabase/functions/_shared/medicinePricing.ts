/**
 * MMI Practice pricing — the single source of truth, enforced by the server and imported by the
 * website. Medicine credits are a separate balance from 11+ credits.
 *
 * One Medicine credit is one mini interview (one station). The full MMI has six stations and
 * costs six credits, sold as a six-credit pack at a bundle price. Ethics & judgement is free.
 */
export type MedicineCreditPackId = "single" | "full";

export const MEDICINE_CREDIT_PACKS: Record<
  MedicineCreditPackId,
  { credits: number; amountPence: number; name: string; note: string }
> = {
  single: {
    credits: 1,
    amountPence: 699,
    name: "1 Medicine credit",
    note: "One 7-minute mini interview",
  },
  full: {
    credits: 6,
    amountPence: 3499,
    name: "Full MMI pack: 6 Medicine credits",
    note: "One full six-station MMI, or six mini interviews",
  },
};

/** Credits each live Medicine interview costs. A type missing here cannot be started as paid. */
export const MEDICINE_INTERVIEW_CREDITS: Record<string, number> = {
  "medicine-mmi-practice": 6,
  "medicine-ethics-practice": 0,
  "medicine-roleplay-practice": 1,
  "medicine-motivation-practice": 1,
  "medicine-data-practice": 1,
};

/** Draft pilots stay restricted to administrators and invited guests, who are never charged. */
export const MEDICINE_UNPRICED_RESTRICTED = new Set([
  "medicine-oxford-pilot",
  "medicine-cambridge-pilot",
  "medicine-imperial-pilot",
]);

/**
 * The credit cost of starting `interviewType`: a number for priced Medicine interviews, `null`
 * for non-Medicine types (11+ keeps its own credits), and `"unavailable"` for Medicine types
 * that can no longer be started (retired formats).
 */
export function medicineInterviewCost(interviewType: string): number | null | "unavailable" {
  if (!interviewType.startsWith("medicine-")) return null;
  if (interviewType in MEDICINE_INTERVIEW_CREDITS) return MEDICINE_INTERVIEW_CREDITS[interviewType];
  if (MEDICINE_UNPRICED_RESTRICTED.has(interviewType)) return 0;
  return "unavailable";
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/** Customer-facing price of one interview, from the pack it is sold in. */
export function medicineInterviewPriceLabel(interviewType: string): string | null {
  const cost = medicineInterviewCost(interviewType);
  if (cost === null || cost === "unavailable") return null;
  if (cost === 0) return "Free";
  if (cost === MEDICINE_CREDIT_PACKS.full.credits) return formatPence(MEDICINE_CREDIT_PACKS.full.amountPence);
  return formatPence(MEDICINE_CREDIT_PACKS.single.amountPence * cost);
}
