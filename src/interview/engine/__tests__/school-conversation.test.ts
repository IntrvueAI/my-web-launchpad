import { describe, expect, it, vi } from "vitest";
import {
  advanceAgent,
  buildSystemPrompt,
  initAgentState,
  SCHOOL_SESSION_FINISHED,
  type AgentState,
  type ChatMessage,
  type ChatResult,
} from "../agent";
import { mathsPack } from "../../subjects/maths/pack";
import { elevenplusPack } from "../../subjects/elevenplus/pack";
import { chatPack } from "../../subjects/chat/pack";
import type { BankQuestion } from "../types";

const prose = (content: string): ChatResult => ({ content, toolCalls: [], raw: [] });
const finish = (content: string): ChatResult => ({
  content,
  toolCalls: [{ id: "f", name: "finish_interview", args: { outcome: "correct_method", method_quality: "sound", note: "Explained clearly." } }],
  raw: [],
});
const MATHS: BankQuestion[] = [
  { id: "m1", subject: "maths", topic: "arithmetic", difficulty: 2, question: "What is 7 times 8?", answer: "56" },
  { id: "m2", subject: "maths", topic: "word-problems", difficulty: 2, question: "A bus has 5 free seats. 3 people get on. How many are left?", answer: "2" },
];
const ELEVENPLUS: BankQuestion[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `ep${i}`, subject: "elevenplus", topic: `t${i}`, difficulty: 2 as const, question: `About you ${i}?`, answer: "n/a" })),
  { id: "m3", subject: "maths", topic: "arithmetic", difficulty: 3, question: "maths 3?", answer: "x" },
  { id: "l3", subject: "logic", topic: "deduction", difficulty: 3, question: "logic 3?", answer: "x" },
  { id: "c2", subject: "currentaffairs", topic: "ethics", difficulty: 2, question: "ca?", answer: "x" },
];
const maths = (extra: Partial<AgentState> = {}): AgentState => ({ ...initAgentState({ subject: "maths", mode: "mock", pack: mathsPack, seed: 1 }), ...extra });

