import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ update: vi.fn(), updateUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ update: (value: unknown) => { db.update(value); return { eq: async () => ({ error: null }) }; } }),
    auth: { updateUser: async (value: unknown) => { db.updateUser(value); return { error: null }; } },
  },
}));
vi.mock("@/components/brand/Pip", () => ({ Pip: () => <span data-testid="pip" /> }));
import { OnboardingFlow } from "./OnboardingFlow";
import { TourBubble, TOUR_STEPS } from "@/components/tour/TourOverlay";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const schools = [{ name: "Westminster School", region: "London", notes: "Interviews in January" }, { name: "Eton College", region: "Windsor" }];
vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(schools))));

async function render(ui: JSX.Element) {
  const node = document.createElement("div");
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(ui));
  await act(async () => {});
  return node;
}
const buttons = (node: HTMLElement, text: string | RegExp) =>
  [...node.querySelectorAll("button")].filter((b) => (typeof text === "string" ? b.textContent?.trim() === text : text.test(b.textContent ?? "")));
const click = async (el: HTMLElement) => act(async () => { el.click(); });
const type = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
};
const heading = (node: HTMLElement) => node.querySelector("h1")?.textContent;
/** Steps slide in after the previous one has left; wait for the new heading rather than a fixed time. */
const waitForHeading = async (node: HTMLElement, text: string) => {
  for (let i = 0; i < 100 && heading(node) !== text; i++) await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  expect(heading(node)).toBe(text);
};
afterEach(() => { document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("Onboarding", () => {
  it("walks through every step, then saves and hands over to the tour", async () => {
    const onComplete = vi.fn();
    const node = await render(<OnboardingFlow userId="u1" onComplete={onComplete} />);
    await waitForHeading(node, "Hi, I'm Pip. What's your name?");
    const continueButtons = () => buttons(node, /^Continue/);
    expect(continueButtons().every((b) => b.disabled)).toBe(true);
    await type(node.querySelector("#onboarding-name")!, "Amelia Jones");
    await click(continueButtons()[0]);

    await waitForHeading(node, "Which schools are you applying to, Amelia?");
    expect(continueButtons()[0].disabled).toBe(true);
    await type(node.querySelector("#onboarding-school")!, "west");
    await click(buttons(node, /Westminster School/)[0]);
    expect(node.querySelector('[aria-label="Remove Westminster School"]')).not.toBeNull();
    await click(continueButtons()[0]);

    await waitForHeading(node, "How much interview practice have you had?");
    const radio = node.querySelector<HTMLButtonElement>('[role="radio"]')!;
    await click(radio);
    expect(radio.getAttribute("aria-checked")).toBe("true");
    await click(continueButtons()[0]);

    await waitForHeading(node, "How often would you like to practise?");
    await click(node.querySelectorAll<HTMLButtonElement>('[role="radio"]')[1]);
    await click(continueButtons()[0]);

    await waitForHeading(node, "Your starter plan, Amelia");
    expect(node.textContent).toContain("Westminster School: Interviews in January");
    await click(buttons(node, /Go to my dashboard/)[0]);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ full_name: "Amelia Jones", schools: ["Westminster School"] }));
    expect(db.updateUser).toHaveBeenCalledWith({ data: { full_name: "Amelia Jones", study_intensity: "steady", experience_level: "new" } });
    expect(onComplete).toHaveBeenCalled();
  });

  it("lets a family skip schools they haven't chosen yet", async () => {
    const node = await render(<OnboardingFlow userId="u1" onComplete={vi.fn()} />);
    await type(node.querySelector("#onboarding-name")!, "Sam");
    await click(buttons(node, /^Continue/)[0]);
    await click(buttons(node, "I'm not sure yet")[0]);
    await waitForHeading(node, "How much interview practice have you had?");
  });
});

describe("Tour bubble", () => {
  it("shows the step count, a clear skip and an explicit next", async () => {
    const onSkip = vi.fn();
    const onNext = vi.fn();
    const node = await render(<TourBubble bubble={{ mode: "banner" }} step={2} message="Try today's question." onSkip={onSkip} onNext={onNext} />);
    expect(node.textContent).toContain(`3 of ${TOUR_STEPS.length}`);
    expect(node.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => buttons(node, "Next")[0].click());
    expect(onNext).toHaveBeenCalledTimes(1);
    await act(async () => buttons(node, "Skip tour")[0].click());
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
  it("asks for the highlighted button when a step advances by clicking it", async () => {
    const node = await render(<TourBubble bubble={{ mode: "below", top: 10, left: 10, arrowLeft: 40, bw: 300 }} step={TOUR_STEPS.length - 1} message="Click Practice." onSkip={vi.fn()} />);
    expect(node.textContent).toContain("Click the highlighted button");
    expect(buttons(node, /Next|Finish/)).toHaveLength(0);
  });
});
