import { describe, expect, it } from "vitest";
import { pageTitleFor } from "@/lib/pageTitle";

describe("Page titles", () => {
  it("names each page, then the site", () => {
    expect(pageTitleFor("/auth", true)).toBe("Sign in · MMI Practice");
    expect(pageTitleFor("/auth", false)).toBe("Sign in · intrvue.ai");
    expect(pageTitleFor("/medicine/practice", true)).toBe("Solo practice studio · MMI Practice");
    expect(pageTitleFor("/schools/abc/students/def", false)).toBe("For schools · intrvue.ai");
    expect(pageTitleFor("/medicine/AbCdEfGhIjKlMnOpQrStUv", true)).toBe("Your practice invitation · MMI Practice");
    expect(pageTitleFor("/admin/lab", false)).toBe("Admin · intrvue.ai");
  });
  it("keeps the home titles search engines already know", () => {
    expect(pageTitleFor("/", true)).toBe("MMI Practice | Medicine interview preparation");
    expect(pageTitleFor("/", false)).toBe("Intrvue AI - 11+ Interview Preparation");
    expect(pageTitleFor("/medicine", true)).toBe("MMI Practice | Medicine interview preparation");
  });
});
