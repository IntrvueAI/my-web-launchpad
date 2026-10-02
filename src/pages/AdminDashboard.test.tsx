import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
vi.mock("@/hooks/useAdminStatus", () => ({
  useAdminStatus: () => ({
    isAdmin: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "ordinary-user" },
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import AdminDashboard from "./AdminDashboard";
describe("Administrator boundary", () => {
  it("does not trust a browser-only unlock flag or offer a shared passcode", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.setItem("admin_unlocked", "1");
    const node = document.createElement("div"),
      root = createRoot(node);
    try {
      act(() =>
        root.render(
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>,
        ),
      );
      expect(node.textContent).toContain("authorised administrator");
      expect(node.textContent).not.toContain("Admin Dashboard");
      expect(node.querySelector('input[type="password"]')).toBeNull();
      expect(node.querySelector('a[href="/admin/medicine-review"]')).toBeNull();
    } finally {
      act(() => root.unmount());
      sessionStorage.removeItem("admin_unlocked");
    }
  });
});
