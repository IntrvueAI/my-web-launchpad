import { describe, expect, it } from "vitest";
import { creditAlertState } from "./ProviderCreditAlert";

const now = Date.parse("2026-10-12T22:00:00Z");
const at = (minutesAgo: number) => ({ created_at: new Date(now - minutesAgo * 60000).toISOString() });

describe("OpenAI credit alert", () => {
  it("shows nothing without refused calls", () => {
    expect(creditAlertState([], now)).toBeNull();
  });
  it("is active after a recent billing refusal and counts the last hour", () => {
    expect(creditAlertState([at(2), at(20), at(90)], now)).toMatchObject({ active: true, minutesAgo: 2, lastHour: 2 });
  });
  it("clears after the quiet period instead of claiming credit is still exhausted", () => {
    expect(creditAlertState([at(16)], now)).toMatchObject({ active: false, minutesAgo: 16 });
  });
});
