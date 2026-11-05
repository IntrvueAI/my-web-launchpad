import { describe, expect, it, vi } from "vitest";
import { advanceAgent, buildSystemPrompt, initAgentState, stationTimingFor, type AgentState, type ChatResult } from "../agent";
import { setQuestionsFor } from "../setQuestions";
import { getBank } from "../../bank";
import { getMedicinePractice, packForFullMmiMock, packForMedicinePractice } from "../../subjects/medicine/practiceModes";
import type { BankQuestion } from "../types";

const bank = getBank("medicine");
const ethics = bank.find((q) => q.id === "MED-E1")!;
const roleplay = bank.find((q) => q.id === "MED-RP-018")!;
const pack = packForMedicinePractice(getMedicinePractice("medicine-ethics-practice")!);
const [first, second] = ethics.liveProbes!;

const prose = (content: string): ChatResult => ({ content, toolCalls: [], raw: [] });
const next = (content = ""): ChatResult => ({
  content,
  toolCalls: [{ id: "next", name: "next_problem", args: { outcome: "correct_method", method_quality: "sound", note: "Weighed need and benefit." } }],
  raw: [],
});
const withPreview = (extra: Partial<AgentState> = {}): AgentState => ({
  ...initAgentState({ subject: "medicine", mode: "mock", pack, seed: 0 }),
  preview: ["station-sub-questions"],
  ...extra,
});
const deps = (chat: ReturnType<typeof vi.fn>, questions: BankQuestion[] = [ethics], p = pack) => ({ bank: questions, pack: p, chat });
async function openStation(state: AgentState, d: ReturnType<typeof deps>) {
  const welcome = await advanceAgent(state, { action: "start" }, d);
  return advanceAgent(welcome.state, { action: "answer", studentText: "Ready." }, d);
}
const answer = (state: AgentState, studentText: string, d: ReturnType<typeof deps>, stationSecondsLeft?: number) =>
  advanceAgent(state, { action: "answer", studentText, expectedQuestionIndex: state.questionIndex, stationSecondsLeft }, d);
const sentSystem = (chat: ReturnType<typeof vi.fn>) =>
  (chat.mock.calls.at(-1)![0].messages as { role: string; content: string }[]).filter((m) => m.role === "system").map((m) => m.content).join("\n");

