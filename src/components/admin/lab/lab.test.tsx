import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { adminGroups } from "../AdminHub";
import { scriptLines, estimatedSpeechMs } from "./LabSandbox";
import { LabHistory } from "./LabHistory";
import { draftOverrides, labRunLabel, transcriptText, LAB_INTERVIEWS } from "@/lib/interviewLab";
import { brainVersion } from "@/interview/engine/brainVersions";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";

vi.mock("@/lib/interviewLab", async () => {
  const actual = await vi.importActual<typeof import("@/lib/interviewLab")>("@/lib/interviewLab");
  return { ...actual, labApi: { ...actual.labApi, saveNote: vi.fn() } };
});

describe("Admin hub", () => {
  const routes = [...readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
  it.each(["medicine", "11plus"] as const)("%s links only to pages that exist, with its own beta portal", (platform) => {
    const tools = adminGroups(platform).flatMap((g) => g.tools);
    expect(new Set(tools.map((t) => t.label)).size).toBe(tools.length);
    for (const tool of tools.filter((t) => t.to?.startsWith("/admin"))) {
      const path = tool.to!.split("?")[0];
      expect(routes, `${tool.label} → ${path}`).toContain(path);
    }
    expect(tools.some((t) => t.to === `/admin/lab?platform=${platform}`)).toBe(true);
    expect(tools.some((t) => t.to === (platform === "11plus" ? "/admin/11plus-trials" : "/admin/guest-trials"))).toBe(true);
  });
});

describe("Lab helpers", () => {
  it("only records switches that differ from the base version", () => {
    const base = brainVersion("2026-10-20")!.behaviour;
    expect(draftOverrides(base, { ...base, schoolWelcome: false })).toEqual({ schoolWelcome: false });
    expect(draftOverrides(base, base)).toEqual({});
  });
  it("labels runs and copies transcripts without control notes", () => {
    expect(labRunLabel({ version: "2026-10-12" })).toBe("Version 2026-10-12");
    expect(labRunLabel({ version: "2026-10-20", draftId: "d", draftName: "Warmer" })).toBe("Draft: Warmer (on 2026-10-20)");
    expect(transcriptText([{ role: "assistant", content: "Hi" }, { role: "user", content: "[I'm ready to begin.]" }, { role: "user", content: "Hello" }])).toBe("Clara: Hi\n\nCandidate: Hello");
  });
  it("offers each platform only real interview types", () => {
    for (const ids of Object.values(LAB_INTERVIEWS)) for (const id of ids) expect(INTERVIEW_TYPES[id], id).toBeDefined();
  });
});

describe("Sandbox scripts", () => {
  it("splits on blank lines and tidies spacing", () => {
    expect(scriptLines("Hi, I'm Clara.\n\n\n  Practise   with me.\nToday.\n\n")).toEqual(["Hi, I'm Clara.", "Practise with me. Today."]);
    expect(scriptLines("   ")).toEqual([]);
  });
  it("estimates speaking time with a sensible ceiling", () => {
    expect(estimatedSpeechMs("one two three four five six")).toBeGreaterThan(2500);
    expect(estimatedSpeechMs("word ".repeat(5000))).toBe(90_000);
  });
});

describe("Test history", () => {
  const sessions = [
    { id: "a", session_reference: "ra", interview_type: "medicine-ethics-practice", status: "completed", started_at: "2026-10-22T10:00:00Z", ended_at: null, preview: [], lab: { version: "2026-10-20" }, transcript: [{ role: "assistant" as const, content: "Hi Yuvraj" }] },
    { id: "b", session_reference: "rb", interview_type: "medicine-ethics-practice", status: "completed", started_at: "2026-10-21T10:00:00Z", ended_at: null, preview: [], lab: { version: "2026-10-09" }, transcript: [{ role: "assistant" as const, content: "Hello, I'm Clara" }] },
    { id: "c", session_reference: "rc", interview_type: "maths-interview", status: "completed", started_at: "2026-10-21T09:00:00Z", ended_at: null, preview: [], lab: { version: "2026-10-20" }, transcript: [] },
  ];
  it("shows only the platform's tests and flicks between them", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    try {
      await act(async () => root.render(<LabHistory platform="medicine" sessions={sessions} notes={[]} feedback={[]} userId="me" onNoteSaved={() => {}} />));
      expect(node.querySelectorAll('[aria-label="Lab tests"] li')).toHaveLength(2);
      const detail = () => node.querySelector('[aria-label="Selected test"]')!.textContent!;
      expect(detail()).toContain("Hi Yuvraj");
      await act(async () => (node.querySelector('[aria-label="Next test"]') as HTMLButtonElement).click());
      expect(detail()).toContain("Hello, I'm Clara");
      await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })));
      expect(detail()).toContain("Hi Yuvraj");
    } finally {
      act(() => root.unmount());
      node.remove();
    }
  });
});
