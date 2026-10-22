import { describe, expect, it, vi } from "vitest";
import { advanceAgent, buildSystemPrompt, initAgentState, type AgentState, type ChatResult } from "../agent";
import { BRAIN_BEHAVIOURS, BRAIN_VERSIONS, CURRENT_BRAIN_VERSION, brainVersion, fillLabLine, resolveLab, type LabDraft } from "../brainVersions";
import { packForMedicinePractice, MEDICINE_PRACTICE_MODES } from "../../subjects/medicine/practiceModes";
import { mathsPack } from "../../subjects/maths/pack";
import { getBank } from "../../bank";

const prose = (content: string): ChatResult => ({ content, toolCalls: [], raw: [] });
const finish = (content: string): ChatResult => ({
  content,
  toolCalls: [{ id: "f", name: "finish_interview", args: { outcome: "correct_method", method_quality: "sound", note: "ok" } }],
  raw: [],
});
const ethicsMode = MEDICINE_PRACTICE_MODES.find((m) => m.topic === "ethics-scenarios")!;
const ethicsPack = packForMedicinePractice(ethicsMode);
const ethicsBank = getBank("medicine").filter((q) => q.topic === "ethics-scenarios").slice(0, 1);
const MATHS = [{ id: "m1", subject: "maths", topic: "arithmetic", difficulty: 2 as const, question: "What is 7 times 8?", answer: "56" }];
const lab = (version: string, draft?: LabDraft): Partial<AgentState> => {
  const resolved = resolveLab(version, draft)!;
  return { behaviour: resolved.behaviour, lab: resolved.lab };
};
const medicine = (version: string, extra: Partial<AgentState> = {}): AgentState => ({
  ...initAgentState({ subject: "medicine", mode: "mock", pack: ethicsPack, seed: 1, studentName: "Yuvraj" }),
  ...lab(version),
  ...extra,
});
const maths = (version: string, extra: Partial<AgentState> = {}): AgentState => ({
  ...initAgentState({ subject: "maths", mode: "mock", pack: mathsPack, seed: 1, studentName: "Amelia" }),
  ...lab(version),
  ...extra,
});

describe("Version catalogue", () => {
  it("is dated in order, ends with the current version and turns every switch on there", () => {
    const dates = BRAIN_VERSIONS.map((v) => v.date);
    expect([...dates].sort()).toEqual(dates);
    expect(CURRENT_BRAIN_VERSION).toBe(BRAIN_VERSIONS.at(-1)!.id);
    expect(Object.values(brainVersion(CURRENT_BRAIN_VERSION)!.behaviour).every(Boolean)).toBe(true);
    expect(Object.values(BRAIN_VERSIONS[0].behaviour).some(Boolean)).toBe(false);
    for (const v of BRAIN_VERSIONS) expect(Object.keys(v.behaviour).sort()).toEqual(BRAIN_BEHAVIOURS.map((b) => b.key).sort());
  });
  it("rejects unknown versions", () => {
    expect(resolveLab("1999-01-01")).toBeNull();
  });
});