describe("Set questions within a station (preview)", () => {
  it("uses authored probes that stand on their own, not ones that assume the answer or are spoken in character", () => {
    expect(setQuestionsFor(ethics)).toEqual(ethics.liveProbes);
    const presumes = { ...ethics, liveProbes: [{ probe: "You said access is unequal — is uptake also unequal?", goodResponse: "x" }, { probe: "That sounds like it worked out — was there a cost?", goodResponse: "x" }, first] };
    expect(setQuestionsFor(presumes)).toEqual([first]);
    expect(setQuestionsFor({ ...ethics, questionType: "Explanation Task" })).toEqual([]);
    expect(setQuestionsFor({ ...ethics, liveProbes: [{ probe: "[as the child] Is it an experiment?", goodResponse: "x" }] })).toEqual([]);
    expect(setQuestionsFor(roleplay)).toEqual([]);
    const stations = bank.filter((q) => !q.roleplay);
    expect(stations.filter((q) => setQuestionsFor(q).length > 0).length).toBeGreaterThanOrEqual(stations.length - 8);
  });

  it("asks the next set question word for word once the answer and one follow-up are done", async () => {
    const chat = vi.fn().mockResolvedValue(prose("Thank you for practising."))
      .mockResolvedValueOnce(prose("What would you do if two patients had equal need?"))
      .mockResolvedValueOnce(prose("Thank you, you weighed need against likely benefit."))
      .mockResolvedValueOnce(next("Thanks for that."))
      .mockResolvedValueOnce(next("Thank you."));
    const d = deps(chat);
    const opening = await openStation(withPreview(), d);
    const followUp = await answer(opening.state, "I would admit the patients most likely to benefit.", d, 240);
    expect(followUp.say).toBe("What would you do if two patients had equal need?");

    const firstSet = await answer(followUp.state, "I would look at who would benefit most from the bed.", d, 190);
    expect(sentSystem(chat)).toContain("This answer thread is finished");
    expect(firstSet.say).toBe(`Thank you, you weighed need against likely benefit. I'd like to take this in a slightly different direction. ${first.probe}`);
    expect(firstSet.state.setQuestions).toEqual({ asked: 1, threadStart: 2 });
    expect(firstSet.state.evidence).toHaveLength(0);

    // Moving on early in a set-question thread brings the next set question, not the end of the station.
    const secondSet = await answer(firstSet.state, "Age alone shouldn't decide it.", d, 120);
    expect(secondSet.say).toBe(`Thanks for that. Here's a related question. ${second.probe}`);
    expect(secondSet.state.current?.id).toBe(ethics.id);
    expect(secondSet.state.evidence).toHaveLength(0);
    expect(chat).toHaveBeenCalledTimes(3);

    // With every set question asked, moving on closes the station as before.
    const closed = await answer(secondSet.state, "It is fair if the process is consistent and open.", d, 60);
    expect(closed.state.evidence).toHaveLength(1);
    expect(closed.state.current).toBeNull();
    expect(closed.done).toBe(true);
  });

  it("drops an acknowledgement that asks a question of its own", async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(prose("Why that approach?"))
      .mockResolvedValueOnce(prose("Interesting. Why do you think that matters?"));
    const d = deps(chat);
    const opening = await openStation(withPreview(), d);
    const one = await answer(opening.state, "Clinical need first.", d);
    const two = await answer(one.state, "Because the bed should save the most life.", d);
    expect(two.say).toBe(`I'd like to take this in a slightly different direction. ${first.probe}`);
  });

  it("repeats the set question, not the whole brief, when asked to repeat", async () => {
    const chat = vi.fn().mockResolvedValueOnce(prose("Why?")).mockResolvedValueOnce(prose("Thank you."));
    const d = deps(chat);
    const opening = await openStation(withPreview(), d);
    const asked = await answer((await answer(opening.state, "Need.", d)).state, "Benefit.", d);
    const repeated = await answer(asked.state, "Can you repeat the question?", d);
    expect(repeated.say).toBe(`Let me repeat the question. ${first.probe}`);
    expect(repeated.state.currentStudentTurns).toHaveLength(2);
  });

  it("closes the station as before when there isn't time for another set question", async () => {
    const chat = vi.fn().mockResolvedValue(prose("Thank you for practising.")).mockResolvedValueOnce(prose("Why?")).mockResolvedValueOnce(next("Thank you."));
    const d = deps(chat);
    const opening = await openStation(withPreview(), d);
    const one = await answer(opening.state, "Need.", d, 120);
    const two = await answer(one.state, "Benefit.", d, 30);
    expect(sentSystem(chat)).not.toContain("This answer thread is finished");
    expect(two.state.evidence).toHaveLength(1);
    expect(two.say).not.toContain(first.probe);
  });

  it("tells Clara the time left and to keep exploring once the set questions are used", async () => {
    const chat = vi.fn().mockResolvedValue(prose("What would change your mind?"));
    const d = deps(chat);
    const state: AgentState = { ...withPreview(), current: ethics, askedIds: [ethics.id], currentStudentTurns: ["a", "b", "c", "d"], setQuestions: { asked: 2, threadStart: 4 } };
    await answer(state, "Consistency matters most.", d, 150);
    expect(sentSystem(chat)).toContain("About 3 minutes of this station remain. Unless the candidate has clearly finished, keep exploring");
  });

  it("lists set questions privately in the prompt and keeps them out of Clara's own probes", () => {
    const on = buildSystemPrompt(pack, { ...withPreview(), current: ethics, setQuestions: { asked: 1, threadStart: 2 } });
    expect(on).toContain("SET QUESTIONS");
    expect(on).toContain(`Already asked: "${first.probe}"`);
    expect(on).toContain(`Still to come: "${second.probe}"`);
    expect(on).not.toContain("Use these follow-up probes");
    const off = buildSystemPrompt(pack, { ...withPreview({ preview: [] }), current: ethics });
    expect(off).toContain("Use these follow-up probes");
    expect(off).not.toContain("SET QUESTIONS");
  });

  it("changes nothing when the preview is off", async () => {
    const chat = vi.fn().mockResolvedValue(prose("Thank you for practising.")).mockResolvedValueOnce(prose("Why?")).mockResolvedValueOnce(next("Thank you."));
    const d = deps(chat);
    const opening = await openStation(withPreview({ preview: [] }), d);
    const one = await answer(opening.state, "Need.", d, 200);
    const two = await answer(one.state, "Benefit.", d, 150);
    expect(two.state.evidence).toHaveLength(1);
    expect(two.state.setQuestions).toBeUndefined();
    expect(sentSystem(chat)).not.toContain("minutes of this station remain");
  });

  it("leaves roleplays to the actor", async () => {
    const full = packForFullMmiMock();
    const chat = vi.fn().mockResolvedValue(prose("I just want to know what happened."));
    const d = deps(chat, [roleplay], full);
    const opening = await openStation({ ...initAgentState({ subject: "medicine", mode: "mock", pack: full, seed: 0 }), preview: ["station-sub-questions"] }, d);
    const one = await answer(opening.state, "I'm sorry to hear that.", d, 200);
    const two = await answer(one.state, "Can you tell me more?", d, 150);
    expect(two.say).toBe("I just want to know what happened.");
    expect(sentSystem(chat)).not.toContain("SET QUESTIONS");
  });
});

