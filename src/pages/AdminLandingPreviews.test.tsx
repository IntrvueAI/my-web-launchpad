import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/hooks/useAdminStatus", () => ({ useAdminStatus: () => ({ isAdmin: admin.isAdmin, isLoading: false }) }));
vi.mock("@/components/marketing/medicineLandingDesigns", async () => {
  const { lazy } = await import("react");
  const stub = (text: string) => lazy(async () => ({ default: () => <main>{text}</main> }));
  const designs = [
    { id: "a", name: "Design A", note: "First", Component: stub("Landing A") },
    { id: "b", name: "Design B", note: "Second", Component: stub("Landing B") },
    { id: "c", name: "Design C", note: "Third", Component: stub("Landing C") },
  ];
  const actual = await vi.importActual<typeof import("@/components/marketing/medicineLandingDesigns")>("@/components/marketing/medicineLandingDesigns");
  return { MEDICINE_LANDING_DESIGNS: designs, designIndexFrom: (s: string) => actual.designIndexFrom(s, designs.length) };
});
import AdminLandingPreviews from "./AdminLandingPreviews";
import { designIndexFrom } from "@/components/marketing/medicineLandingDesigns";

let search = "";
const Spy = () => { search = useLocation().search; return null; };
const settle = async (node: HTMLElement, text: string) => {
  for (let i = 0; i < 50 && !node.textContent?.includes(text); i++) await act(() => new Promise((r) => setTimeout(r, 10)));
};
async function render(path: string) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.scrollTo = vi.fn();
  const node = document.createElement("div");
  document.body.appendChild(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/admin/landing-previews" element={<><AdminLandingPreviews /><Spy /></>} /></Routes>
    </MemoryRouter>,
  ));
  return { node, unmount: () => { act(() => root.unmount()); node.remove(); } };
}

describe("Landing page preview portal", () => {
  it("reads a 1-based design number and falls back to the first design", () => {
    expect(designIndexFrom("?design=2", 4)).toBe(1);
    expect(designIndexFrom("?design=9", 4)).toBe(0);
    expect(designIndexFrom("?design=abc", 4)).toBe(0);
    expect(designIndexFrom("", 4)).toBe(0);
  });

  it("switches designs with numbered buttons, Next, and arrow keys", async () => {
    const { node, unmount } = await render("/admin/landing-previews?design=2");
    try {
      await settle(node, "Landing B");
      const buttons = [...node.querySelectorAll<HTMLButtonElement>('[aria-label="Choose a design"] button')];
      expect(buttons.map((b) => b.textContent)).toEqual(["1", "2", "3"]);
      expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
      await act(async () => buttons[2].click());
      await settle(node, "Landing C");
      expect(search).toBe("?design=3");
      await act(async () => (node.querySelector('[aria-label="Next design"]') as HTMLButtonElement).click());
      await settle(node, "Landing A");
      expect(search).toBe("?design=1");
      await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })));
      await settle(node, "Landing C");
      expect(node.textContent).toContain("3. Design C");
    } finally {
      unmount();
    }
  });

  it("keeps designs behind administrator access", async () => {
    admin.isAdmin = false;
    const { node, unmount } = await render("/admin/landing-previews");
    try {
      expect(node.textContent).toContain("Admin access required");
      expect(node.textContent).not.toContain("Landing A");
    } finally {
      admin.isAdmin = true;
      unmount();
    }
  });
});