describe("Medicine replays", () => {
  it("9 October opens the station at once with the original wording", async () => {
    const chat = vi.fn(async () => prose("unused"));
    const r = await advanceAgent(medicine("2026-10-09"), { action: "start" }, { bank: ethicsBank, pack: ethicsPack, chat });
    expect(r.say.startsWith("Hello, I'm Clara, your AI practice interviewer. We will work through one focused station. I will introduce each task before you respond. Station 1 of 1: Ethics scenarios. You have one minute to read the brief. Select I'm ready to start answering early. ")).toBe(true);
    expect(r.say).toContain(ethicsBank[0].question);
    expect(r.state.current?.id).toBe(ethicsBank[0].id);
    expect(chat).not.toHaveBeenCalled();
  });
  it("12 October greets by name first and repeats the last line", async () => {
    const r = await advanceAgent(medicine("2026-10-12"), { action: "start" }, { bank: ethicsBank, pack: ethicsPack, chat: async () => prose("unused") });
    expect(r.say).toMatch(/^Hi Yuvraj, I'm Clara/);
    const state = medicine("2026-10-12", { current: ethicsBank[0], askedIds: [ethicsBank[0].id], currentStudentTurns: ["An answer."], transcript: [{ role: "assistant", content: "What would change your view?" }] });
    const again = await advanceAgent(state, { action: "answer", studentText: "Could you say that again?" }, { bank: ethicsBank, pack: ethicsPack, chat: async () => prose("unused") });
    expect(again.say).toBe("What would change your view?");
  });
  it("before 12 October, \"say that again\" goes to the model as an ordinary answer", async () => {
    const chat = vi.fn(async () => prose("Of course: what would change your view?"));
    const state = medicine("2026-10-09", { current: ethicsBank[0], askedIds: [ethicsBank[0].id], currentStudentTurns: ["An answer."], transcript: [{ role: "assistant", content: "What would change your view?" }] });
    await advanceAgent(state, { action: "answer", studentText: "Could you say that again?" }, { bank: ethicsBank, pack: ethicsPack, chat });
    expect(chat).toHaveBeenCalled();
  });
  it("before 15 October the model's own closing is kept and neutral rules are absent", async () => {
    const state = medicine("2026-10-12", { current: ethicsBank[0], askedIds: [ethicsBank[0].id], currentStudentTurns: ["One.", "Two."], targetQuestions: 1 });
    const r = await advanceAgent(state, { action: "time_up" }, { bank: ethicsBank, pack: ethicsPack, chat: async () => prose("If you'd like to try another station, just let me know.") });
    expect(r.done).toBe(true);
    expect(r.say).not.toContain("Select End interview to see your feedback");
    expect(buildSystemPrompt(ethicsPack, state)).not.toContain("Never build a question on a negative assumption");
    expect(buildSystemPrompt(ethicsPack, medicine("2026-10-15"))).toContain("Never build a question on a negative assumption");
  });
});

describe("11+ replays", () => {
  it("before 20 October the model opens and closes in its own words", async () => {
    const chat = vi.fn(async () => prose("Hi! I'm Clara. Tell me about yourself."));
    const r = await advanceAgent(maths("2026-10-15"), { action: "start" }, { bank: MATHS, pack: mathsPack, chat });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(r.say).toBe("Hi! I'm Clara. Tell me about yourself.");
    const once = vi.fn().mockResolvedValueOnce(finish("You did really well!")).mockResolvedValue(prose(""));
    const finished = await advanceAgent(maths("2026-10-15", { current: MATHS[0], askedIds: ["m1"], targetQuestions: 1 }), { action: "answer", studentText: "56." }, { bank: MATHS, pack: mathsPack, chat: once });
    expect(finished.say).toBe("You did really well!");
  });
  it("before 20 October the earlier instructions are restored word for word", () => {
    const prompt = buildSystemPrompt(mathsPack, maths("2026-10-15"));
    expect(prompt).toContain('"Ha, we can chat about that after — let\'s finish this one first."');
    expect(prompt).toContain("give one genuine, specific positive");
    expect(prompt).not.toContain("FOLLOW-UPS: ask them like a kind");
    const current = buildSystemPrompt(mathsPack, maths("2026-10-20"));
    expect(current).toContain("FOLLOW-UPS: ask them like a kind");
    expect(current).not.toContain("we can chat about that after");
  });
  it("20 October greets the child first", async () => {
    const r = await advanceAgent(maths("2026-10-20"), { action: "start" }, { bank: MATHS, pack: mathsPack, chat: async () => prose("unused") });
    expect(r.say).toMatch(/^Hi Amelia, I'm Clara/);
  });
});

describe("Founder drafts", () => {
  const draft: LabDraft = {
    id: "d1", name: "Warmer opening", platform: "11plus", base_version: "2026-10-20",
    behaviour: { schoolRepeatLastLine: false },
    opening_line: "Hello {name}! Lovely to meet you. Shall we begin?",
    closing_line: "Brilliant work today, {name}. Press End interview for your feedback.",
    extra_instructions: "Speak a little more slowly and use shorter sentences.",
  };
  it("uses the founder's opening and closing lines and passes extra instructions to the model", async () => {
    const chat = vi.fn(async ({ messages }) => {
      expect(messages[0].content).toContain("LAB TEST INSTRUCTIONS");
      expect(messages[0].content).toContain("Speak a little more slowly");
      return finish("ignored");
    });
    const start = await advanceAgent(maths("2026-10-20", lab("2026-10-20", draft)), { action: "start" }, { bank: MATHS, pack: mathsPack, chat });
    expect(start.say).toBe("Hello Amelia! Lovely to meet you. Shall we begin?");
    const end = await advanceAgent({ ...start.state, awaitingReady: false, current: MATHS[0], askedIds: ["m1"], targetQuestions: 1 }, { action: "answer", studentText: "56" }, { bank: MATHS, pack: mathsPack, chat });
    expect(end.say).toBe("Brilliant work today, Amelia. Press End interview for your feedback.");
    expect(end.state.lab?.draftName).toBe("Warmer opening");
  });
  it("applies switch overrides on top of the base version", () => {
    const resolved = resolveLab("2026-10-09", draft)!;
    expect(resolved.lab.version).toBe("2026-10-20");
    expect(resolved.behaviour.schoolRepeatLastLine).toBe(false);
    expect(resolved.behaviour.schoolWelcome).toBe(true);
  });
  it("fills or drops {name} cleanly", () => {
    expect(fillLabLine("Hi {name}, ready?", "Tom")).toBe("Hi Tom, ready?");
    expect(fillLabLine("Hi {name}, ready?")).toBe("Hi, ready?");
    expect(fillLabLine("Thanks, {name}.")).toBe("Thanks.");
  });
});
