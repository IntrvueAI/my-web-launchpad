/**
 * Creator (affiliate) programme: types, server calls and the sale maths shared by the admin
 * dashboard, the creator dashboard and the referral landing page. The server applies discounts
 * and records commissions; the maths here only explains them.
 */
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { MEDICINE_CREDIT_PACKS } from "@/config/medicinePricing";
import { MEDICINE_ORIGIN, SCHOOL_ORIGIN } from "@/lib/site";

export type CreatorPlatform = "medicine" | "11plus";
export type CreatorStatus = "invited" | "active" | "paused";
export type PayoutStatus = "not_connected" | "pending" | "verified";
export type CommissionType = "percent" | "fixed";
export type CommissionScope = "first_purchase" | "twelve_months";

export interface CreatorLink {
  id: string;
  creator_id: string;
  code: string;
  platform: CreatorPlatform;
  label: string | null;
  active: boolean;
  discount_enabled: boolean;
  discount_percent: number;
  commission_type: CommissionType;
  commission_percent: number;
  commission_fixed_pence: number;
  commission_scope: CommissionScope;
  created_at: string;
}
export interface Creator {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  status: CreatorStatus;
  stripe_account_id: string | null;
  payout_status: PayoutStatus;
  created_at: string;
  creator_links: CreatorLink[];
}
export interface ProgrammeCosts {
  stripe_percent_bp: number;
  stripe_fixed_pence: number;
  medicine_cost_per_credit_pence: number;
  school_cost_per_credit_pence: number;
}
export interface LinkStats {
  linkId: string;
  creatorId: string;
  visits: number;
  signups: number;
  payingCustomers: number;
  orders: number;
  revenuePence: number;
  credits: number;
  discountPence: number;
  holdPence: number;
  readyPence: number;
  paidPence: number;
  reversedPence: number;
}
export interface AdminCommission {
  id: string;
  date: string;
  creatorId: string;
  linkId: string;
  platform: CreatorPlatform;
  credits: number;
  listPricePence: number;
  discountPence: number;
  amountPaidPence: number;
  commissionPence: number;
  status: "pending" | "paid" | "reversed";
  availableAt: string;
  reversedReason: string | null;
}
export interface AdminOverview {
  costs: ProgrammeCosts;
  links: LinkStats[];
  recent: AdminCommission[];
}

export interface CreatorPayoutRow {
  id: string;
  creator_id: string;
  amount_pence: number;
  status: "processing" | "paid" | "failed";
  created_at: string;
  paid_at: string | null;
  failure_reason: string | null;
}

/** The creator's own view, from creator_dashboard(): totals and anonymous activity only. */
export interface CreatorView {
  creator: { id: string; name: string; status: CreatorStatus; payoutStatus: PayoutStatus; stripeConnected: boolean };
  links: {
    id: string; code: string; platform: CreatorPlatform; label: string | null; active: boolean;
    discountEnabled: boolean; discountPercent: number; commissionType: CommissionType; commissionPercent: number;
    commissionFixedPence: number; commissionScope: CommissionScope;
    visits: number; signups: number; payingCustomers: number; earnedPence: number;
  }[];
  earnings: { holdPence: number; readyPence: number; paidPence: number };
  recent: { date: string; platform: CreatorPlatform; credits: number; amountPaidPence: number; commissionPence: number; status: "hold" | "ready" | "paid" | "reversed"; availableAt: string }[];
  payouts: { date: string; amountPence: number; status: "processing" | "paid" | "failed"; paidAt: string | null }[];
}

export const CREATOR_LIMITS = { discountMax: 50, percentMax: 50, fixedMaxPence: 10000, codeMin: 3, codeMax: 24, holdDays: 30 };
export const PLATFORM_LABEL: Record<CreatorPlatform, string> = { medicine: "Medicine", "11plus": "11+" };
export const CREATOR_STATUS_LABEL: Record<CreatorStatus, string> = { invited: "Invited", active: "Active", paused: "Paused" };
export const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  not_connected: "Payouts not set up",
  pending: "Stripe is checking details",
  verified: "Payouts ready",
};
export const SCOPE_LABEL: Record<CommissionScope, string> = {
  first_purchase: "first purchase only",
  twelve_months: "every purchase for 12 months",
};
export const DEFAULT_LINK_TERMS = {
  discount_enabled: true, discount_percent: 10, commission_type: "percent" as CommissionType,
  commission_percent: 20, commission_fixed_pence: 0, commission_scope: "first_purchase" as CommissionScope,
};

/** Lower-case letters, digits and single hyphens; no leading or trailing hyphen. */
export function isValidReferralCode(code: string): boolean {
  return code.length >= CREATOR_LIMITS.codeMin && code.length <= CREATOR_LIMITS.codeMax && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code);
}
export const normaliseCode = (value: string) => value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
export function referralUrl(platform: CreatorPlatform, code: string): string {
  return `${platform === "medicine" ? MEDICINE_ORIGIN : SCHOOL_ORIGIN}/r/${code}`;
}
export function commissionTerms(link: Pick<CreatorLink, "commission_type" | "commission_percent" | "commission_fixed_pence" | "commission_scope">, pence: (n: number) => string): string {
  const amount = link.commission_type === "percent" ? `${link.commission_percent}% of what they pay` : `${pence(link.commission_fixed_pence)} per purchase`;
  return `${amount}, ${SCOPE_LABEL[link.commission_scope]}`;
}

