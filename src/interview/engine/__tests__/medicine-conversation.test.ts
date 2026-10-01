import { describe, expect, it, vi } from "vitest";
import {
  advanceAgent,
  buildSystemPrompt,
  initAgentState,
  type AgentState,
  type ChatResult,
} from "../agent";
import { publicQuestionPrompt, asksToClarifyTask } from "../publicPrompt";
import { medicinePack } from "../../subjects/medicine/pack";
import { makeEvidence } from "../evidence";
import { getBank } from "../../bank";
import type { BankQuestion } from "../types";

const bank = getBank("medicine");
const pool = bank.find((q) => q.id === "MED-RP-018")!;
const ethics = bank.find((q) => q.id === "MED-E2")!;
const motivation = bank.find((q) => q.id === "MED-M4")!;
const prose = (content: string): ChatResult => ({
  content,
  toolCalls: [],
  raw: [],
});
const next = (content = "", name = "next_problem"): ChatResult => ({
  content,
  toolCalls: [
    {
      id: "next",
      name,
      args: {
        outcome: "correct_method",
        method_quality: "sound",
        note: "Candidate described their reasoning.",
      },
    },
  ],
  raw: [],
});
const init = () =>
  initAgentState({
    subject: "medicine",
    mode: "mock",
    pack: medicinePack,
    seed: 0,
  });
const current = (q: BankQuestion): AgentState => ({
  ...init(),
  current: q,
  askedIds: [q.id],
  currentStudentTurns: ["A previous substantive answer."],
});

