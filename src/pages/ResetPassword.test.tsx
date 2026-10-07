import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  listen: vi.fn(),
  update: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.session,
      onAuthStateChange: mocks.listen,
      updateUser: mocks.update,
    },
  },
}));
vi.mock("@/lib/site", () => ({
  isMedicineSite: () => false,
  siteName: () => "MMI Practice",
}));
import ResetPassword from "./ResetPassword";
let root: Root,
  node: HTMLDivElement,
  listener: (event: string, session: unknown) => void;
const session = { user: { id: "qa-user", email: "qa@example.test" } };
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/reset-password");
  mocks.session.mockResolvedValue({ data: { session }, error: null });
  mocks.update.mockResolvedValue({ error: null });
  mocks.listen.mockImplementation((fn) => {
    listener = fn;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
});
async function mount() {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    ),
  );
}
async function input(id: string, value: string) {
  await act(async () =>
    Simulate.change(node.querySelector("#" + id)!, {
      target: { value },
    } as any),
  );
}
async function submit() {
  await act(async () => Simulate.submit(node.querySelector("form")!));
}
async function fill() {
  await input("password", "NewSafePassword42");
  await input("confirm-password", "NewSafePassword42");
}

describe("Password reset", () => {
  it("waits for recovery initialization before offering a password form", async () => {
    let resolve!: (value: unknown) => void;
    mocks.session.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await mount();
    expect(node.textContent).toContain("Checking your reset link");
    expect(node.querySelector("form")).toBeNull();
    await act(async () => resolve({ data: { session }, error: null }));
    expect(node.querySelector("form")).not.toBeNull();
    expect(node.textContent).toContain(session.user.email);
  });
  it("shows a useful expired-link message without redirecting or changing a password", async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    await mount();
    expect(node.querySelector("form")).toBeNull();
    expect(node.textContent).toContain("expired or has already been used");
    expect(node.querySelector('a[href="/auth?reset=1"]')).not.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects a failed callback even when another account has a session", async () => {
    window.history.replaceState(
      {},
      "",
      "/reset-password#error=access_denied&error_description=private-server-detail",
    );
    await mount();
    expect(node.querySelector("form")).toBeNull();
    expect(node.textContent).not.toContain("private-server-detail");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not let a slow initial lookup restore a signed-out form", async () => {
    let resolve!: (value: unknown) => void;
    mocks.session.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await mount();
    await act(async () => {
      listener("SIGNED_OUT", null);
      resolve({ data: { session }, error: null });
    });
    expect(node.querySelector("form")).toBeNull();
  });
  it("validates password strength and matching fields before sending", async () => {
    await mount();
    await input("password", "short");
    await input("confirm-password", "short");
    await submit();
    expect(node.textContent).toContain("at least 8 characters");
    await input("password", "NewSafePassword42");
    await submit();
    expect(node.textContent).toContain("Passwords do not match");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("retains the form on failure, then shows success only after the backend saves", async () => {
    await mount();
    await fill();
    mocks.update.mockResolvedValueOnce({
      error: { message: "private-server-detail", status: 503 },
    });
    await submit();
    expect(node.textContent).toContain("could not be saved");
    expect(node.textContent).not.toContain("private-server-detail");
    expect(node.querySelector<HTMLInputElement>("#password")?.value).toBe(
      "NewSafePassword42",
    );
    await submit();
    expect(mocks.update).toHaveBeenCalledWith({
      password: "NewSafePassword42",
    });
    expect(node.textContent).toContain("Password updated");
    expect(node.querySelector("form")).toBeNull();
    expect(node.querySelector('a[href="/"]')).not.toBeNull();
  });
  it("allows a connection failure during link checking to be retried", async () => {
    mocks.session.mockRejectedValueOnce(new Error("offline"));
    await mount();
    expect(node.textContent).toContain("couldn't check your reset link");
    await act(async () =>
      Simulate.click(
        Array.from(node.querySelectorAll("button")).find(
          (b) => b.textContent === "Try again",
        )!,
      ),
    );
    expect(node.querySelector("form")).not.toBeNull();
  });
});
