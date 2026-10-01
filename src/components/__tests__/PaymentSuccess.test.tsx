import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { PaymentSuccess } from "../PaymentSuccess";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/invokeEdgeFunction", () => ({
  invokeEdgeFunction: mocks.invoke,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("react-confetti", () => ({
  default: () => <div data-testid="confetti" />,
}));
let node: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/?session_id=test-payment");
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});
it("shows an unconfirmed state on failure and celebrates only after a successful retry", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.invoke
    .mockResolvedValueOnce({ data: null, error: new Error("offline") })
    .mockResolvedValueOnce({
      data: { balance: 4, credits_added: 2 },
      error: null,
    });
  await act(async () =>
    root.render(
      <PaymentSuccess onGoToPractice={() => {}} onGoToCredits={() => {}} />,
    ),
  );
  expect(node.textContent).toContain("Payment not yet confirmed");
  expect(node.querySelector('[data-testid="confetti"]')).toBeNull();
  const retry = [...node.querySelectorAll("button")].find(
    (b) => b.textContent === "Retry payment check",
  )!;
  await act(async () => retry.click());
  expect(node.textContent).toContain("Payment successful");
  expect(node.textContent).toContain("New balance: 4");
  expect(node.querySelector('[data-testid="confetti"]')).not.toBeNull();
});
it("does not claim payment success for a missing reference", async () => {
  window.history.replaceState({}, "", "/");
  await act(async () =>
    root.render(
      <PaymentSuccess onGoToPractice={() => {}} onGoToCredits={() => {}} />,
    ),
  );
  expect(node.textContent).toContain("No payment reference");
  expect(mocks.invoke).not.toHaveBeenCalled();
  expect(node.textContent).not.toContain("Payment successful");
});
