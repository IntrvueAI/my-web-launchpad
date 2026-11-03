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
  it("keeps intrvue.ai for 11+ and previews combined, now the domains are split", () => {
    expect(site.MEDICINE_DOMAIN_LIVE).toBe(true);
    expect(site.siteProduct("intrvue.ai")).toBe("11plus");
    expect(site.siteProduct("www.intrvue.ai")).toBe("11plus");
    expect(site.siteProduct("my-web-launchpad.lovable.app")).toBe("combined");
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
  const held = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
  it("keeps an 11+ tester's invitation on intrvue.ai and carries a Medicine one across", () => {
    const tryPage = new URL("https://intrvue.ai/try");
    expect(site.medicineHandoverTarget(tryPage, true, held({ "mmi:trial-product": "11plus", "mmi:trial-invite": "AbCdEfGhIjKlMnOpQrStUv" }))).toBeNull();
    expect(site.medicineHandoverTarget(tryPage, true, held({}))).toBeNull();
    expect(site.medicineHandoverTarget(tryPage, true, held({ "mmi:trial-product": "medicine", "mmi:trial-invite": "AbCdEfGhIjKlMnOpQrStUv" })))
      .toBe("https://mmipractice.co.uk/medicine/AbCdEfGhIjKlMnOpQrStUv");
  });
  it("sends 11+ pages opened on mmipractice.co.uk back to intrvue.ai", () => {
    for (const path of ["/11plus/AbCdEfGhIjKlMnOpQrStUv", "/schools", "/schools/abc/students/def", "/classes", "/join-class/token"])
      expect(site.schoolHandoverTarget(new URL(`https://mmipractice.co.uk${path}?x=1`), true)).toBe(`https://intrvue.ai${path}?x=1`);
    for (const path of ["/", "/auth", "/medicine/practice", "/guest-session", "/r/sam", "/creator", "/admin"])
      expect(site.schoolHandoverTarget(new URL(`https://mmipractice.co.uk${path}`), true)).toBeNull();
    expect(site.schoolHandoverTarget(new URL("https://mmipractice.co.uk/try"), true, held({ "mmi:trial-product": "11plus", "mmi:trial-invite": "AbCdEfGhIjKlMnOpQrStUv" })))
      .toBe("https://intrvue.ai/11plus/AbCdEfGhIjKlMnOpQrStUv");
    expect(site.schoolHandoverTarget(new URL("https://mmipractice.co.uk/schools"), false)).toBeNull();
  });
  it("leaves shared and admin pages where they are on either domain", () => {
    for (const host of ["intrvue.ai", "mmipractice.co.uk", "my-web-launchpad.lovable.app"])
      for (const path of ["/admin", "/admin/lab", "/creator", "/auth", "/r/sam"])
        expect(site.domainHandoverTarget(new URL(`https://${host}${path}`))).toBeNull();
  });
});
