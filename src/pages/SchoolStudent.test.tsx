import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));
import { TeacherReview } from "./SchoolStudent";
import type { SchoolFeedback } from "@/lib/schools";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
describe("Teacher feedback editing", () => {
  it("preserves a draft when the background refresh receives another teacher tab’s saved note", async () => {
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    const cache = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const save = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "Teacher feedback changed in another tab. Reload it before saving",
        ),
      );
    const reload = vi.fn();
    const render = (initial: SchoolFeedback) =>
      act(() =>
        root.render(
          <QueryClientProvider client={cache}>
            <TeacherReview
              initial={initial}
              archived={false}
              onSave={save}
              onReload={reload}
            />
          </QueryClientProvider>,
        ),
      );
    try {
      render({ feedback: null, note: "Original note", note_version: 1 });
      const input = node.querySelector("textarea")!;
      act(() => {
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )!.set!.call(input, "My unsaved next step");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(input.value).toBe("My unsaved next step");
      render({ feedback: null, note: "Other tab note", note_version: 2 });
      expect(input.value).toBe("My unsaved next step");
      expect(node.textContent).toContain("Unsaved changes");
      const button = [...node.querySelectorAll("button")].find(
        (b) => b.textContent === "Save teacher feedback",
      )!;
      await act(async () => {
        button.click();
        await new Promise((r) => setTimeout(r, 20));
      });
      expect(save).toHaveBeenCalledWith("My unsaved next step", 1);
      expect(node.textContent).toContain("another tab");
      expect(input.value).toBe("My unsaved next step");
    } finally {
      act(() => root.unmount());
      cache.clear();
      node.remove();
    }
  });
  it("keeps teacher comments read-only in archived classes", () => {
    const node = document.createElement("div");
    const root = createRoot(node);
    const cache = new QueryClient();
    try {
      act(() =>
        root.render(
          <QueryClientProvider client={cache}>
            <TeacherReview
              initial={{
                feedback: null,
                note: "A useful next step",
                note_version: 1,
                reviewed_at: "2026-10-06",
              }}
              archived
              onSave={vi.fn()}
              onReload={vi.fn()}
            />
          </QueryClientProvider>,
        ),
      );
      expect(node.querySelector("textarea")?.disabled).toBe(true);
      expect(node.textContent).toContain("separate from the AI assessment");
      expect(node.textContent).not.toContain("Save teacher feedback");
    } finally {
      act(() => root.unmount());
      cache.clear();
    }
  });
});
