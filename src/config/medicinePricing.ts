// The server's price list, shared so the website always shows what the server charges.
export * from "../../supabase/functions/_shared/medicinePricing";
import { MEDICINE_CREDIT_PACKS, formatPence, medicineInterviewCost } from "../../supabase/functions/_shared/medicinePricing";

export const medicineCreditsLabel = (n: number) => `${n} Medicine credit${n === 1 ? "" : "s"}`;

/** "Free", or "1 credit · £6.99" style text for a Medicine interview; null for other products. */
export function medicinePriceTag(interviewType: string): string | null {
  const cost = medicineInterviewCost(interviewType);
  if (cost === null || cost === "unavailable") return null;
  if (cost === 0) return "Free";
  const price = cost === MEDICINE_CREDIT_PACKS.full.credits
    ? MEDICINE_CREDIT_PACKS.full.amountPence
    : MEDICINE_CREDIT_PACKS.single.amountPence * cost;
  return `${cost} credit${cost === 1 ? "" : "s"} · ${formatPence(price)}`;
}

/** One line for dashboards: what each Medicine format costs. */
export const MEDICINE_PRICE_SUMMARY =
  `Mini interview: 1 credit (${formatPence(MEDICINE_CREDIT_PACKS.single.amountPence)}) · Full MMI: ${MEDICINE_CREDIT_PACKS.full.credits} credits (${formatPence(MEDICINE_CREDIT_PACKS.full.amountPence)}) · Ethics & judgement: free`;
