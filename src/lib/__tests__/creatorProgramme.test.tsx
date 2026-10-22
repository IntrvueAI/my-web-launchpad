import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  SAMPLE_CONVERSIONS, SAMPLE_CREATORS, isValidReferralCode, referralUrl, splitSale,
} from "@/lib/creatorProgramme";

vi.mock("@/hooks/useAdminStatus", () => ({ useAdminStatus: () => ({ isAdmin: true, isLoading: false }) }));
import AdminCreators from "@/pages/AdminCreators";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("Creator programme maths", () => {
  it("applies the discount to the first purchase only and shares what the customer paid", () => {
    const creator = { discountOn: true, discountPercent: 15, sharePercent: 20 };
    expect(splitSale(3499, creator)).toEqual({ discount: 525, customerPays: 2974, creatorEarns: 595, platformKeeps: 2379 });
    expect(splitSale(3499, creator, false)).toEqual({ discount: 0, customerPays: 3499, creatorEarns: 700, platformKeeps: 2799 });
    expect(splitSale(699, { ...creator, discountOn: false })).toEqual({ discount: 0, customerPays: 699, creatorEarns: 140, platformKeeps: 559 });
  });
  it("never splits more than the customer paid", () => {
    for (const price of [699, 3499]) for (const d of [0, 10, 50]) for (const s of [0, 25, 50]) {
      const r = splitSale(price, { discountOn: true, discountPercent: d, sharePercent: s });
      expect(r.creatorEarns + r.platformKeeps).toBe(r.customerPays);
      expect(r.customerPays).toBeLessThanOrEqual(price);
    }
  });
  it("accepts tidy referral codes and builds a link per platform", () => {
    expect(["studywithsam", "mmi-tutor-jo", "abc"].every(isValidReferralCode)).toBe(true);
    expect(["ab", "-sam", "sam-", "Sam", "sam--jo", "sam jo", "s".repeat(25), "sam/../x"].some(isValidReferralCode)).toBe(false);
    expect(referralUrl("medicine", "sam")).toBe("https://mmipractice.co.uk/r/sam");
    expect(referralUrl("11plus", "sam")).toBe("https://intrvue.ai/r/sam");
  });
  it("keeps sample earnings consistent with the sample creator's terms", () => {
    const sam = SAMPLE_CREATORS[0];
    for (const c of SAMPLE_CONVERSIONS) {
      const full = c.item === "Full MMI" ? 3499 : 699;
      expect(splitSale(full, sam)).toMatchObject({ customerPays: c.pence, creatorEarns: c.earned });
    }
  });
});

describe("Creator programme prototype page", () => {
  it("is labelled as a prototype and updates the example split as terms change", async () => {
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    await act(async () => root.render(<MemoryRouter><AdminCreators /></MemoryRouter>));
    expect(node.textContent).toContain("Nothing here is saved");
    expect(node.textContent).toContain("£5.95");
    const share = [...node.querySelectorAll<HTMLInputElement>('input[type="number"]')][1];
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { setValue.call(share, "10"); share.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(node.textContent).toContain("£2.97");
    await act(async () => { setValue.call(share, "90"); share.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(share.value).toBe("50");
    act(() => root.unmount());
    node.remove();
  });
});
