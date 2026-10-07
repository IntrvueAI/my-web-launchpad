import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));
import { supabase } from "@/integrations/supabase/client";
import {
  classInviteToken,
  classProgressCsv,
  schoolCsvCell,
  schoolApi,
  type ClassStudent,
} from "./schools";
import {
  safeAuthReturn,
  rememberAuthReturn,
  pendingAuthReturn,
  clearAuthReturn,
} from "./authReturn";

describe("Class invitation and sign-in boundaries", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  const token = "abcd".repeat(8);
  const id = "00000000-0000-4000-8000-000000000001";
  it("accepts genuine class links and raw codes", () => {
    expect(classInviteToken(` https://intrvue.ai/join-class/${token} `)).toBe(
      token,
    );
    expect(classInviteToken(token)).toBe(token);
    expect(
      classInviteToken(`https://www.intrvue.ai/join-class/${token}/`),
    ).toBe(token);
  });
  it.each([
    `https://intrvue.ai.evil.test/join-class/${token}`,
    `https://intrvue.ai@evil.test/join-class/${token}`,
    `javascript:alert(1)`,
    "/classes",
    "shortcode",
  ])("rejects an invalid or misleading invitation: %s", (link) =>
    expect(classInviteToken(link)).toBeNull(),
  );
  it("allows only expected local sign-in destinations", () => {
    for (const path of [
      "/schools",
      "/classes",
      `/schools/${id}/students/${id}?page=2&interview=${id}`,
      `/join-class/${token}`,
      "/admin/guest-feedback",
      "/reset-password",
    ])
      expect(safeAuthReturn(path)).toBe(path);
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/schools?next=https://evil.test",
    "/schools#evil",
    "/auth",
    "/schools/../../auth",
    "/classes?page=1.5",
    "/classes?interview=bad",
  ])("rejects unsafe return paths: %s", (path) =>
    expect(safeAuthReturn(path)).toBeNull(),
  );
  it("remembers the invitation for an email or Google round trip, then expires it", () => {
    rememberAuthReturn(`/join-class/${token}`);
    expect(pendingAuthReturn()).toBe(`/join-class/${token}`);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 86400001);
    expect(pendingAuthReturn()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it("clears a consumed return and tolerates corrupt storage", () => {
    rememberAuthReturn("/classes");
    clearAuthReturn();
    expect(pendingAuthReturn()).toBeNull();
    localStorage.setItem("intrvue:auth-return:v1", "not json");
    expect(pendingAuthReturn()).toBeNull();
  });
});
describe("Teacher CSV and feedback API", () => {
  it("escapes names, delimiters, quotes and spreadsheet formulas", () => {
    expect(schoolCsvCell('A, "B"')).toBe('"A, ""B"""');
    for (const value of ["=1+1", " +SUM(A1:A9)", "-2", "@evil", "\tname"])
      expect(schoolCsvCell(value).startsWith("\"'")).toBe(true);
    expect(schoolCsvCell(null)).toBe('""');
    expect(schoolCsvCell(0)).toBe('"0"');
  });
  it("exports only active pupils without manufacturing a score", () => {
    const rows = [
      {
        display_name: "Aisha",
        status: "active",
        stats: {
          completed: 1,
          this_week: 1,
          practice_days: 1,
          minutes: 5,
          average_score: null,
          unreviewed: 1,
          last_practice: null,
        },
      },
      { display_name: "Private pending pupil", status: "pending", stats: null },
    ] as ClassStudent[];
    const csv = classProgressCsv(rows);
    expect(csv).toContain("Aisha");
    expect(csv).not.toContain("Private pending pupil");
    expect(csv).toContain('"5","","1"');
  });
  it("censors transcripts returned to teachers", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { feedback: { transcription: "Student: that was shit." } },
      error: null,
    } as never);
    expect(JSON.stringify(await schoolApi("feedback"))).not.toContain("shit");
  });
  it("keeps server/database internals out of connection errors", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { code: "42703", message: "secret_schema details" },
    } as never);
    await expect(schoolApi("state")).rejects.toThrow("could not connect");
  });
  it("preserves actionable membership errors", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: {
        code: "P0001",
        message: "Student is not sharing with this class",
      },
    } as never);
    await expect(schoolApi("student")).rejects.toThrow("not sharing");
  });
});
