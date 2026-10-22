import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const trialApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/guestTrials", async () => ({ ...(await vi.importActual<object>("@/lib/guestTrials")), trialApi }));
vi.mock("@/integrations/supabase/client", () => ({ guestSupabase: { auth: { setSession: vi.fn() } } }));
import GuestWelcome from "./GuestWelcome";

async function open(path: string, product: "medicine" | "11plus", failure?: Error) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  sessionStorage.clear();
  window.history.replaceState({}, "", path);
  if (failure) trialApi.mockRejectedValue(failure);
  else trialApi.mockResolvedValue({ invite: { id: "i", label: "l", expires_at: "2099-01-01", revoked_at: null, max_guests: 1, max_interviews: 2, guest_hours: 6, product } });
  const node = document.createElement("div");
  const root = createRoot(node);
  await act(async () => root.render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/medicine/:code" element={<GuestWelcome />} />
        <Route path="/11plus/:code" element={<GuestWelcome />} />
      </Routes>
    </MemoryRouter>,
  ));
  await act(async () => {});
  return { node, unmount: () => act(() => root.unmount()) };
}

describe("Beta welcome page", () => {
  it("shows 11+ branding and asks a parent or guardian to confirm sharing", async () => {
    const { node, unmount } = await open("/11plus/AbCdEfGhIjKlMnOpQrStUv", "11plus");
    try {
      expect(node.textContent).toContain("intrvue.ai");
      expect(node.textContent).toContain("Not affiliated with any school");
      expect(node.textContent).toContain("parent or guardian");
      expect(node.textContent).not.toContain("MMI Practice");
      expect(trialApi).toHaveBeenCalledWith({ action: "inspect", code: "AbCdEfGhIjKlMnOpQrStUv" }, true);
    } finally {
      unmount();
    }
  });
  it("explains a broken or expired link instead of welcoming the tester", async () => {
    const { node, unmount } = await open("/medicine/AbCdEfGhIjKlMnOpQrStUv", "medicine", new Error("This trial invitation has expired or been closed"));
    try {
      expect(node.querySelector("h1")?.textContent).toBe("This invitation link isn't working.");
      expect(node.querySelector('[role="alert"]')?.textContent).toContain("expired or been closed");
      expect(node.textContent).not.toContain("Enter your name to begin");
      expect(node.querySelector("form")).toBeNull();
    } finally {
      unmount();
    }
  });
  it("keeps the Medicine wording for Medicine links", async () => {
    const { node, unmount } = await open("/medicine/AbCdEfGhIjKlMnOpQrStUv", "medicine");
    try {
      expect(node.textContent).toContain("MMI Practice");
      expect(node.textContent).toContain("patient details");
      expect(node.textContent).not.toContain("parent or guardian");
    } finally {
      unmount();
    }
  });
});
