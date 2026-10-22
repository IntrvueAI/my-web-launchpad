import { describe, expect, it } from "vitest";
import { guestInterviewIds, PRIVATE_INVITATION_PATH, trialInvitationPath, type TrialInvite } from "./guestTrials";

const invite = (extra: Partial<TrialInvite>): TrialInvite => ({
  id: "i", label: "l", expires_at: "", revoked_at: null, max_guests: 1, max_interviews: 2, guest_hours: 6, code: "signed", ...extra,
});
const code = "AbCdEfGhIjKlMnOpQrStUv";

describe("Beta invitation links", () => {
  it("uses a product-specific private path", () => {
    expect(trialInvitationPath(invite({ link_code: code }))).toBe(`/medicine/${code}`);
    expect(trialInvitationPath(invite({ link_code: code, product: "medicine" }))).toBe(`/medicine/${code}`);
    expect(trialInvitationPath(invite({ link_code: code, product: "11plus" }))).toBe(`/11plus/${code}`);
    expect(trialInvitationPath(invite({}))).toBe("/try#signed");
  });
  it("recognises both products' private links and nothing broader", () => {
    expect(PRIVATE_INVITATION_PATH.test(`/medicine/${code}`)).toBe(true);
    expect(PRIVATE_INVITATION_PATH.test(`/11plus/${code}`)).toBe(true);
    expect(PRIVATE_INVITATION_PATH.test("/medicine/practice")).toBe(false);
    expect(PRIVATE_INVITATION_PATH.test(`/11plus/${code}/x`)).toBe(false);
  });
  it("offers each product only its own interviews", () => {
    expect(guestInterviewIds("11plus")).toEqual(["11-plus", "maths-interview", "logic-puzzles", "current-affairs-interview"]);
    expect(guestInterviewIds("medicine").every((id) => id.startsWith("medicine-"))).toBe(true);
    expect(guestInterviewIds()).toEqual(guestInterviewIds("medicine"));
  });
});
