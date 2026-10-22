import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MEDICINE_LANDING_DESIGNS } from "./medicineLandingDesigns";
import { MEDICINE_LANDING_FAQS, MEDICINE_LANDING_PRICES, MEDICINE_TRY_PROMPT_IDS } from "./medicineLandingContent";
import { SOLO_PROMPT_IDS } from "@/interview/studio/bank";
import { MedicineLandingTry } from "./MedicineLandingTry";
import { MedicineLandingStory } from "./MedicineLandingStory";
import { MedicineLandingCalm } from "./MedicineLandingCalm";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const render = async (Component: () => JSX.Element) => {
  const node = document.createElement("div");
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(<Component />));
  return node;
};
const click = async (node: HTMLElement, text: string) =>
  act(async () => [...node.querySelectorAll("button")].find((b) => b.textContent?.trim() === text || b.getAttribute("aria-label") === text)!.click());
afterEach(() => { document.body.innerHTML = ""; });

describe("Medicine landing designs", () => {
  it("lists six distinct designs in the preview portal", () => {
    expect(MEDICINE_LANDING_DESIGNS.map((d) => d.id)).toEqual(["live", "coral-legacy", "flow", "calm", "try", "story"]);
  });
  it("uses only solo-published practice prompts in the interactive demo", () => {
    for (const id of MEDICINE_TRY_PROMPT_IDS) expect(SOLO_PROMPT_IDS.has(id)).toBe(true);
  });
  it("shows the real prices and no early-access claims", () => {
    expect(MEDICINE_LANDING_PRICES.map((p) => p.price)).toEqual(["Free", "£6.99", "£34.99"]);
    expect(JSON.stringify(MEDICINE_LANDING_FAQS)).not.toMatch(/early access/i);
  });
  it("lets a visitor read a station, then shows a follow-up and the price of practising it", async () => {
    const node = await render(MedicineLandingTry);
    expect(node.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(node.textContent).toContain("sign the attendance register");
    expect(node.textContent).toContain("1:00");
    await click(node, "I'm ready");
    expect(node.querySelector('[role="status"]')?.textContent).toContain("A follow-up you might hear");
    expect(node.textContent).toContain("Free");
    await act(async () => (node.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]).click());
    expect(node.textContent).toContain("50%");
    expect(node.querySelector('[role="status"]')).toBeNull();
    expect(node.textContent).toContain("1 credit · £6.99");
  });
  it("labels illustrations and never presents questions as university questions", async () => {
    for (const Component of [MedicineLandingStory, MedicineLandingCalm, MedicineLandingTry]) {
      const node = await render(Component);
      expect(node.textContent).toMatch(/Not affiliated with or endorsed by any university/);
      expect(node.textContent).not.toMatch(/(asked|used) (at|by|in) (the )?(University|Oxford|Cambridge|Imperial|Leeds|Manchester|King's|UCL)/i);
      node.remove();
    }
    const story = await render(MedicineLandingStory);
    expect(story.textContent).toContain("Illustration · not a real candidate");
  });
});
