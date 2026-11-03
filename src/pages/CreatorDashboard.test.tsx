import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { id: string; email: string }, signOut: vi.fn(async () => ({ error: null })) }));
const api = vi.hoisted(() => ({ claim: vi.fn(async () => null), dashboard: vi.fn(async () => null), stripe: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false, signOut: auth.signOut }) }));
vi.mock("@/hooks/useAdminStatus", () => ({ useAdminStatus: () => ({ isAdmin: false }) }));
vi.mock("@/lib/creatorProgramme", async () => {
  const actual = await vi.importActual<typeof import("@/lib/creatorProgramme")>("@/lib/creatorProgramme");
  return { ...actual, creatorApi: { ...actual.creatorApi, ...api } };
});
import CreatorDashboard, { ACCESS_REDIRECT_SECONDS } from "./CreatorDashboard";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let path = "";
const Where = () => { const l = useLocation(); path = l.pathname + l.search; return null; };
async function open() {
  const node = document.createElement("div");
  document.body.append(node);
  await act(async () => createRoot(node).render(
    <MemoryRouter initialEntries={["/creator"]}>
      <Routes><Route path="*" element={<><CreatorDashboard /><Where /></>} /></Routes>
    </MemoryRouter>,
  ));
  await act(async () => {});
  return node;
}
afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); vi.useRealTimers(); auth.user = null; });

describe("Creator dashboard access", () => {
  it("sends signed-out visitors to sign in, then back here", async () => {
    await open();
    expect(path).toBe("/auth?returnTo=%2Fcreator");
    expect(api.dashboard).not.toHaveBeenCalled();
  });
  it("tells someone signed in with the wrong account they don't have access, then goes home", async () => {
    vi.useFakeTimers();
    auth.user = { id: "u1", email: "someone@example.test" };
    const node = await open();
    expect(node.querySelector("h1")?.textContent).toBe("You don't have access to this page");
    expect(node.textContent).toContain("someone@example.test");
    expect(node.textContent).toContain(`${ACCESS_REDIRECT_SECONDS}s`);
    for (let i = 0; i < ACCESS_REDIRECT_SECONDS + 1; i++) await act(async () => { vi.advanceTimersByTime(1000); });
    expect(path).toBe("/");
  });
  it("lets them switch to the invited account", async () => {
    auth.user = { id: "u1", email: "someone@example.test" };
    const node = await open();
    await act(async () => [...node.querySelectorAll("button")].find((b) => b.textContent === "Sign in with a different account")!.click());
    expect(auth.signOut).toHaveBeenCalled();
    expect(path).toBe("/auth?returnTo=%2Fcreator");
  });
});
