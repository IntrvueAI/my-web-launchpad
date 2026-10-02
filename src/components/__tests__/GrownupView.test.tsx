import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  stats: {
    averageScore: 0,
    scoredSessions: 0,
    recentTrend: [],
    weekStrip: [],
    upcomingSchoolInterviews: [],
  },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "parent", user_metadata: { full_name: "Sam" } },
  }),
}));
vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => ({ stats: mocks.stats }),
}));
vi.mock("@/services/FeedbackService", () => ({
  FeedbackService: { getUserFeedbackHistory: mocks.history },
}));
import { GrownupView } from "../GrownupView";

describe("Parent progress evidence", () => {
  let node: HTMLDivElement, root: Root, client: QueryClient;
  const row = {
    id: "partial",
    interview_type: "medicine",
    created_at: "2026-10-02T00:00:00Z",
    total_score: null,
    scores: { communication: null, reasoning: 3 },
    transcription: "Student: My answer.",
  };
  async function settle() {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocks.stats.scoredSessions = 0;
    mocks.history.mockReset().mockResolvedValue([row]);
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    node = document.createElement("div");
    document.body.append(node);
    root = createRoot(node);
  });
  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    node.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });
  async function render() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <GrownupView />
        </QueryClientProvider>,
      ),
    );
    await settle();
  }
  it("does not turn unassessed skills or an unfinished session into a zero score", async () => {
    await render();
    expect(node.textContent).toContain("Partial assessment");
    expect(node.textContent).toContain("Not assessed yet");
    expect(node.textContent).not.toContain("Keep going");
    expect(node.textContent).not.toContain("/20");
    expect(node.textContent).not.toContain("communication null");
    expect(node.textContent).toContain("reasoning 3");
    expect(node.textContent).toContain("Practice days");
    expect(node.textContent).not.toContain("Readiness");
  });
  it("keeps a genuine assessed zero distinct from missing evidence", async () => {
    mocks.stats.scoredSessions = 1;
    mocks.history.mockResolvedValue([{ ...row, total_score: 0 }]);
    await render();
    expect(node.textContent).toContain("0/20");
    expect(node.textContent).toContain("Keep going");
    expect(node.textContent).not.toContain("Partial assessment");
    expect(node.textContent).not.toContain("Not assessed yet");
  });
  it("shows a recoverable history error instead of claiming there are no interviews", async () => {
    mocks.history.mockRejectedValueOnce(new Error("offline"));
    await render();
    expect(node.querySelector('[role="alert"]')?.textContent).toContain(
      "could not be loaded",
    );
    expect(node.textContent).not.toContain("No interviews yet");
    await act(async () =>
      [...node.querySelectorAll("button")]
        .find((b) => b.textContent === "Try again")!
        .click(),
    );
    await settle();
    expect(node.textContent).toContain("Partial assessment");
    expect(node.querySelector('[role="alert"]')).toBeNull();
  });
});
