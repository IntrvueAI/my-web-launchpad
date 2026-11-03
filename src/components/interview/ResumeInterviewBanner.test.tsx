import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const open = vi.hoisted(() => ({ value: null as null | Record<string, unknown> }));
const end = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/hooks/useResumableInterview", () => ({ useResumableInterview: () => ({ data: open.value }) }));
vi.mock("@/services/SessionService", () => ({ SessionService: { endSession: end } }));
import { ResumeInterviewBanner } from "./ResumeInterviewBanner";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function render(onRejoin = vi.fn(), enabled = true) {
  const node = document.createElement("div");
  document.body.append(node);
  await act(async () => createRoot(node).render(
    <QueryClientProvider client={new QueryClient()}><ResumeInterviewBanner onRejoin={onRejoin} enabled={enabled} /></QueryClientProvider>,
  ));
  return node;
}
const button = (node: HTMLElement, text: string) => [...node.querySelectorAll("button")].find((b) => b.textContent?.trim() === text)!;
afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); open.value = null; });

describe("Rejoin banner", () => {
  it("offers to rejoin an interview left open by a refresh", async () => {
    open.value = { id: "s1", reference: "REF1", interviewType: "medicine-ethics-practice", lastActivityAt: new Date().toISOString(), finished: false };
    const onRejoin = vi.fn();
    const node = await render(onRejoin);
    expect(node.textContent).toContain("Your Ethics & judgement is still open");
    await act(async () => button(node, "Rejoin").click());
    expect(onRejoin).toHaveBeenCalledWith(expect.objectContaining({ id: "medicine-ethics-practice" }), { id: "s1", reference: "REF1" });
  });
  it("lets the student end it instead", async () => {
    open.value = { id: "s1", reference: "REF1", interviewType: "medicine-ethics-practice", lastActivityAt: new Date().toISOString(), finished: false };
    const node = await render();
    await act(async () => button(node, "End it").click());
    expect(end).toHaveBeenCalledWith("s1", "abandoned");
  });
  it("points a finished interview at its feedback, and stays hidden during an interview", async () => {
    open.value = { id: "s1", reference: "REF1", interviewType: "medicine-ethics-practice", lastActivityAt: new Date().toISOString(), finished: true };
    const node = await render();
    expect(node.textContent).toContain("Open it to see the transcript and get your feedback");
    document.body.innerHTML = "";
    const hidden = await render(vi.fn(), false);
    expect(hidden.textContent).toBe("");
  });
});