/** Products sold on each platform, for the per-sale economics. */
export const PRODUCTS: { platform: CreatorPlatform; label: string; pence: number; credits: number }[] = [
  { platform: "medicine", label: "Mini interview", pence: MEDICINE_CREDIT_PACKS.single.amountPence, credits: MEDICINE_CREDIT_PACKS.single.credits },
  { platform: "medicine", label: "Full MMI", pence: MEDICINE_CREDIT_PACKS.full.amountPence, credits: MEDICINE_CREDIT_PACKS.full.credits },
  { platform: "11plus", label: "2 credits (topic mock)", pence: 1999, credits: 2 },
  { platform: "11plus", label: "3 credits (full 11+)", pence: 2999, credits: 3 },
  { platform: "11plus", label: "5 credits (bundle)", pence: 4499, credits: 5 },
];

export const costPerCredit = (costs: ProgrammeCosts, platform: CreatorPlatform) =>
  platform === "medicine" ? costs.medicine_cost_per_credit_pence : costs.school_cost_per_credit_pence;
export const stripeFee = (costs: ProgrammeCosts, paidPence: number) =>
  paidPence > 0 ? Math.round((paidPence * costs.stripe_percent_bp) / 10000) + costs.stripe_fixed_pence : 0;

/**
 * Where one sale's money goes, mirroring the server: the discount applies to the first purchase,
 * the creator earns on what the customer paid (never more than that), and only within scope.
 */
export function splitSale(
  product: { pence: number; credits: number; platform: CreatorPlatform },
  link: Pick<CreatorLink, "discount_enabled" | "discount_percent" | "commission_type" | "commission_percent" | "commission_fixed_pence" | "commission_scope">,
  costs: ProgrammeCosts,
  firstPurchase = true,
) {
  const discount = firstPurchase && link.discount_enabled ? Math.round((product.pence * link.discount_percent) / 100) : 0;
  const customerPays = product.pence - discount;
  const earns = firstPurchase || link.commission_scope === "twelve_months";
  const creatorEarns = !earns ? 0
    : link.commission_type === "percent" ? Math.round((customerPays * link.commission_percent) / 100)
    : Math.min(link.commission_fixed_pence, customerPays);
  const fees = stripeFee(costs, customerPays);
  const delivery = product.credits * costPerCredit(costs, product.platform);
  const ourNet = customerPays - fees - delivery - creatorEarns;
  const totalCost = fees + delivery + creatorEarns;
  return {
    listPrice: product.pence, discount, customerPays, creatorEarns, stripeFee: fees, delivery, ourNet,
    marginPercent: customerPays ? Math.round((ourNet / customerPays) * 1000) / 10 : 0,
    markupPercent: totalCost ? Math.round((ourNet / totalCost) * 1000) / 10 : null,
  };
}

/** Totals for a set of links, using recorded revenue and the cost assumptions. */
export function linkEconomics(stats: LinkStats, platform: CreatorPlatform, costs: ProgrammeCosts) {
  const allocated = stats.holdPence + stats.readyPence + stats.paidPence;
  const fees = stats.orders ? Math.round((stats.revenuePence * costs.stripe_percent_bp) / 10000) + stats.orders * costs.stripe_fixed_pence : 0;
  const delivery = stats.credits * costPerCredit(costs, platform);
  const ourNet = stats.revenuePence - allocated - fees - delivery;
  return { revenue: stats.revenuePence, allocated, fees, delivery, ourNet, discount: stats.discountPence };
}

