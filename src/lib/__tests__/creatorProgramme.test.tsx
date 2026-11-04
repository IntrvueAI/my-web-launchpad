import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as programme from "@/lib/creatorProgramme";
import type { AdminOverview, Creator, CreatorView, ProgrammeCosts } from "@/lib/creatorProgramme";

const api = vi.hoisted(() => ({
  creators: vi.fn(), overview: vi.fn(), payouts: vi.fn(), pay: vi.fn(), saveLink: vi.fn(), saveCosts: vi.fn(),
  reverseCommission: vi.fn(), recordVisit: vi.fn(), attach: vi.fn(), inviteCreator: vi.fn(), updateCreator: vi.fn(),
  ownsLink: vi.fn(async () => false), lookup: vi.fn(),
}));
const toasts = vi.hoisted(() => ({ toast: vi.fn() }));
const edge = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/hooks/use-toast", async () => ({ ...(await vi.importActual<object>("@/hooks/use-toast")), toast: toasts.toast }));
vi.mock("@/lib/invokeEdgeFunction", () => ({ invokeEdgeFunction: edge.invoke }));
const auth = vi.hoisted(() => ({ user: null as null | { id: string; user_metadata?: Record<string, unknown> } }));
vi.mock("@/lib/creatorProgramme", async () => {
  const actual = await vi.importActual<typeof import("@/lib/creatorProgramme")>("@/lib/creatorProgramme");
  return { ...actual, creatorApi: { ...actual.creatorApi, ...api } };
});
vi.mock("@/hooks/useAdminStatus", () => ({ useAdminStatus: () => ({ isAdmin: true, isLoading: false }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
import AdminCreators from "@/pages/AdminCreators";
import ReferralLanding, { referralRedirect } from "@/pages/ReferralLanding";
import RedeemCode, { codeElsewhere } from "@/pages/RedeemCode";
import { CreatorDashboardView } from "@/components/creators/CreatorDashboardView";
import { useReferralAttachment } from "@/hooks/useReferralAttachment";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const costs: ProgrammeCosts = { stripe_percent_bp: 150, stripe_fixed_pence: 20, medicine_cost_per_credit_pence: 120, school_cost_per_credit_pence: 0 };
const terms = { discount_enabled: true, discount_percent: 10, commission_type: "percent" as const, commission_percent: 20, commission_fixed_pence: 0, commission_scope: "first_purchase" as const };
const fullMmi = { pence: 3499, credits: 6, platform: "medicine" as const };
const creator: Creator = {
  id: "c1", user_id: "u1", email: "sam@example.test", name: "Sam", status: "active", stripe_account_id: "acct_1", payout_status: "verified",
  created_at: "2026-10-01T00:00:00Z",
  creator_links: [{ id: "l1", creator_id: "c1", code: "studywithsam", platform: "medicine", label: "YouTube", active: true, created_at: "2026-10-01T00:00:00Z", ...terms }],
};
const overview: AdminOverview = {
  costs,
  links: [{ linkId: "l1", creatorId: "c1", visits: 40, signups: 8, payingCustomers: 2, orders: 2, revenuePence: 3848, credits: 7, discountPence: 350, holdPence: 140, readyPence: 630, paidPence: 0, reversedPence: 0 }],
  recent: [
    { id: "k1", date: "2026-10-20T10:00:00Z", creatorId: "c1", linkId: "l1", platform: "medicine", credits: 1, listPricePence: 699, discountPence: 0, amountPaidPence: 699, commissionPence: 140, status: "pending", availableAt: "2099-01-01T00:00:00Z", reversedReason: null },
    { id: "k2", date: "2026-09-01T10:00:00Z", creatorId: "c1", linkId: "l1", platform: "medicine", credits: 6, listPricePence: 3499, discountPence: 350, amountPaidPence: 3149, commissionPence: 630, status: "pending", availableAt: "2026-10-01T10:00:00Z", reversedReason: null },
  ],
};

async function render(ui: JSX.Element, path = "/") {
  const node = document.createElement("div");
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>));
  await act(async () => {});
  return node;
}
const button = (node: HTMLElement, text: string | RegExp) =>
  [...node.querySelectorAll("button")].find((b) => (typeof text === "string" ? b.textContent?.trim() === text : text.test(b.textContent ?? "")))!;
const type = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
};
beforeEach(() => {
  api.creators.mockResolvedValue([creator]);
  api.overview.mockResolvedValue(overview);
  api.payouts.mockResolvedValue([]);
  api.ownsLink.mockResolvedValue(false);
});
afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); auth.user = null; });

