import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  signIn: vi.fn(),
  google: vi.fn(),
  otp: vi.fn(),
  verify: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  clearLocalAuthSession: vi.fn(),
  supabase: {
    auth: {
      onAuthStateChange: mocks.listen,
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      signInWithPassword: mocks.signIn,
      signInWithOAuth: mocks.google,
      signInWithOtp: mocks.otp,
      verifyOtp: mocks.verify,
    },
  },
}));
import { AuthProvider, useAuth } from "./AuthContext";
let auth: ReturnType<typeof useAuth>,
  root: Root,
  node: HTMLDivElement,
  cache: QueryClient,
  callback: (event: string, session: Session | null) => void;
const session = {
  user: {
    id: "test-user",
    created_at: "2020-01-01",
    app_metadata: {},
    user_metadata: {},
  },
} as Session;
function Harness() {
  auth = useAuth();
  return <span>{auth.user?.id ?? "signed out"}</span>;
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mocks.listen.mockImplementation((fn) => {
    callback = fn;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.signOut.mockResolvedValue({ error: null });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  node = document.createElement("div");
  root = createRoot(node);
});
afterEach(() => {
  act(() => root.unmount());
  cache.clear();
});
async function mount() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={cache}>
        <AuthProvider>
          <Harness />
        </AuthProvider>
      </QueryClientProvider>,
    ),
  );
}
describe("Authentication state recovery", () => {
  it("sends a code only to an existing account and returns to the current site", async () => {
    mocks.otp.mockResolvedValue({ error: null });
    await mount();
    await auth.sendSignInCode("existing@example.test");
    expect(mocks.otp).toHaveBeenCalledWith({
      email: "existing@example.test",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin + "/",
      },
    });
  });
  it("allows deliberate code sign-in after logout and verifies with Supabase", async () => {
    mocks.verify.mockImplementation(async () => {
      callback("SIGNED_IN", session);
      return { error: null };
    });
    await mount();
    await act(async () => {
      await auth.signOut();
    });
    await act(async () => {
      await auth.verifySignInCode("existing@example.test", "123456");
    });
    expect(mocks.verify).toHaveBeenCalledWith({
      email: "existing@example.test",
      token: "123456",
      type: "email",
    });
    expect(auth.user?.id).toBe("test-user");
  });
  it("clears private cached data and onboarding even if the SDK emits no sign-out event", async () => {
    await mount();
    cache.setQueryData(["private-feedback"], { transcript: "private" });
    await act(async () => auth.setShowPostSignupForm(true));
    await act(async () => {
      await auth.signOut();
    });
    expect(auth.user).toBeNull();
    expect(auth.session).toBeNull();
    expect(auth.showPostSignupForm).toBe(false);
    expect(cache.getQueryData(["private-feedback"])).toBeUndefined();
  });
  it("ignores a stale initial session that resolves after sign-out", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getSession.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await mount();
    await act(async () => {
      callback("SIGNED_IN", session);
    });
    await act(async () => {
      await auth.signOut();
      resolve({ data: { session } });
    });
    expect(node.textContent).toBe("signed out");
  });
  it("ignores a late refresh after logout but accepts a deliberate new sign-in", async () => {
    await mount();
    await act(async () => {
      await auth.signOut();
      callback("TOKEN_REFRESHED", session);
    });
    expect(auth.user).toBeNull();
    mocks.signIn.mockImplementation(async () => {
      callback("SIGNED_IN", session);
      return { error: null };
    });
    await act(async () => {
      await auth.signIn("tester@example.invalid", "test-password");
    });
    expect(auth.user?.id).toBe("test-user");
  });
  it("shares one request when sign-out is clicked repeatedly", async () => {
    await mount();
    let resolve!: (v: unknown) => void;
    mocks.signOut.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await act(async () => {
      const first = auth.signOut(),
        second = auth.signOut();
      expect(first).toBe(second);
      resolve({ error: null });
      await first;
    });
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it("handles a failed initial lookup without an infinite loading screen", async () => {
    mocks.getSession.mockRejectedValue(new Error("Network unavailable"));
    await mount();
    expect(auth.loading).toBe(false);
    expect(auth.user).toBeNull();
  });
  it("returns a recoverable Google launch error if the SDK throws", async () => {
    await mount();
    mocks.google.mockRejectedValue(new Error("Network unavailable"));
    const result = await auth.signInWithGoogle();
    expect(result.error?.message).toContain("check your connection");
  });
});
