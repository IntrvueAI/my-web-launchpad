import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { InterviewSelection } from "./InterviewSelection";
import { MedicinePractice } from "./medicine-dashboard/MedicinePractice";
import { MedicineSchools } from "./medicine-dashboard/MedicineSchools";
import {
  getAllInterviewTypes,
  getInterviewTypesForProduct,
  INTERVIEW_TYPES,
  INTERVIEW_TYPES_CONFIG,
  MEDICINE_LIVE_INTERVIEW_IDS,
  RETIRED_MEDICINE_INTERVIEW_IDS,
} from "@/config/interviewTypes";
import {
  GUEST_INTERVIEW_IDS,
  GUEST_HISTORY_INTERVIEW_IDS,
} from "@/lib/guestTrials";

vi.mock("@/hooks/useCredits", () => ({ useCredits: () => ({ credits: 20 }) }));
vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => ({ stats: { upcomingSchoolInterviews: [] } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
  guestSupabase: {},
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("Separate practice catalogues", () => {
  it("keeps every Medicine format out of the 11+ picker", () => {
    const school = getInterviewTypesForProduct("11plus");
    expect(school.map((iv) => iv.id)).toContain("11-plus");
    expect(school.map((iv) => iv.id)).toContain("maths-interview");
    expect(school.map((iv) => iv.id)).toContain("chat-with-clara");
    expect(school.every((iv) => iv.category !== "medicine")).toBe(true);
  });
  it("offers exactly one full MMI and four mini interviews in Medicine and guest trials", () => {
    const ids = getInterviewTypesForProduct("medicine")
      .map((iv) => iv.id)
      .sort();
    expect(ids).toEqual([...MEDICINE_LIVE_INTERVIEW_IDS].sort());
    expect(ids).toHaveLength(5);
    expect([...GUEST_INTERVIEW_IDS].sort()).toEqual(ids);
    for (const id of ids) {
      const iv = INTERVIEW_TYPES[id];
      expect(iv.retired).not.toBe(true);
      expect(iv.verifiedAgainst).toBeUndefined();
      if (id !== "medicine-mmi-practice") {
        expect(iv.duration).toBe(7);
        expect(iv.timingSeconds).toEqual({ prep: 60, response: 300 });
      }
    }
  });
  it("keeps retired assessments readable and filterable without advertising a new university-style session", () => {
    const publicIds = getAllInterviewTypes().map((iv) => iv.id);
    for (const id of RETIRED_MEDICINE_INTERVIEW_IDS) {
      expect(publicIds).not.toContain(id);
      expect(GUEST_INTERVIEW_IDS).not.toContain(id);
      expect(GUEST_HISTORY_INTERVIEW_IDS).toContain(id);
      expect(INTERVIEW_TYPES[id].retired).toBe(true);
      expect(INTERVIEW_TYPES_CONFIG[id]).toBeDefined();
    }
    expect(INTERVIEW_TYPES["medicine-mmi"].name).toContain("Leeds");
  });
  it("renders no Medicine category or interview in the main 11+ practice screen", () => {
    const node = document.createElement("div");
    const root = createRoot(node);
    try {
      act(() =>
        root.render(<InterviewSelection onSelectInterview={vi.fn()} />),
      );
      expect(node.textContent).toContain("Choose your 11+ practice");
      expect(node.textContent).toContain("11+ School Interview");
      expect(node.textContent).not.toMatch(
        /Medicine|MMI|Leeds|Manchester|Oxford|Cambridge|Imperial/,
      );
      for (const button of node.querySelectorAll(".chip")) {
        act(() =>
          button.dispatchEvent(new MouseEvent("click", { bubbles: true })),
        );
        expect(node.textContent).not.toMatch(/Medicine|MMI/);
      }
    } finally {
      act(() => root.unmount());
    }
  });
  it("keeps the classic Medicine picker separate when switching product in the same component", () => {
    const node = document.createElement("div");
    const root = createRoot(node);
    const launch = vi.fn();
    try {
      act(() => root.render(<InterviewSelection onSelectInterview={launch} />));
      act(() =>
        [...node.querySelectorAll("button")]
          .find((b) => b.textContent === "Maths")!
          .click(),
      );
      act(() =>
        root.render(
          <InterviewSelection
            productLine="medicine"
            onSelectInterview={launch}
          />,
        ),
      );
      expect(node.querySelectorAll(".tile")).toHaveLength(5);
      expect(node.textContent).not.toContain("11+ School Interview");
      expect(node.textContent).not.toMatch(
        /Leeds|Manchester|Oxford|Cambridge|Imperial/,
      );
      const card = [...node.querySelectorAll(".tile")].find((c) =>
        c.textContent?.includes("Full MMI practice mock"),
      )!;
      act(() => (card.querySelector("button") as HTMLButtonElement).click());
      expect(launch.mock.calls[0][0].id).toBe("medicine-mmi-practice");
    } finally {
      act(() => root.unmount());
    }
  });
  it("shows four seven-minute mini choices and a single general full MMI on the Medicine dashboard", () => {
    const node = document.createElement("div");
    const root = createRoot(node);
    const launch = vi.fn();
    try {
      act(() => root.render(<MedicinePractice onStartInterview={launch} />));
      expect(node.textContent).toContain("7-minute mini interviews");
      expect(node.querySelectorAll("article")).toHaveLength(4);
      act(() =>
        [...node.querySelectorAll("button")]
          .find((b) => b.textContent?.includes("Start mini interview"))!
          .click(),
      );
      expect(launch.mock.calls[0][0].id).toBe("medicine-ethics-practice");
      act(() =>
        [...node.querySelectorAll("button")]
          .find((b) => b.textContent === "Full MMI")!
          .click(),
      );
      expect(node.querySelectorAll("article")).toHaveLength(1);
      expect(node.textContent).not.toMatch(
        /Leeds|Manchester|Oxford|Cambridge|Imperial|school-specific/,
      );
      act(() =>
        [...node.querySelectorAll("button")]
          .find((b) => b.textContent === "Start full circuit")!
          .click(),
      );
      expect(launch.mock.calls[1][0].id).toBe("medicine-mmi-practice");
    } finally {
      act(() => root.unmount());
    }
  });
  it("uses the general MMI from university research pages too", () => {
    const node = document.createElement("div");
    const root = createRoot(node);
    const launch = vi.fn();
    try {
      act(() => root.render(<MedicineSchools onStartInterview={launch} />));
      const buttons = [...node.querySelectorAll("button")].filter((b) =>
        b.textContent?.includes("Start general MMI practice"),
      );
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) act(() => button.click());
      expect(
        launch.mock.calls.every(([iv]) => iv.id === "medicine-mmi-practice"),
      ).toBe(true);
      expect(node.textContent).not.toMatch(/Start .*?-style practice/);
    } finally {
      act(() => root.unmount());
    }
  });
});