describe("Choosing how station briefs are given", () => {
  const base = (briefDelivery: AgentState["briefDelivery"]) => ({ ...initAgentState({ subject: "medicine", mode: "mock", pack, seed: 0 }), briefDelivery });

  it("reads the brief aloud with no reading time", async () => {
    const chat = vi.fn();
    const d = deps(chat);
    const welcome = await advanceAgent(base("aloud"), { action: "start" }, d);
    expect(welcome.say).toContain("I'll read the scenario aloud, and you can answer as soon as I've finished.");
    expect(welcome.say).not.toContain("one minute");
    const opening = await advanceAgent(welcome.state, { action: "answer", studentText: "Ready." }, d);
    expect(opening.say).toContain(ethics.question);
    expect(opening.say).not.toContain("to read");
    expect(stationTimingFor(opening.state, { prep: 60, response: 300 })).toEqual({ prep: 0, response: 300 });
    expect(chat).not.toHaveBeenCalled();
  });

  it("lets the candidate read first, then invites the answer when reading ends", async () => {
    const chat = vi.fn();
    const d = deps(chat);
    const opening = await openStation(base("read"), d);
    expect(opening.say).toContain("Please read the brief on screen. You have one minute, and I'll ask you to begin when the reading time is up.");
    expect(opening.say).not.toContain(ethics.question);
    expect(opening.state.briefPending).toBe(true);
    expect(stationTimingFor(opening.state, { prep: 60, response: 300 })).toEqual({ prep: 60, response: 300 });
    const begun = await advanceAgent(opening.state, { action: "begin_station", expectedQuestionIndex: 0 }, d);
    expect(begun.say).toBe("Over to you. Talk me through your thinking.");
    expect(begun.state.briefPending).toBe(false);
    const again = await advanceAgent(begun.state, { action: "begin_station", expectedQuestionIndex: 0 }, d);
    expect(again.say).toBe("");
    expect(chat).not.toHaveBeenCalled();
  });

  it("treats speaking during reading time as starting the station", async () => {
    const chat = vi.fn().mockResolvedValue(prose("What would you weigh first?"));
    const d = deps(chat);
    const opening = await openStation(base("read"), d);
    const early = await answer(opening.state, "I'd start with clinical need.", d);
    expect(early.state.briefPending).toBe(false);
    expect(early.say).toBe("What would you weigh first?");
    expect((await advanceAgent(early.state, { action: "begin_station", expectedQuestionIndex: 0 }, d)).say).toBe("");
  });

  it("starts a roleplay with the actor after reading, without the roleplay preview", async () => {
    const full = packForFullMmiMock();
    const d = deps(vi.fn(), [roleplay], full);
    const opening = await openStation({ ...initAgentState({ subject: "medicine", mode: "mock", pack: full, seed: 0 }), briefDelivery: "read" }, d);
    expect(opening.state.roleplayPending).toBe(true);
    expect(opening.state.briefPending).toBeFalsy();
    expect(opening.say).not.toContain(roleplay.roleplay!.openingStatement);
  });

  it("keeps the format's own start when no choice was made", async () => {
    const opening = await openStation(base(undefined), deps(vi.fn()));
    expect(opening.say).toContain("You have one minute to read it");
    expect(opening.say).toContain(ethics.question);
    expect(opening.state.briefPending).toBeFalsy();
  });
});
