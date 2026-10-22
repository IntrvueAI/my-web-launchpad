import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const orders = vi.hoisted(() => ({ createOrder: vi.fn(), createMedicineOrder: vi.fn() }));
vi.mock("@/services/OrderService", () => ({ OrderService: orders }));
vi.mock("@/hooks/useMedicineCredits", () => ({ useMedicineCredits: () => ({ credits: 2, isLoading: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import { CreditsStore } from "./CreditsStore";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const render = async (platform?: "medicine" | "11plus") => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<CreditsStore platform={platform} />));
  return host;
};
afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("Credit stores", () => {
  it("sells Medicine packs from the Medicine balance", async () => {
    orders.createMedicineOrder.mockReturnValue(new Promise(() => {}));
    const host = await render("medicine");
    expect(host.textContent).toContain("You have 2 Medicine credits");
    expect(host.textContent).toContain("£6.99");
    expect(host.textContent).toContain("£34.99");
    expect(host.textContent).toContain("Ethics & judgement is free");
    const buyFull = [...host.querySelectorAll("button")].find((b) => b.textContent === "Buy 6 credits")!;
    await act(async () => buyFull.click());
    expect(orders.createMedicineOrder).toHaveBeenCalledWith("full");
    expect(orders.createOrder).not.toHaveBeenCalled();
  });
  it("keeps the 11+ packs unchanged", async () => {
    const host = await render();
    expect(host.textContent).toContain("£19.99");
    expect(host.textContent).toContain("£29.99");
    expect(host.textContent).toContain("£44.99");
    expect(host.textContent).not.toContain("Medicine");
  });
});
