import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ reset: vi.fn(), google: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, signInWithGoogle: mocks.google }) }));
vi.mock("@/hooks/useSimpleAuth", () => ({ useSimpleAuth: () => ({ handleResetPassword: mocks.reset }) }));
vi.mock("@/lib/site", () => ({ isMedicineSite: () => false, siteName: () => "MMI Practice" }));
vi.mock("@/lib/authErrors", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/authErrors")>(), EMAIL_SIGN_IN_AVAILABLE: true }));
import Auth from "./Auth";
let node: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/auth?reset=1");
  localStorage.clear();
  node = document.createElement("div"); document.body.append(node); root = createRoot(node);
});
afterEach(() => { act(() => root.unmount()); node.remove(); });
async function requestReset() {
  await act(async () => root.render(<MemoryRouter><Auth /></MemoryRouter>));
  const field = node.querySelector<HTMLInputElement>("#reset-email")!;
  await act(async () => Simulate.change(field, { target: { value: "qa@example.test" } } as any));
  await act(async () => Simulate.submit(node.querySelector("form")!));
}
describe("Forgot-password email form", () => {
  it("keeps the address and form when delivery is rejected", async () => {
    mocks.reset.mockResolvedValue({ error: { status: 500, code: "unexpected_failure" } });
    await requestReset();
    expect(node.textContent).toContain("Email delivery is temporarily unavailable");
    expect(node.querySelector<HTMLInputElement>("#reset-email")?.value).toBe("qa@example.test");
    expect(node.textContent).not.toContain("a reset link is on its way");
  });
  it("shows a persistent, account-neutral confirmation only after acceptance", async () => {
    mocks.reset.mockResolvedValue({ error: null });
    await requestReset();
    expect(mocks.reset).toHaveBeenCalledWith("qa@example.test");
    expect(node.textContent).toContain("If an account exists with that email");
    expect(node.textContent).toContain("open the latest link");
    expect(node.querySelector("form")).toBeNull();
  });
});
