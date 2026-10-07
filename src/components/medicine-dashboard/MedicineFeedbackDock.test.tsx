import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter, Link } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { id: "first-user", email: "first@example.test", app_metadata: {} } as any, medicine: true, product: "medicine", send: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/lib/site", () => ({ isMedicineSite: () => mocks.medicine }));
vi.mock("@/lib/productLine", () => ({ getStoredProductLine: () => mocks.product }));
vi.mock("@/lib/medicineProductFeedback", () => ({ FEEDBACK_COMMENT_LIMIT: 1000, submitMedicineProductFeedback: mocks.send }));
import { MedicineFeedbackDock } from "./MedicineFeedbackDock";
let root: Root, node: HTMLDivElement;
function Content() { return <MemoryRouter><Link to="/medicine/practice">Practice page</Link><MedicineFeedbackDock /></MemoryRouter>; }
async function render() { await act(async () => root.render(<Content />)); }
async function comment(value: string) { await act(async () => Simulate.change(node.querySelector("textarea")!, { target: { value } } as any)); }
async function click(label: string) { await act(async () => Simulate.click(node.querySelector(`[aria-label="${label}"]`)!)); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear(); vi.resetAllMocks();
  mocks.user = { id: "first-user", email: "first@example.test", app_metadata: {} };
  mocks.medicine = true; mocks.product = "medicine";
  mocks.send.mockResolvedValue(undefined);
  node = document.createElement("div"); document.body.append(node); root = createRoot(node);
});
afterEach(() => { act(() => root.unmount()); node.remove(); });
describe("Persistent medicine feedback", () => {
  it("keeps a draft through minimising and medicine navigation", async () => {
    await render(); await comment("Make the timer clearer.");
    await click("Minimise feedback panel");
    expect(localStorage.getItem("mmi:feedback-panel:first-user")).toBe("collapsed");
    expect(node.querySelector('[aria-controls]')?.getAttribute("aria-expanded")).toBe("false");
    await act(async () => node.querySelector<HTMLAnchorElement>('a[href="/medicine/practice"]')!.click());
    await click("Open feedback panel");
    expect(node.querySelector("textarea")?.value).toBe("Make the timer clearer.");
  });
  it("retains failed submissions and reuses the same ID on an unchanged retry", async () => {
    mocks.send.mockRejectedValueOnce(new Error("network interrupted"));
    await render(); await comment("The interview felt realistic.");
    await click("Rate 4 out of 5");
    await act(async () => Simulate.submit(node.querySelector("form")!));
    expect(node.textContent).toContain("Your message is still here");
    expect(node.querySelector("textarea")?.value).toBe("The interview felt realistic.");
    await act(async () => Simulate.submit(node.querySelector("form")!));
    expect(mocks.send.mock.calls[0][0].id).toBe(mocks.send.mock.calls[1][0].id);
    expect(mocks.send).toHaveBeenLastCalledWith(expect.objectContaining({ userId: "first-user", rating: 4, comment: "The interview felt realistic." }));
    expect(node.textContent).toContain("Your feedback has been saved");
    expect(node.querySelector("textarea")).toBeNull();
  });
  it("clears private draft state when another user signs in", async () => {
    await render(); await comment("First user's draft");
    mocks.user = { id: "second-user", email: "second@example.test", app_metadata: {} };
    await render();
    expect(node.querySelector("textarea")?.value).toBe("");
  });
  it("is absent for signed-out users, guest trials and the 11+ product", async () => {
    mocks.user = null; await render(); expect(node.querySelector("aside")).toBeNull();
    mocks.user = { id: "guest", app_metadata: { mmi_guest_trial: true } };
    await render(); expect(node.querySelector("aside")).toBeNull();
    mocks.user = { id: "school-user", app_metadata: {} }; mocks.medicine = false; mocks.product = "11plus";
    await act(async () => window.dispatchEvent(new Event("intrvue:product-line-changed")));
    await render(); expect(node.querySelector("aside")).toBeNull();
  });
  it("does not submit an empty message and ignores repeated clicks while saving", async () => {
    await render();
    await act(async () => Simulate.submit(node.querySelector("form")!));
    expect(mocks.send).not.toHaveBeenCalled();
    let resolve!: () => void;
    mocks.send.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    await comment("The feedback is useful.");
    await act(async () => { Simulate.submit(node.querySelector("form")!); Simulate.submit(node.querySelector("form")!); });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(node.textContent).toContain("Your feedback has been saved");
  });
});
