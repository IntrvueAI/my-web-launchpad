import { afterEach, describe, expect, it, vi } from "vitest";
import * as site from "./site";
import {
  getStoredProductLine,
  setStoredProductLine,
  getStoredMedicineDashboardStyle,
} from "./productLine";
import { GUEST_INTERVIEW_IDS } from "./guestTrials";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
  guestSupabase: {},
}));
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("Domain product routing", () => {
  it.each([
    "mmipractice.co.uk",
    "www.mmipractice.co.uk",
    "MMIPRACTICE.CO.UK.",
    "mmi.localhost",
  ])("locks %s to Medicine", (host) => {
    expect(site.siteProduct(host)).toBe("medicine");
  });
  it("does not redirect the existing product before domain handover", () => {
    expect(site.siteProduct("intrvue.ai")).toBe("combined");
    expect(site.siteProduct("random-mmipractice.co.uk.evil.test")).toBe(
      "combined",
    );
    expect(site.siteProduct("11plus.localhost")).toBe("11plus");
  });
  it("ignores an inherited 11+ browser preference on the Medicine domain", () => {
    vi.spyOn(site, "siteProduct").mockReturnValue("medicine");
    localStorage.setItem("intrvue_product_line", "11plus");
    localStorage.setItem("intrvue_medicine_dashboard_style", "classic");
    expect(getStoredProductLine()).toBe("medicine");
    expect(getStoredMedicineDashboardStyle()).toBe("coral");
    setStoredProductLine("11plus");
    expect(localStorage.getItem("intrvue_product_line")).toBe("medicine");
  });
  it("offers only supported shared-engine Medicine interviews to guests", () => {
    expect(GUEST_INTERVIEW_IDS).toHaveLength(5);
    expect(GUEST_INTERVIEW_IDS).toContain('medicine-mmi-practice');
    for (const id of GUEST_INTERVIEW_IDS) {
      expect(INTERVIEW_TYPES[id].engineDriven).toBe(true);
      expect(INTERVIEW_TYPES[id].engineSubject).toBe("medicine");
    }
  });
  it("hands over explicit Medicine links only after the new domain is live", () => {
    const url = new URL(
      "https://intrvue.ai/medicine/examples?station=mmi-test",
    );
    expect(site.medicineHandoverTarget(url, false)).toBeNull();
    expect(site.medicineHandoverTarget(url, true)).toBe(
      "https://mmipractice.co.uk/medicine/examples?station=mmi-test",
    );
    expect(
      site.medicineHandoverTarget(
        new URL("https://intrvue.ai/try#private-code"),
        true,
      ),
    ).toBe("https://mmipractice.co.uk/try#private-code");
    for (const path of ["/", "/examples", "/medicine/move", "/guest-session"])
      expect(
        site.medicineHandoverTarget(new URL(`https://intrvue.ai${path}`), true),
      ).toBeNull();
  });
});
