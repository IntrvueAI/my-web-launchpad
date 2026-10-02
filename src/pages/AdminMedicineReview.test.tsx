import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  history: vi.fn(),
  user: { id: "admin" } as { id: string } | null,
}));
vi.mock("@/services/QuestionReviewService", () => ({
  QuestionReviewService: mocks,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/hooks/useAdminStatus", () => ({
  useAdminStatus: () => ({ isAdmin: !!mocks.user, isLoading: false }),
}));
vi.mock("@/components/medicine-dashboard/MedicineTheme", () => ({
  MedicineTheme: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/questionReview", async (original) => ({
  ...(await original<typeof import("@/lib/questionReview")>()),
  reviewFingerprint: async (q: { id: string }) => `hash-${q.id}`,
}));
import AdminMedicineReview from "./AdminMedicineReview";
describe("Medicine review desk", () => {
  let node: HTMLDivElement, root: Root, client: QueryClient;
  const button = (text: string) =>
    [...node.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === text,
    )!;
  const settle = async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  };
  const click = async (text: string) => {
    await act(async () => button(text).click());
    await settle();
  };
  const edit = async (value: string) => {
    await act(async () => {
      const input = node.querySelector("textarea")!;
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocks.user = { id: "admin" };
    mocks.list.mockReset().mockResolvedValue([]);
    mocks.history.mockReset().mockResolvedValue([]);
    mocks.save
      .mockReset()
      .mockImplementation(async (batch, id, hash, status, notes, revision) => ({
        batch_id: batch,
        question_id: id,
        content_hash: hash,
        status,
        notes,
        revision: revision + 1,
        updated_at: "2026-10-02T01:00:00Z",
        reviewer_id: "admin",
      }));
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    node = document.createElement("div");
    document.body.append(node);
    root = createRoot(node);
  });
  async function render() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminMedicineReview />
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    );
    await settle();
  }
  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    node.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });
  it("requires administrator sign-in before querying decisions", async () => {
    mocks.user = null;
    await render();
    expect(node.textContent).toContain("Sign in with an administrator");
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("saves the exact reviewed version and advances the pending queue", async () => {
    await render();
    await edit("Use this sourced wording.");
    await click("Approve question");
    expect(mocks.save).toHaveBeenCalledWith(
      "medicine-sources-2026-10-02",
      "SRC-RCS-01",
      "hash-SRC-RCS-01",
      "approved",
      "Use this sourced wording.",
      0,
    );
    expect(node.textContent).toContain("Saved to your account.");
    expect(node.querySelector("h2")?.textContent).toBe(
      "Qualities patients need",
    );
    expect(button("Export approved").disabled).toBe(false);
  });
  it("requires a reason for rejection and keeps notes after a save outage", async () => {
    await render();
    await click("Reject");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(node.textContent).toContain("Add a short reason");
    await edit("This overlaps the existing motivation station.");
    mocks.save.mockRejectedValueOnce(new Error("offline"));
    await click("Reject");
    expect(node.querySelector("textarea")?.value).toContain("overlaps");
    expect(node.textContent).toContain("could not be saved");
    await click("Reject");
    expect(node.textContent).toContain("Saved to your account.");
  });
  it("preserves drafts when moving between questions", async () => {
    await render();
    await edit("Keep this note.");
    await act(async () =>
      (
        node.querySelector('[aria-label="Next question"]') as HTMLButtonElement
      ).click(),
    );
    expect(node.querySelector("textarea")?.value).toBe("");
    await act(async () =>
      (
        node.querySelector(
          '[aria-label="Previous question"]',
        ) as HTMLButtonElement
      ).click(),
    );
    expect(node.querySelector("textarea")?.value).toBe("Keep this note.");
  });
  it("blocks a stale save until the latest decision is loaded", async () => {
    await render();
    await edit("My note.");
    mocks.save.mockRejectedValueOnce({ code: "PT409" });
    await click("Approve question");
    expect(button("Approve question").disabled).toBe(true);
    mocks.list.mockResolvedValue([
      {
        question_id: "SRC-RCS-01",
        content_hash: "hash-SRC-RCS-01",
        status: "pending",
        notes: "Other reviewer note.",
        revision: 4,
        updated_at: "2026-10-02T01:00:00Z",
      },
    ]);
    await click("Reload latest decision");
    expect(node.querySelector("textarea")?.value).toBe("My note.");
    await click("Approve question");
    expect(mocks.save.mock.calls.at(-1)?.at(-1)).toBe(4);
  });
  it("does not allow approvals when saved decisions cannot be loaded", async () => {
    mocks.list.mockRejectedValue(new Error("database unavailable"));
    await render();
    expect(node.textContent).toContain("Saved decisions could not be loaded");
    expect(button("Approve question").disabled).toBe(true);
  });
});