describe("11+ opening", () => {
  it("greets the child by name, explains the interview and waits for a reply", async () => {
    const chat = vi.fn(async () => prose("unused"));
    const r = await advanceAgent(
      initAgentState({ subject: "elevenplus", mode: "mock", pack: elevenplusPack, seed: 7, studentName: "Amelia" }),
      { action: "start" },
      { bank: ELEVENPLUS, pack: elevenplusPack, chat },
    );
    expect(r.say).toMatch(/^Hi Amelia, I'm Clara, your practice interviewer\./);
    expect(r.say).toContain("first some questions about you, then a few puzzles");
    expect(r.say).toContain("Let me know when you're ready to start.");
    expect(r.state.current).toBeNull();
    expect(r.state.welcomed).toBe(true);
    expect(chat).not.toHaveBeenCalled();
  });

  it("names the subject for topic mocks and works without a name", async () => {
    const r = await advanceAgent(maths(), { action: "start" }, { bank: MATHS, pack: mathsPack, chat: async () => prose("unused") });
    expect(r.say).toMatch(/^Hi, I'm Clara/);
    expect(r.say).toContain("a practice maths interview");
  });

  it("turns the child's reply into the warm-up turn without re-greeting or skipping to a puzzle", async () => {
    let seen: ChatMessage[] = [];
    const chat = vi.fn(async ({ messages }: { messages: ChatMessage[] }) => {
      seen = messages;
      return prose("Lovely to meet you, Tom. To start, tell me a little about yourself.");
    });
    const welcome = await advanceAgent(maths(), { action: "start" }, { bank: MATHS, pack: mathsPack, chat });
    const r = await advanceAgent(welcome.state, { action: "answer", studentText: "Yes I'm ready, my name is Tom" }, { bank: MATHS, pack: mathsPack, chat });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(r.say).toBe("Lovely to meet you, Tom. To start, tell me a little about yourself.");
    expect(r.state.current).toBeNull();
    expect(seen[0].content).toContain("You have ALREADY greeted the student");
    expect(seen.at(-1)?.content).toContain("do not greet me again");
    expect(seen.some((m) => m.content === "Yes I'm ready, my name is Tom")).toBe(true);
  });
});

describe("11+ repeat requests", () => {
  it.each(["Can you repeat the question?", "Sorry, could you say that again?", "Can you repeat that please?"])(
    'repeats Clara\'s last line for "%s" without a model call or counting it as an answer',
    async (text) => {
      const state = maths({
        welcomed: true,
        current: MATHS[0],
        askedIds: ["m1"],
        currentStudentTurns: ["Is it fifty-something?"],
        transcript: [{ role: "assistant", content: "Nearly. What is 7 times 8 exactly?" }],
      });
      const chat = vi.fn(async () => prose("unused"));
      const r = await advanceAgent(state, { action: "answer", studentText: text }, { bank: MATHS, pack: mathsPack, chat });
      expect(r.say).toBe("Nearly. What is 7 times 8 exactly?");
      expect(r.state.currentStudentTurns).toEqual(["Is it fifty-something?"]);
      expect(r.state.evidence).toEqual([]);
      expect(chat).not.toHaveBeenCalled();
    },
  );
});

describe("11+ endings", () => {
  it("closes with a fixed message instead of the model's praise or offers", async () => {
    const state = maths({ welcomed: true, current: MATHS[0], askedIds: ["m1"], targetQuestions: 1, studentName: "Amelia" });
    const r = await advanceAgent(
      state,
      { action: "answer", studentText: "It's 56 because 7 eights are 56." },
      { bank: MATHS, pack: mathsPack, chat: async () => finish("You did really well! Want to try another quiz after?") },
    );
    expect(r.done).toBe(true);
    expect(r.say).toBe("That's the end of our interview. Thank you, Amelia, it was lovely talking with you. Press End interview to see your feedback. You can choose another practice afterwards.");
  });

  it("answers after a natural finish but stays silent after the child pressed End", async () => {
    const chat = vi.fn(async () => prose("unused"));
    const finished = maths({ welcomed: true, done: true });
    const asked = await advanceAgent(finished, { action: "answer", studentText: "Can we do another one?" }, { bank: MATHS, pack: mathsPack, chat });
    expect(asked.say).toBe(SCHOOL_SESSION_FINISHED);
    const ended = await advanceAgent({ ...finished, endRequested: true }, { action: "answer", studentText: "bye" }, { bank: MATHS, pack: mathsPack, chat });
    expect(ended.say).toBe("");
    expect(chat).not.toHaveBeenCalled();
  });
});

describe("11+ interviewer instructions", () => {
  it("asks for neutral follow-ups and never promises what the session cannot do", () => {
    const prompt = buildSystemPrompt(mathsPack, maths({ welcomed: true }));
    expect(prompt).toContain("Never build a question on a negative assumption");
    expect(prompt).toContain("NEVER OFFER something this session cannot provide");
    expect(prompt).not.toMatch(/chat about that after|come back to that after/);
    expect(prompt).not.toContain("you did really well");
  });
});

describe("Chat with Clara demo", () => {
  it("keeps its model-led opening and closing", async () => {
    const chat = vi.fn(async () => prose("Hey! I'm Clara. What have you been up to today?"));
    const state = initAgentState({ subject: "chat", mode: "mock", pack: chatPack, seed: 1 });
    const r = await advanceAgent(state, { action: "start" }, { bank: [{ id: "c1", subject: "chat", topic: "about-you", difficulty: 2, question: "Tell me about yourself?", answer: "n/a" }], pack: chatPack, chat });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(r.say).toContain("What have you been up to today?");
    expect(r.state.welcomed).toBeFalsy();
  });
});
