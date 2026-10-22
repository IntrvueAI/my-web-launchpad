/**
 * Creator (affiliate) programme: PROTOTYPE ONLY. Nothing here is stored, charged or paid; the
 * admin page uses these helpers with clearly labelled sample data to agree the design first.
 */
import { MEDICINE_CREDIT_PACKS } from "@/config/medicinePricing";

export type CreatorPlatform = "medicine" | "11plus";
export type CreatorStatus = "invited" | "active" | "paused";
export type PayoutStatus = "not_connected" | "pending" | "verified";
export type CommissionScope = "first_purchase" | "twelve_months";

export interface Creator {
  id: string;
  name: string;
  platform: CreatorPlatform;
  code: string;
  status: CreatorStatus;
  discountOn: boolean;
  discountPercent: number;
  sharePercent: number;
  scope: CommissionScope;
  payout: PayoutStatus;
  stats: { clicks: number; signups: number; firstPurchases: number; revenuePence: number; owedPence: number; paidPence: number };
}

export const CREATOR_LIMITS = { discountMax: 50, shareMax: 50, codeMin: 3, codeMax: 24 };
export const CREATOR_STATUS_LABEL: Record<CreatorStatus, string> = { invited: "Invited", active: "Active", paused: "Paused" };
export const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  not_connected: "Payouts not set up",
  pending: "Stripe checking details",
  verified: "Payouts ready",
};
export const SCOPE_LABEL: Record<CommissionScope, string> = {
  first_purchase: "First purchase only",
  twelve_months: "Every purchase for 12 months",
};

const ORIGIN: Record<CreatorPlatform, string> = { medicine: "https://mmipractice.co.uk", "11plus": "https://intrvue.ai" };

/** Lower-case letters, digits and single hyphens; no leading or trailing hyphen. */
export function isValidReferralCode(code: string): boolean {
  return (
    code.length >= CREATOR_LIMITS.codeMin &&
    code.length <= CREATOR_LIMITS.codeMax &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)
  );
}

export function referralUrl(platform: CreatorPlatform, code: string): string {
  return `${ORIGIN[platform]}/r/${code}`;
}

/**
 * How one sale splits. The discount applies to the customer's first purchase only; the creator's
 * share is a percentage of what the customer actually paid. Card fees are not modelled here.
 */
export function splitSale(pricePence: number, creator: Pick<Creator, "discountOn" | "discountPercent" | "sharePercent">, firstPurchase = true) {
  const discount = creator.discountOn && firstPurchase ? Math.round((pricePence * creator.discountPercent) / 100) : 0;
  const customerPays = pricePence - discount;
  const creatorEarns = Math.round((customerPays * creator.sharePercent) / 100);
  return { discount, customerPays, creatorEarns, platformKeeps: customerPays - creatorEarns };
}

export const EXAMPLE_SALES = [
  { label: "Mini interview", pence: MEDICINE_CREDIT_PACKS.single.amountPence },
  { label: "Full MMI", pence: MEDICINE_CREDIT_PACKS.full.amountPence },
];

/** Fictional creators for the prototype. None of these are real people or real numbers. */
export const SAMPLE_CREATORS: Creator[] = [
  {
    id: "c1", name: "Sample: medicine study channel", platform: "medicine", code: "studywithsam", status: "active",
    discountOn: true, discountPercent: 15, sharePercent: 20, scope: "first_purchase", payout: "verified",
    stats: { clicks: 412, signups: 57, firstPurchases: 19, revenuePence: 48_431, owedPence: 4_212, paidPence: 5_474 },
  },
  {
    id: "c2", name: "Sample: interview tutor", platform: "medicine", code: "mmi-tutor-jo", status: "active",
    discountOn: false, discountPercent: 10, sharePercent: 25, scope: "twelve_months", payout: "pending",
    stats: { clicks: 133, signups: 21, firstPurchases: 6, revenuePence: 14_694, owedPence: 3_674, paidPence: 0 },
  },
  {
    id: "c3", name: "Sample: 11+ parent blog", platform: "11plus", code: "elevenplus-mum", status: "invited",
    discountOn: true, discountPercent: 10, sharePercent: 15, scope: "first_purchase", payout: "not_connected",
    stats: { clicks: 0, signups: 0, firstPurchases: 0, revenuePence: 0, owedPence: 0, paidPence: 0 },
  },
  {
    id: "c4", name: "Sample: student society", platform: "medicine", code: "medsoc-outreach", status: "paused",
    discountOn: true, discountPercent: 20, sharePercent: 10, scope: "first_purchase", payout: "verified",
    stats: { clicks: 88, signups: 9, firstPurchases: 2, revenuePence: 4_198, owedPence: 0, paidPence: 420 },
  },
];

/** Sample conversions for the creator's own view: no customer names or emails, ever. */
export const SAMPLE_CONVERSIONS = [
  { date: "2026-10-21", item: "Full MMI", pence: 2974, earned: 595, state: "Pending (refund window)" },
  { date: "2026-10-19", item: "Mini interview", pence: 594, earned: 119, state: "Pending (refund window)" },
  { date: "2026-10-02", item: "Full MMI", pence: 2974, earned: 595, state: "Approved" },
  { date: "2026-09-28", item: "Mini interview", pence: 594, earned: 119, state: "Paid" },
];