describe("Creator programme maths", () => {
  it("splits a sale the way the server does, with our costs, margin and markup", () => {
    expect(programme.splitSale(fullMmi, terms, costs)).toEqual({
      listPrice: 3499, discount: 350, customerPays: 3149, creatorEarns: 630, stripeFee: 67, delivery: 720, ourNet: 1732,
      marginPercent: 55, markupPercent: 122.2,
    });
    expect(programme.splitSale(fullMmi, terms, costs, false)).toMatchObject({ discount: 0, customerPays: 3499, creatorEarns: 0 });
    expect(programme.splitSale(fullMmi, { ...terms, commission_scope: "twelve_months" }, costs, false).creatorEarns).toBe(700);
    expect(programme.splitSale({ pence: 699, credits: 1, platform: "medicine" }, { ...terms, commission_type: "fixed", commission_fixed_pence: 1000 }, costs).creatorEarns).toBe(629);
  });
  it("never allocates more than the customer paid", () => {
    for (const d of [0, 25, 50]) for (const s of [0, 30, 50]) {
      const r = programme.splitSale(fullMmi, { ...terms, discount_percent: d, commission_percent: s }, { ...costs, medicine_cost_per_credit_pence: 0 });
      expect(r.creatorEarns + r.stripeFee + r.ourNet).toBe(r.customerPays);
    }
  });
  it("totals a link's recorded revenue, allocation and estimated costs", () => {
    expect(programme.linkEconomics(overview.links[0], "medicine", costs)).toEqual({
      revenue: 3848, allocated: 770, fees: 98, delivery: 840, ourNet: 2140, discount: 350,
    });
  });
  it("accepts tidy codes and builds a link per platform", () => {
    expect(["studywithsam", "mmi-tutor-jo", "abc"].every(programme.isValidReferralCode)).toBe(true);
    expect(["ab", "-sam", "sam-", "Sam", "sam--jo", "sam jo", "s".repeat(25)].some(programme.isValidReferralCode)).toBe(false);
    expect(programme.normaliseCode("Study With Sam!")).toBe("study-with-sam");
    expect(programme.referralUrl("medicine", "sam")).toBe("https://mmipractice.co.uk/r/sam");
    expect(programme.referralUrl("11plus", "sam")).toBe("https://intrvue.ai/r/sam");
  });
  it("remembers a referral in this browser for 30 days", () => {
    programme.rememberReferral("studywithsam");
    expect(programme.storedReferral()).toBe("studywithsam");
    expect(programme.storedReferral(Date.now() + 31 * 86400000)).toBeNull();
    programme.forgetReferral();
    expect(programme.storedReferral()).toBeNull();
  });
  it("builds the creator's view from admin data with hold and ready earnings", () => {
    const view = programme.previewView(creator, overview, [], Date.parse("2026-10-24T00:00:00Z"));
    expect(view.earnings).toEqual({ holdPence: 140, readyPence: 630, paidPence: 0 });
    expect(view.recent.map((r) => r.status)).toEqual(["hold", "ready"]);
    expect(view.links[0]).toMatchObject({ code: "studywithsam", signups: 8, payingCustomers: 2, earnedPence: 770 });
  });
});

describe("Creator dashboard", () => {
  const view = (payoutStatus: CreatorView["creator"]["payoutStatus"]): CreatorView =>
    ({ ...programme.previewView(creator, overview, [], Date.parse("2026-10-24T00:00:00Z")), creator: { id: "c1", name: "Sam", status: "active", payoutStatus, stripeConnected: payoutStatus !== "not_connected" } });
  it("shows links, sign-ups, earnings and the Stripe steps, without customer details", async () => {
    const onConnect = vi.fn();
    const node = await render(<CreatorDashboardView view={view("not_connected")} actions={{ onConnect, onRefresh: vi.fn(), onStripeDashboard: vi.fn(), busy: null }} />);
    expect(node.textContent).toContain("https://mmipractice.co.uk/r/studywithsam");
    expect(node.textContent).toContain("Your audience gets 10% off their first purchase");
    expect(node.textContent).toContain("You earn 20% of what they pay, first purchase only");
    expect(node.textContent).toContain("£6.30");
    expect(node.textContent).toContain("Create your Stripe payout account");
    expect(node.textContent).toContain("never who bought it");
    await act(async () => button(node, /Set up payouts with Stripe/).click());
    expect(onConnect).toHaveBeenCalled();
  });
  it("offers the Stripe dashboard once payouts are ready, and disables everything in the admin preview", async () => {
    const node = await render(<CreatorDashboardView view={view("verified")} preview />);
    expect(button(node, /Open your Stripe dashboard/).disabled).toBe(true);
    expect(node.textContent).toContain("Preview: buttons are disabled");
  });
});

