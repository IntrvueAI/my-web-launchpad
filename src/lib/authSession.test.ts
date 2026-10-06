import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRecoverableAuthStorage,
  signOutWithRecovery,
} from "./authSession";
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});
const actions = () => ({
  remote: vi.fn().mockResolvedValue({ error: null }),
  clearStoredSession: vi.fn(),
  onSignedOut: vi.fn(),
  reload: vi.fn(),
});
describe("Recoverable sign-out", () => {
  it("uses normal server revocation without reloading on success", async () => {
    const a = actions();
    await expect(signOutWithRecovery(a)).resolves.toEqual({ error: null });
    expect(a.onSignedOut).toHaveBeenCalledOnce();
    expect(a.clearStoredSession).not.toHaveBeenCalled();
    expect(a.reload).not.toHaveBeenCalled();
  });
  it.each(["error", "throw"])(
    "clears browser credentials and reloads after a remote %s",
    async (kind) => {
      const a = actions();
      if (kind === "error")
        a.remote.mockResolvedValue({ error: new Error("503") });
      else a.remote.mockRejectedValue(new Error("offline"));
      await expect(signOutWithRecovery(a)).resolves.toEqual({ error: null });
      expect(a.clearStoredSession).toHaveBeenCalledOnce();
      expect(a.onSignedOut).toHaveBeenCalledOnce();
      expect(a.reload).toHaveBeenCalledOnce();
      expect(a.clearStoredSession.mock.invocationCallOrder[0]).toBeLessThan(
        a.reload.mock.invocationCallOrder[0],
      );
    },
  );
  it("escapes a stuck auth lock and handles its eventual rejection", async () => {
    vi.useFakeTimers();
    const a = actions();
    let reject!: (e: Error) => void;
    a.remote.mockReturnValue(
      new Promise((_, no) => {
        reject = no;
      }),
    );
    const result = signOutWithRecovery(a);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(result).resolves.toEqual({ error: null });
    expect(a.reload).toHaveBeenCalledOnce();
    reject(new Error("Late network failure"));
    await Promise.resolve();
    expect(a.onSignedOut).toHaveBeenCalledOnce();
  });
  it("does not report success if credentials cannot be removed", async () => {
    const a = actions();
    a.remote.mockRejectedValue(new Error("offline"));
    a.clearStoredSession.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    await expect(signOutWithRecovery(a)).rejects.toThrow("Storage blocked");
    expect(a.onSignedOut).not.toHaveBeenCalled();
    expect(a.reload).not.toHaveBeenCalled();
  });
  it("removes only the active account credentials and blocks late refresh writes", () => {
    const key = "sb-project-auth-token",
      storage = createRecoverableAuthStorage(localStorage, key);
    for (const name of [key, key + "-code-verifier", key + "-user"])
      storage.setItem(name, "private");
    localStorage.setItem("practice-notes", "Keep my draft");
    sessionStorage.setItem("mmi:guest-auth:v1", "separate guest");
    storage.clearSession();
    storage.setItem(key, "Late refresh");
    expect(storage.getItem(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(key + "-user")).toBeNull();
    expect(localStorage.getItem(key + "-code-verifier")).toBeNull();
    expect(localStorage.getItem("practice-notes")).toBe("Keep my draft");
    expect(sessionStorage.getItem("mmi:guest-auth:v1")).toBe("separate guest");
  });
  it("keeps the founder account when clearing an isolated trial", () => {
    localStorage.setItem("sb-project-auth-token", "founder");
    const storage = createRecoverableAuthStorage(
      sessionStorage,
      "mmi:guest-auth:v1",
    );
    storage.setItem("mmi:guest-auth:v1", "guest");
    storage.clearSession();
    expect(sessionStorage.getItem("mmi:guest-auth:v1")).toBeNull();
    expect(localStorage.getItem("sb-project-auth-token")).toBe("founder");
  });
});
