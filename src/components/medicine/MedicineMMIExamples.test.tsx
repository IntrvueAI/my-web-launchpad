import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MedicineMMIExamples, RehearsalTimer } from "./MedicineMMIExamples";

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

let node: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  auth.user = null;
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});
function HistoryControls() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>History back</button>;
}
function renderLibrary(path = "/medicine/examples") {
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <MedicineMMIExamples />
        <HistoryControls />
      </MemoryRouter>,
    ),
  );
}
function click(label: string) {
  const button = [...node.querySelectorAll("button")].find((value) =>
    value.textContent?.includes(label),
  );
  expect(button, `Button: ${label}`).toBeDefined();
  act(() => button!.click());
}
function fill(selector: string, value: string) {
  const input = node.querySelector<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(selector)!;
  expect(input, selector).not.toBeNull();
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : input instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(
      new Event(input instanceof HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}
function answer() {
  return node.querySelector<HTMLTextAreaElement>("#mmi-answer")!;
}

describe("MMI practice library", () => {
  it("opens a bookmarked medical scenario and keeps its response hidden until requested", () => {
    renderLibrary("/medicine/examples?station=mmi-refusal-test");
    expect(node.querySelector("h2")?.textContent).toBe(
      "A patient refuses a recommended test",
    );
    expect(node.querySelector('[aria-label="Worked MMI response"]')).toBeNull();
    click("Compare with a worked response");
    expect(node.textContent).toContain(
      "Disagreeing with the recommendation is not by itself evidence of incapacity",
    );
    expect(node.textContent).toContain("not an admissions score");
    expect(node.querySelector("#followup-answer-0")).toBeNull();
    click("Reveal follow-up 1 response");
    expect(node.querySelector("#followup-answer-0")?.textContent).toContain(
      "informed refusal",
    );
  });

  it("routes focused feedback to a relevant MMI category and handles invalid bookmarks", () => {
    renderLibrary(
      "/medicine/examples?interview=medicine-data-practice&station=missing",
    );
    expect(node.querySelector("h2")?.textContent).toContain("halves the risk");
    expect(node.querySelector("table")).not.toBeNull();
  });

  it("filters medical topics, clears an empty result and restores selection on browser back", () => {
    renderLibrary();
    fill('select[aria-label="Filter MMI topics"]', "Patient communication");
    expect(node.querySelectorAll("button[aria-pressed]")).toHaveLength(4);
    const original = node.querySelector("h2")?.textContent;
    click("Next MMI station");
    expect(node.querySelector("h2")?.textContent).not.toBe(original);
    expect(document.activeElement).toBe(node.querySelector("h2"));
    click("History back");
    expect(node.querySelector("h2")?.textContent).toBe(original);
    fill('input[aria-label="Search MMI stations"]', "no-such-medical-station");
    expect(node.querySelector("article")).toBeNull();
    click("Clear filters");
    expect(node.querySelectorAll("button[aria-pressed]")).toHaveLength(24);
    expect(node.querySelector("article")).not.toBeNull();
  });

  it("keeps drafts, follow-ups and self-review separate for each station and account", () => {
    renderLibrary();
    fill("#mmi-answer", "Ask what the patient wishes to share.");
    fill("#mmi-followup-0", "Ask about practical care needs.");
    click("Compare with a worked response");
    act(() =>
      node.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    );
    click("Next MMI station");
    expect(answer().value).toBe("");
    click("History back");
    expect(answer().value).toBe("Ask what the patient wishes to share.");
    expect(
      node.querySelector<HTMLTextAreaElement>("#mmi-followup-0")?.value,
    ).toBe("Ask about practical care needs.");
    click("Compare with a worked response");
    expect(
      node.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked,
    ).toBe(true);
    auth.user = { id: "another-user" };
    renderLibrary();
    expect(answer().value).toBe("");
    fill("#mmi-answer", "This belongs to another user.");
    auth.user = null;
    renderLibrary();
    expect(answer().value).toBe("Ask what the patient wishes to share.");
  });

  it("recovers malformed saved attempts and remains usable with storage blocked", () => {
    localStorage.setItem(
      "intrvue:mmi-example:v1:guest:mmi-relative-results",
      "{broken",
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    renderLibrary();
    expect(answer().value).toBe("");
    fill("#mmi-answer", "Still usable");
    expect(answer().value).toBe("Still usable");
    expect(node.textContent).toContain("Keep a copy before leaving");
  });

  it("validates saved review indices and warns that reflection models are fictional", () => {
    localStorage.setItem(
      "intrvue:mmi-example:v1:guest:mmi-why-medicine",
      JSON.stringify({
        draft: 7,
        checked: [0, 0, -1, 3, "1", 1.5],
        followUps: ["Saved", 17],
      }),
    );
    renderLibrary("/medicine/examples?station=mmi-why-medicine");
    click("Compare with a worked response");
    expect(node.textContent).toContain("Fictional reflection");
    expect(
      node.querySelectorAll('input[type="checkbox"]:checked'),
    ).toHaveLength(1);
    expect(answer().value).toBe("");
    expect(
      node.querySelector<HTMLTextAreaElement>("#mmi-followup-1")?.value,
    ).toBe("");
  });

  it("checks the screening denominator, accepts rounding and explains mistakes", () => {
    renderLibrary("/medicine/examples?station=mmi-screening-result");
    const buttons = [...node.querySelectorAll("button")].filter(
      (button) => button.textContent === "Check calculation",
    );
    act(() => buttons[0].click());
    expect(node.textContent).toContain("Enter a number");
    fill("#mmi-calculation-0", "135");
    act(() => buttons[0].click());
    expect(node.textContent).toContain("Correct. 40 true positives");
    fill("#mmi-calculation-1", "80");
    act(() => buttons[1].click());
    expect(node.textContent).toContain(
      "Try again. The denominator is everyone who screened positive",
    );
    fill("#mmi-calculation-1", "29.6");
    act(() => buttons[1].click());
    expect(node.textContent).toContain("Correct. 40 ÷ 135");
    fill("#mmi-calculation-1", "Infinity");
    act(() => buttons[1].click());
    expect(node.textContent).toContain("Enter a number");
  });
});

describe("Optional MMI rehearsal clock", () => {
  it("pauses, resumes and expires using elapsed time, including a suspended tab", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
    act(() => root.render(<RehearsalTimer />));
    click("Start 5-minute rehearsal");
    act(() => vi.advanceTimersByTime(20000));
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("4:40");
    click("Pause rehearsal");
    act(() => vi.advanceTimersByTime(30000));
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("4:40");
    click("Resume rehearsal");
    act(() => {
      vi.setSystemTime(Date.now() + 301000);
      vi.advanceTimersByTime(500);
    });
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("0:00");
    expect(node.textContent).toContain("Time is up");
    expect(node.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
      true,
    );
    act(() =>
      node
        .querySelector<HTMLButtonElement>(
          '[aria-label="Reset rehearsal timer"]',
        )!
        .click(),
    );
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("5:00");
    expect(node.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
      false,
    );
  });

  it("stops the previous clock when the student chooses another station", () => {
    vi.useFakeTimers();
    renderLibrary();
    click("Start 5-minute rehearsal");
    act(() => vi.advanceTimersByTime(12000));
    click("Next MMI station");
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("5:00");
    act(() => vi.advanceTimersByTime(20000));
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("5:00");
  });
});
