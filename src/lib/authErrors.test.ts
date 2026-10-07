import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrors";
describe("Safe sign-in errors", () => {
  it("explains expired or reused codes", () =>
    expect(authErrorMessage({ code: "otp_expired" })).toContain(
      "latest email",
    ));
  it("explains throttling", () =>
    expect(authErrorMessage({ status: 429 })).toContain("wait"));
  it("explains incorrect credentials", () =>
    expect(authErrorMessage({ code: "invalid_credentials" })).toContain(
      "email or password",
    ));
  it("does not expose raw server or provider details", () =>
    expect(
      authErrorMessage({ message: "SMTP secret internal database failure" }),
    ).not.toMatch(/SMTP|secret|database/));
});