const unwrap = <T,>({ data, error }: { data: T | null; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message);
  return data as T;
};
// The generated database types predate these tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const creatorApi = {
  // Administrators
  creators: async (): Promise<Creator[]> =>
    unwrap(await db.from("creators").select("*, creator_links(*)").order("created_at", { ascending: true })) ?? [],
  overview: async (): Promise<AdminOverview> => unwrap(await db.rpc("admin_creator_overview")),
  inviteCreator: async (input: { name: string; email: string }): Promise<Creator> =>
    unwrap(await db.from("creators").insert({ name: input.name.trim(), email: input.email.trim().toLowerCase() }).select("*, creator_links(*)").single()),
  updateCreator: async (id: string, patch: Partial<Pick<Creator, "name" | "email" | "status">>) =>
    unwrap(await db.from("creators").update(patch).eq("id", id).select("id").single()),
  saveLink: async (link: Partial<CreatorLink> & { creator_id: string }): Promise<CreatorLink> => {
    const { id, created_at: _created, ...fields } = link;
    return unwrap(id
      ? await db.from("creator_links").update(fields).eq("id", id).select("*").single()
      : await db.from("creator_links").insert(fields).select("*").single());
  },
  payouts: async (): Promise<CreatorPayoutRow[]> =>
    unwrap(await db.from("creator_payouts").select("id, creator_id, amount_pence, status, created_at, paid_at, failure_reason").order("created_at", { ascending: false })) ?? [],
  saveCosts: async (costs: ProgrammeCosts) =>
    unwrap(await db.from("programme_costs").update(costs).eq("id", true).select("*").single()),
  reverseCommission: async (id: string, reason: string): Promise<boolean> =>
    unwrap(await db.rpc("reverse_creator_commission", { p_commission_id: id, p_reason: reason })),
  pay: async (creatorId: string) => {
    const { data, error } = await invokeEdgeFunction<{ amountPence: number; transferId: string }>("creator-programme", { body: { action: "payout", creatorId } });
    if (error) throw error;
    return data!;
  },
  // Creators
  claim: async (): Promise<string | null> => unwrap(await db.rpc("claim_creator_account")),
  dashboard: async (): Promise<CreatorView | null> => unwrap(await db.rpc("creator_dashboard")),
  stripe: async (action: "connect" | "status" | "stripe_dashboard") => {
    const { data, error } = await invokeEdgeFunction<{ url?: string; payoutStatus?: PayoutStatus; due?: number }>("creator-programme", { body: { action } });
    if (error) throw error;
    return data ?? {};
  },
  // Visitors and customers
  recordVisit: async (code: string): Promise<{ code: string; platform: CreatorPlatform; creator: string; discountPercent: number } | null> =>
    unwrap(await db.rpc("record_referral_visit", { p_code: code })),
  attach: async (code: string): Promise<{ attached: boolean; reason?: string; creator?: string; discountPercent?: number }> =>
    unwrap(await db.rpc("attach_referral", { p_code: code })),
  myOffer: async (platform: CreatorPlatform): Promise<{ creator: string; discountPercent: number } | null> =>
    unwrap(await db.rpc("get_my_referral_offer", { p_platform: platform })),
};

/** What a creator would see, built from administrator data, for the admin preview. */
export function previewView(creator: Creator, overview: AdminOverview, payouts: CreatorPayoutRow[], now = Date.now()): CreatorView {
  const stats = (id: string) => overview.links.find((l) => l.linkId === id);
  const mine = overview.recent.filter((c) => c.creatorId === creator.id);
  const linkStats = creator.creator_links.map((l) => stats(l.id));
  const sum = (key: "holdPence" | "readyPence" | "paidPence") => linkStats.reduce((n, s) => n + (s?.[key] ?? 0), 0);
  return {
    creator: { id: creator.id, name: creator.name, status: creator.status, payoutStatus: creator.payout_status, stripeConnected: !!creator.stripe_account_id },
    links: creator.creator_links.map((l) => {
      const s = stats(l.id);
      return {
        id: l.id, code: l.code, platform: l.platform, label: l.label, active: l.active,
        discountEnabled: l.discount_enabled, discountPercent: l.discount_percent, commissionType: l.commission_type,
        commissionPercent: l.commission_percent, commissionFixedPence: l.commission_fixed_pence, commissionScope: l.commission_scope,
        visits: s?.visits ?? 0, signups: s?.signups ?? 0, payingCustomers: s?.payingCustomers ?? 0,
        earnedPence: (s?.holdPence ?? 0) + (s?.readyPence ?? 0) + (s?.paidPence ?? 0),
      };
    }),
    earnings: { holdPence: sum("holdPence"), readyPence: sum("readyPence"), paidPence: sum("paidPence") },
    recent: mine.map((c) => ({
      date: c.date, platform: c.platform, credits: c.credits, amountPaidPence: c.amountPaidPence, commissionPence: c.commissionPence, availableAt: c.availableAt,
      status: c.status === "pending" ? (Date.parse(c.availableAt) > now ? "hold" : "ready") : c.status,
    })),
    payouts: payouts.filter((p) => p.creator_id === creator.id).map((p) => ({ date: p.created_at, amountPence: p.amount_pence, status: p.status, paidAt: p.paid_at })),
  };
}

/** The referral code a visitor arrived with, kept in this browser for 30 days. */
const REFERRAL_KEY = "intrvue:referral:v1";
const REFERRAL_DAYS = 30;
export function rememberReferral(code: string) {
  try { localStorage.setItem(REFERRAL_KEY, JSON.stringify({ code, at: Date.now() })); } catch { /* Attribution is best effort. */ }
}
export function storedReferral(now = Date.now()): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(REFERRAL_KEY) || "null");
    if (saved && typeof saved.code === "string" && isValidReferralCode(saved.code) && now - saved.at < REFERRAL_DAYS * 86400000) return saved.code;
  } catch { /* Ignore unreadable storage. */ }
  return null;
}
export function forgetReferral() {
  try { localStorage.removeItem(REFERRAL_KEY); } catch { /* Nothing to clear. */ }
}
