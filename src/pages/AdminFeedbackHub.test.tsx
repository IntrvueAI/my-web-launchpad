import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const trialApi = vi.hoisted(() => vi.fn(async () => ({ trials: [], total: 0, pageSize: 20, summary: { assessments: 0, testers: 0, reviews: 0, issues: 0, averageRating: null } })));
vi.mock("@/lib/guestTrials", () => ({ GUEST_HISTORY_INTERVIEW_IDS: [], trialApi, trialReviewExperience: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "founder" }, loading: false }) }));
vi.mock("@/hooks/useAdminStatus", () => ({ useAdminStatus: () => ({ isAdmin: true, isLoading: false }) }));
vi.mock("@/components/admin/AdminUserFeedback", () => ({ AdminUserFeedback: () => <p>COMMENTS LIST</p> }));
import AdminGuestFeedback, { feedbackViewFor } from "./AdminGuestFeedback";

async function render(path: string) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const node = document.createElement("div");
  const root = createRoot(node);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/feedback" element={<AdminGuestFeedback />} />
          <Route path="/admin/guest-feedback" element={<AdminGuestFeedback />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  return { node, unmount: () => act(() => root.unmount()) };
}
const current = (node: HTMLElement) => node.querySelector('[aria-label="Feedback type"] [aria-current="page"]')?.textContent;

describe("Unified admin feedback page", () => {
  it("opens comments by default and keeps older tester links on the tester view", () => {
    const p = (q = "") => new URLSearchParams(q);
    expect(feedbackViewFor("/admin/feedback", p())).toBe("comments");
    expect(feedbackViewFor("/admin/guest-feedback", p())).toBe("testers");
    expect(feedbackViewFor("/admin/feedback", p("invite=abc&trial=def"))).toBe("testers");
    expect(feedbackViewFor("/admin/guest-feedback", p("view=comments"))).toBe("comments");
  });

  it("shows website comments without loading the tester inbox", async () => {
    trialApi.mockClear();
    const { node, unmount } = await render("/admin/feedback");
    try {
      expect(node.querySelector("h1")?.textContent).toBe("Feedback");
      expect(current(node)).toContain("Comments & ratings");
      expect(node.textContent).toContain("COMMENTS LIST");
      expect(trialApi).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it("shows beta testers from the old address with both tabs available", async () => {
    trialApi.mockClear();
    const { node, unmount } = await render("/admin/guest-feedback");
    try {
      expect(current(node)).toContain("Beta testers");
      expect(node.textContent).not.toContain("COMMENTS LIST");
      expect(node.querySelector('a[href="/admin/feedback?view=comments"]')).not.toBeNull();
      expect(trialApi).toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
});