describe("Admin creator programme", () => {
  it("shows revenue, creator allocation, our costs and net from recorded data", async () => {
    const node = await render(<AdminCreators />);
    expect(node.textContent).toContain("£38.48");
    expect(node.textContent).toContain("£7.70");
    expect(node.textContent).toContain("20% of revenue");
    expect(node.textContent).toContain("£21.40");
    expect(node.textContent).toContain("/r/studywithsam");
  });
  it("edits a link's terms with live per-interview economics, then saves", async () => {
    api.saveLink.mockResolvedValue({ ...creator.creator_links[0], discount_percent: 15 });
    const node = await render(<AdminCreators />);
    await act(async () => (node.querySelector('[role="tab"][aria-controls*="creators"], button[id*="creators"]') as HTMLButtonElement | null)?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    await act(async () => {});
    expect(node.textContent).toContain("Links and terms");
    await act(async () => button(node, /Per-interview economics/).click());
    expect(node.textContent).toContain("£31.49");
    const discount = node.querySelector<HTMLInputElement>('input[type="number"]')!;
    await type(discount, "20");
    expect(node.textContent).toContain("£27.99");
    await act(async () => button(node, /Save link/).click());
    expect(api.saveLink).toHaveBeenCalledWith(expect.objectContaining({ id: "l1", discount_percent: 20 }));
  });
  it("pays a verified creator only after confirming the amount", async () => {
    api.pay.mockResolvedValue({ amountPence: 630, transferId: "tr_1" });
    const node = await render(<AdminCreators />);
    await act(async () => (node.querySelector('button[id*="creators"]') as HTMLButtonElement).dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    await act(async () => button(node, "Pay £6.30").click());
    expect(api.pay).not.toHaveBeenCalled();
    expect(node.textContent).toContain("This moves real money");
    await act(async () => button(node, "Confirm transfer").click());
    expect(api.pay).toHaveBeenCalledWith("c1");
    expect(node.textContent).toContain("Sent £6.30 to Sam's Stripe account");
  });
});

describe("Referral links", () => {
  it("welcomes the visitor with the creator's offer and remembers the link", async () => {
    api.recordVisit.mockResolvedValue({ code: "studywithsam", platform: "11plus", creator: "Sam", discountPercent: 10 });
    const node = await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/StudyWithSam");
    expect(api.recordVisit).toHaveBeenCalledWith("studywithsam");
    expect(node.querySelector("h1")?.textContent).toBe("Sam invited you to intrvue.ai");
    expect(node.textContent).toContain("10% off your first purchase");
    expect(programme.storedReferral()).toBe("studywithsam");
  });
  it("never redirects a link to the page it is already on (the reload loop)", () => {
    const school = { code: "dillon", platform: "11plus" as const, creator: "Dillon", discountPercent: 10 };
    const medicine = { ...school, platform: "medicine" as const };
    expect(referralRedirect(school, "combined", "https://intrvue.ai/r/dillon")).toBeNull();
    expect(referralRedirect(school, "11plus", "https://intrvue.ai/r/dillon")).toBeNull();
    expect(referralRedirect(medicine, "combined", "https://my-app.lovable.app/r/dillon")).toBeNull();
    expect(referralRedirect(medicine, "11plus", "https://intrvue.ai/r/dillon")).toBe("https://mmipractice.co.uk/r/dillon?handover=1");
    expect(referralRedirect(school, "medicine", "https://mmipractice.co.uk/r/dillon")).toBe("https://intrvue.ai/r/dillon?handover=1");
    expect(referralRedirect(school, "medicine", "https://intrvue.ai/r/dillon")).toBeNull();
  });
  it("counts a visit once per tab, even when the page is reloaded", async () => {
    api.recordVisit.mockResolvedValue({ code: "dillon", platform: "11plus", creator: "Dillon", discountPercent: 10 });
    const open = () => render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/dillon");
    await open();
    document.body.innerHTML = "";
    const again = await open();
    expect(api.recordVisit).toHaveBeenCalledTimes(1);
    expect(again.querySelector("h1")?.textContent).toBe("Dillon invited you to intrvue.ai");
  });
  it("shows the creator their own link instead of treating it as a referral", async () => {
    api.recordVisit.mockResolvedValue({ code: "dillon", platform: "11plus", creator: "Dillon", discountPercent: 10 });
    api.ownsLink.mockResolvedValue(true);
    auth.user = { id: "creator-user" };
    const node = await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/dillon");
    expect(node.querySelector("h1")?.textContent).toBe("This is your link, Dillon");
    expect(node.textContent).toContain("Opening it yourself doesn't count");
    expect(node.querySelector('a[href="/creator"]')).not.toBeNull();
    expect(programme.storedReferral()).toBeNull();
  });
  it("says so when a link is not active", async () => {
    api.recordVisit.mockResolvedValue(null);
    const node = await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/nobody");
    expect(node.querySelector("h1")?.textContent).toBe("This link isn't active");
    expect(programme.storedReferral()).toBeNull();
  });
  it("attaches the stored link after sign-in, says the discount applies and then forgets it", async () => {
    programme.rememberReferral("studywithsam");
    api.attach.mockResolvedValue({ attached: true, creator: "Sam", platform: "medicine", discountPercent: 10 });
    auth.user = { id: "u2" };
    const Probe = () => { useReferralAttachment(); return null; };
    await render(<Probe />);
    expect(api.attach).toHaveBeenCalledWith("studywithsam");
    expect(programme.storedReferral()).toBeNull();
    expect(toasts.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "10% off your first purchase" }));
  });
  it("tells the person after sign-in when the link couldn't be used", async () => {
    programme.rememberReferral("studywithsam");
    api.attach.mockResolvedValue({ attached: false, reason: "already_referred", creator: "Priya" });
    auth.user = { id: "u7" };
    const Probe = () => { useReferralAttachment(); return null; };
    await render(<Probe />);
    expect(toasts.toast).toHaveBeenCalledWith({ title: "Your account already has a creator code", description: "It's Priya's. Each account can use one creator code." });
  });
  it("adds the link to a signed-in account straight away and says the discount applies", async () => {
    api.recordVisit.mockResolvedValue({ code: "dillon", platform: "11plus", creator: "Dillon", discountPercent: 10 });
    api.attach.mockResolvedValue({ attached: true, creator: "Dillon", platform: "11plus", discountPercent: 10 });
    auth.user = { id: "u5" };
    const node = await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/dillon");
    expect(api.attach).toHaveBeenCalledWith("dillon");
    expect(node.textContent).toContain("10% off your first purchase");
    expect(node.textContent).toContain("Dillon's code is on your account");
    expect(node.querySelector('a[href="/?view=credits"]')).not.toBeNull();
    expect(programme.storedReferral()).toBeNull();
  });
  it("tells a signed-in customer who has already bought why the discount doesn't apply", async () => {
    api.recordVisit.mockResolvedValue({ code: "dillon", platform: "11plus", creator: "Dillon", discountPercent: 10 });
    api.attach.mockResolvedValue({ attached: false, reason: "existing_customer", platform: "11plus" });
    auth.user = { id: "u6" };
    const node = await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/dillon");
    expect(node.textContent).toContain("This code is for a first purchase");
    expect(node.textContent).toContain("already bought on intrvue.ai");
    expect(node.querySelector('a[href="/?view=credits"]')).toBeNull();
  });
  it("keeps the link for later when a signed-in account can't be reached", async () => {
    api.recordVisit.mockResolvedValue({ code: "dillon", platform: "11plus", creator: "Dillon", discountPercent: 10 });
    api.attach.mockRejectedValue(new Error("offline"));
    auth.user = { id: "u10" };
    await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/dillon");
    expect(programme.storedReferral()).toBe("dillon");
  });
  it("doesn't count a link handed over from the other domain a second time", async () => {
    api.lookup.mockResolvedValue({ code: "dillon", platform: "11plus", creator: "Dillon", discountPercent: 10 });
    const node = await render(<Routes><Route path="/r/:code" element={<ReferralLanding />} /></Routes>, "/r/dillon?handover=1");
    expect(api.lookup).toHaveBeenCalledWith("dillon");
    expect(api.recordVisit).not.toHaveBeenCalled();
    expect(node.querySelector("h1")?.textContent).toBe("Dillon invited you to intrvue.ai");
  });
  it("uses the code saved at sign-up when the confirmation email is opened on another device, once", async () => {
    api.attach.mockResolvedValue({ attached: true, creator: "Sam", platform: "medicine", discountPercent: 10 });
    auth.user = { id: "u3", user_metadata: { referral_code: "studywithsam" } };
    const Probe = () => { useReferralAttachment(); return null; };
    await render(<Probe />);
    expect(api.attach).toHaveBeenCalledTimes(1);
    expect(api.attach).toHaveBeenCalledWith("studywithsam");
    document.body.innerHTML = "";
    await render(<Probe />);
    expect(api.attach).toHaveBeenCalledTimes(1);
  });
  it("ignores a malformed code saved with an account", async () => {
    auth.user = { id: "u4", user_metadata: { referral_code: "../../admin" } };
    const Probe = () => { useReferralAttachment(); return null; };
    await render(<Probe />);
    expect(api.attach).not.toHaveBeenCalled();
  });
});