describe("Medicine conversation boundaries", () => {
  it("starts a full mock with an authored medicine question, not a school hobby warm-up", async () => {
    for (let seed = 0; seed < 20; seed++) {
      const chat = vi.fn(async () =>
        prose("What do you enjoy outside school?"),
      );
      const r = await advanceAgent(
        { ...init(), seed },
        { action: "start" },
        { bank, pack: medicinePack, chat },
      );
      expect(medicinePack.openingQuestionIds).toContain(r.state.current?.id);
      expect(r.say).toContain(r.state.current!.question);
      expect(r.say).toContain("Station 1 of");
      expect(r.say).not.toContain("What do you enjoy outside school?");
      expect(chat).not.toHaveBeenCalled();
    }
  });

  it("reproduces and repairs the screenshot: a hobby reply cannot be followed by a naked actor line", async () => {
    const state = init();
    state.transcript = [
      { role: "assistant", content: "What do you enjoy outside school?" },
    ];
    const r = await advanceAgent(
      state,
      {
        action: "answer",
        studentText:
          "I really enjoy horse riding and find it a good way to relax.",
      },
      {
        bank: [pool],
        pack: medicinePack,
        chat: async () => prose("That sounds nice."),
      },
    );
    expect(r.say).toMatch(/^Thank you\. Let’s begin\./);
    expect(r.say).toContain(pool.roleplay!.applicantRole);
    expect(r.say.indexOf(pool.roleplay!.applicantRole)).toBeLessThan(
      r.say.indexOf(pool.roleplay!.openingStatement),
    );
    expect(r.say).toContain("I will play Steph");
    expect(r.state.currentStudentTurns).toEqual([]);
  });

  it.each(["skip", "time_up", "switch_topic"] as const)(
    "introduces the complete next station after %s, even during a model outage",
    async (action) => {
      const r = await advanceAgent(
        current(motivation),
        { action },
        {
          bank: [motivation, pool],
          pack: medicinePack,
          chat: async () => {
            throw new Error("offline");
          },
        },
      );
      expect(r.say).toContain("That station is complete. Station 2");
      expect(r.say).toContain(pool.roleplay!.applicantRole);
      expect(r.say).toContain(pool.roleplay!.openingStatement);
    },
  );

  it("preserves a relevant acknowledgement before explicitly moving to a new station", async () => {
    const chat = vi.fn(async () =>
      next("Thank you for explaining what volunteering taught you."),
    );
    const r = await advanceAgent(
      current(motivation),
      {
        action: "answer",
        studentText:
          "It taught me that listening matters as much as explaining.",
      },
      { bank: [motivation, pool], pack: medicinePack, chat },
    );
    expect(r.say).toMatch(
      /^Thank you for explaining what volunteering taught you\. That station is complete\./,
    );
    expect(r.say).toContain(pool.roleplay!.applicantRole);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("requires a relevant follow-up instead of discarding the first answer and jumping tasks", async () => {
    const state = { ...current(motivation), currentStudentTurns: [] };
    let calls = 0;
    const r = await advanceAgent(
      state,
      {
        action: "answer",
        studentText: "Volunteering taught me how much listening matters.",
      },
      {
        bank: [motivation, pool],
        pack: medicinePack,
        chat: async ({ messages }) => {
          if (calls++ === 0) return next();
          expect(messages.at(-1)?.content).toContain("only their first answer");
          return prose(
            "What changed in your approach when you started listening more carefully?",
          );
        },
      },
    );
    expect(r.state.current?.id).toBe(motivation.id);
    expect(r.state.evidence).toEqual([]);
    expect(r.say).toContain("listening more carefully");
  });

  it("drops an actor’s angry line when returning to an examiner-led station", async () => {
    const r = await advanceAgent(
      current(pool),
      {
        action: "answer",
        studentText:
          "I will find the organiser and check what support is available now.",
      },
      {
        bank: [pool, ethics],
        pack: medicinePack,
        chat: async () => next("That is not good enough!"),
      },
    );
    expect(r.say).toContain("That station is complete.");
    expect(r.say).toContain(ethics.question);
    expect(r.say).not.toContain("That is not good enough");
  });

  it.each(["failure", "empty"] as const)(
    "retries an unanswered turn after a model %s instead of pretending to listen",
    async (failure) => {
      const state = current(pool),
        before = structuredClone(state);
      await expect(
        advanceAgent(
          state,
          {
            action: "answer",
            studentText: "I can find the organiser. What help do you need now?",
          },
          {
            bank,
            pack: medicinePack,
            chat: async () => {
              if (failure === "failure") throw new Error("rate limited");
              return prose("");
            },
          },
        ),
      ).rejects.toThrow("Please retry the same turn");
      expect(state).toEqual(before);
    },
  );

  it.each([
    "Sorry, what's the question?",
    "Who am I?",
    "Could you repeat the scenario please?",
    "What am I supposed to do?",
    "Could you repeat that?",
  ])(
    'repairs "%s" without scoring it, resetting the actor or consuming an answer turn',
    async (text) => {
      const state = current(pool),
        chat = vi.fn(async () => prose("You should know!"));
      const r = await advanceAgent(
        state,
        { action: "answer", studentText: text },
        { bank, pack: medicinePack, chat },
      );
      expect(r.say).toContain(pool.roleplay!.applicantRole);
      expect(r.say).not.toContain(pool.roleplay!.openingStatement);
      expect(r.state.currentStudentTurns).toEqual(state.currentStudentTurns);
      expect(r.state.questionIndex).toBe(state.questionIndex);
      expect(r.state.evidence).toEqual([]);
      expect(chat).not.toHaveBeenCalled();
    },
  );

  it("does not mistake substantive answers or a question to the actor for setup clarification", () => {
    for (const text of [
      "Could you explain what happened when you called the pool?",
      "My role is to listen and find practical help.",
      "I would clarify the question with the patient.",
      "What is the question I should ask the organiser?",
    ])
      expect(asksToClarifyTask(text)).toBe(false);
  });

  it("honours an explicit spoken stop without forcing another follow-up", async () => {
    const r = await advanceAgent(
      { ...current(pool), currentStudentTurns: [] },
      { action: "answer", studentText: "Please end the interview." },
      {
        bank,
        pack: medicinePack,
        chat: async () => prose("Thank you for practising."),
      },
    );
    expect(r.done).toBe(true);
    expect(r.state.evidence[0].completionReason).toBe("ended");
  });

  it("gives every published roleplay its public context without revealing private actor information", async () => {
    for (const q of bank.filter((q) => q.roleplay)) {
      const r = await advanceAgent(
        init(),
        { action: "start" },
        { bank: [q], pack: medicinePack, chat: async () => prose("unused") },
      );
      expect(r.say).toContain(q.roleplay!.applicantRole);
      expect(r.say).toContain(q.roleplay!.name);
      expect(publicQuestionPrompt(q)).toContain(q.roleplay!.role);
      expect(r.say).not.toContain(q.modelReasoningPath);
      for (const secret of q.roleplay!.hiddenFacts)
        if (secret.fact.length > 25) expect(r.say).not.toContain(secret.fact);
    }
  });

  it("keeps the full public scenario in assessment evidence, not just the actor’s accusation", () => {
    const evidence = makeEvidence(1, pool, "I would listen.", 0, {
      outcome: "incomplete",
      methodQuality: "unknown",
      notes: "",
    });
    expect(evidence.question).toContain(pool.roleplay!.applicantRole);
    expect(evidence.question).toContain(pool.roleplay!.openingStatement);
  });

  it("uses professional MMI instructions without school tutoring or blanket 25-word limits", () => {
    const prompt = buildSystemPrompt(medicinePack, current(pool));
    expect(prompt).not.toContain("25 words");
    expect(prompt).not.toContain("seven times eight");
    expect(prompt).not.toContain("school interviewer");
    expect(prompt).toContain("candidate’s last answer");
    expect(prompt.toLowerCase()).toContain("do not narrate");
  });
});
