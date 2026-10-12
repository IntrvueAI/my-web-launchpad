import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const select = vi.fn();
const rows = [
  {
    id: "a1b2c3d4-0000-0000-0000-000000000000",
    user_id: "user-1",
    interview_type: "medicine-mmi-practice",
    started_at: new Date(Date.now() - 12 * 60000).toISOString(),
    last_activity_at: new Date(Date.now() - 30000).toISOString(),
    completed: 1,
    planned: 6,
    topic: "ethics-scenarios",
  },
];
vi.mock("@/integrations/supabase/client", () => {
  const chain = (result: unknown) => {
    const q: any = { eq: () => q, gte: () => q, in: () => Promise.resolve(result), order: () => Promise.resolve(result) };
    return q;
  };
  return {
    supabase: {
      from: (table: string) => ({
        select: (cols: string) => {
          select(table, cols);
          return table === "profiles"
            ? chain({ data: [{ id: "user-1", email: "candidate@example.com" }], error: null })
            : chain({ data: rows, error: null });
        },
      }),
    },
  };
});
import { LiveInterviews, LIVE_SESSION_COLUMNS, summariseLiveSession } from "./LiveInterviews";

describe("Live interviews admin panel", () => {
  it("requests progress fields only, never the transcript, answers or candidate name", () => {
    expect(LIVE_SESSION_COLUMNS).not.toMatch(/\*|transcript|evidence|currentStudentTurns|studentName|engine_state(?!->)/);
    expect(LIVE_SESSION_COLUMNS).not.toMatch(/engine_state->current(?!->>topic)/);
  });

  it("summarises progress without inventing a station for unstarted or legacy sessions", () => {
    const now = Date.parse("2026-10-12T22:00:00Z");
    const base = { ...rows[0], started_at: "2026-10-12T21:48:00Z", last_activity_at: "2026-10-12T21:59:30Z" };
    expect(summariseLiveSession(base, now)).toMatchObject({
      interview: "Medicine mmi practice", progress: "Part 2 of 6", topic: "Ethics scenarios",
      running: "12 minutes", lastActivity: "under a minute ago", reference: "a1b2c3d4",
    });
    expect(summariseLiveSession({ ...base, completed: null, planned: null, topic: null }, now).progress).toBe("Not started yet");
    expect(summariseLiveSession({ ...base, completed: 6 }, now).progress).toBe("All 6 complete, closing");
  });

  it("opens an accessible progress summary when a live interview is selected", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    const root = createRoot(node);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      await act(async () => {
        root.render(<QueryClientProvider client={client}><LiveInterviews /></QueryClientProvider>);
      });
      for (let i = 0; i < 50 && !node.querySelector("button[aria-expanded]"); i++)
        await act(() => new Promise((r) => setTimeout(r, 10)));
      const toggle = node.querySelector("button[aria-expanded]") as HTMLButtonElement;
      expect(toggle.textContent).toContain("candidate@example.com");
      expect(toggle.textContent).toContain("Part 2 of 6");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      await act(async () => toggle.click());
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      document.body.appendChild(node);
      const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
      expect(panel.textContent).toContain("Ethics scenarios");
      expect(panel.textContent).toContain("transcript stay private");
      expect(select).toHaveBeenCalledWith("interview_sessions", LIVE_SESSION_COLUMNS);
    } finally {
      act(() => root.unmount());
    }
  });
});