describe("Creator code page", () => {
  const sam = { code: "studywithsam", platform: "medicine" as const, creator: "Sam", discountPercent: 10 };
  const page = (path = "/redeem") => render(<Routes><Route path="/redeem" element={<RedeemCode />} /></Routes>, path);
  const submit = (node: HTMLElement) => act(async () => {
    node.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  it("adds a typed code to a signed-in account without counting a link visit", async () => {
    auth.user = { id: "u8" };
    api.lookup.mockResolvedValue(sam);
    api.attach.mockResolvedValue({ attached: true, creator: "Sam", platform: "medicine", discountPercent: 10 });
    const node = await page();
    await type(node.querySelector("input")!, "StudyWithSam ");
    await submit(node);
    expect(api.lookup).toHaveBeenCalledWith("studywithsam");
    expect(api.attach).toHaveBeenCalledWith("studywithsam");
    expect(api.recordVisit).not.toHaveBeenCalled();
    expect(node.textContent).toContain("10% off your first purchase");
    expect(node.querySelector('a[href="/?view=credits"]')).not.toBeNull();
  });
  it("keeps a signed-out visitor's code and brings them back to it after sign-in", async () => {
    api.lookup.mockResolvedValue(sam);
    const node = await page("/redeem?code=studywithsam");
    expect(api.attach).not.toHaveBeenCalled();
    expect(programme.storedReferral()).toBe("studywithsam");
    expect(node.querySelector('a[href^="/auth?"]')?.getAttribute("href")).toContain(encodeURIComponent("/redeem?code=studywithsam"));
  });
  it("explains unknown and malformed codes", async () => {
    auth.user = { id: "u9" };
    api.lookup.mockResolvedValue(null);
    const node = await page("/redeem?code=nobody");
    expect(node.textContent).toContain("This code isn't active");
    await type(node.querySelector("input")!, "!!");
    await submit(node);
    expect(node.querySelector('[role="alert"]')?.textContent).toBe("Codes are 3 to 24 letters, numbers or hyphens.");
    expect(api.attach).not.toHaveBeenCalled();
  });
  it("sends a code for the other product to that product's site", () => {
    expect(codeElsewhere(sam, "11plus")).toBe("https://mmipractice.co.uk/redeem?code=studywithsam");
    expect(codeElsewhere(sam, "medicine")).toBeNull();
    expect(codeElsewhere(sam, "combined")).toBeNull();
  });
});

describe("Creator service errors", () => {
  it("shows the service's own explanation, such as payouts not being switched on yet", async () => {
    const response = new Response(JSON.stringify({ error: "Payout setup isn't available yet." }), { status: 503 });
    edge.invoke.mockResolvedValue({ data: null, error: Object.assign(new Error("The service is temporarily unavailable."), { context: response }) });
    await expect(programme.creatorApi.stripe("connect")).rejects.toThrow("Payout setup isn't available yet.");
  });
  it("keeps the general sign-in message for an expired session", async () => {
    const response = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    edge.invoke.mockResolvedValue({ data: null, error: Object.assign(new Error("Your sign-in has expired."), { context: response }) });
    await expect(programme.creatorApi.stripe("connect")).rejects.toThrow("Your sign-in has expired.");
  });
});
