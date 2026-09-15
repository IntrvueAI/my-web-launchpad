import { describe, expect, it, vi } from "vitest";
import {
  advanceAgent,
  initAgentState,
  type AgentDeps,
  type ChatResult,
} from "../agent";
import { StationControlQueue } from "../controlQueue";
import { medicinePack } from "../../subjects/medicine/pack";
import { normalizeQuestionRow } from "../../bank/normalize";
import { selectQuestion } from "../../bank/select";
import type { BankQuestion } from "../types";

const bank: BankQuestion[] = [1, 2, 3].map((n) => ({
  id: `q${n}`,
  subject: "medicine",
  topic: "ethics-scenarios",
  difficulty: 2,
  question: `Situation ${n}: what would you consider?`,
  answer: "Consider the competing interests.",
}));
const prose = async (): Promise<ChatResult> => ({
  content: "Can you explain that further?",
  toolCalls: [],
  raw: [],
});
function fixture(chat = prose) {
  const state = initAgentState({
    subject: "medicine",
    mode: "mock",
    pack: medicinePack,
    seed: 1,
  });
  state.current = bank[0];
  state.askedIds = ["q1"];
  state.currentStudentTurns = ["I would listen to both people."];
  const deps: AgentDeps = { bank, pack: medicinePack, chat };
  return { state, deps };
}
describe("Station controls and evidence", () => {
  it.each(["skip", "time_up", "switch_topic"] as const)(
    "advances on %s when the model ignores the control",
    async (action) => {
      const { state, deps } = fixture();
      const r = await advanceAgent(
        state,
        {
          action,
          studentText: "And ask what matters most.",
          expectedQuestionIndex: 0,
        },
        deps,
      );
      expect(r.state.evidence).toHaveLength(1);
      expect(r.state.evidence[0].studentAnswer).toContain("what matters most");
      expect(r.state.evidence[0].outcome).toBe(
        action === "skip" ? "skipped" : "incomplete",
      );
      expect(r.state.evidence[0].methodQuality).toBe("unknown");
      expect(r.state.current?.id).not.toBe("q1");
      expect(r.say).toContain(r.state.current!.question);
      expect(state.evidence).toHaveLength(0);
    },
  );
  it("honours a bell even if the model service fails", async () => {
    const { state, deps } = fixture(async () => {
      throw new Error("offline");
    });
    const r = await advanceAgent(state, { action: "time_up" }, deps);
    expect(r.state.evidence[0].completionReason).toBe("time_up");
    expect(r.state.questionIndex).toBe(1);
  });
  it("drops a stale bell instead of timing out the next question", async () => {
    const { state, deps } = fixture();
    const chat = vi.fn(prose);
    deps.chat = chat;
    const r = await advanceAgent(
      state,
      { action: "time_up", expectedQuestionIndex: 7 },
      deps,
    );
    expect(r.state).toEqual(state);
    expect(r.say).toBe("");
    expect(chat).not.toHaveBeenCalled();
  });
  it("records the last answer on stop without manufacturing a score", async () => {
    const { state, deps } = fixture();
    const r = await advanceAgent(state, { action: "end" }, deps);
    expect(r.done).toBe(true);
    expect(r.state.current).toBeNull();
    expect(r.state.evidence[0].outcome).toBe("incomplete");
    expect(r.state.evidence[0].band).toBeUndefined();
    const again = await advanceAgent(
      r.state,
      { action: "answer", studentText: "late speech" },
      deps,
    );
    expect(again.state).toEqual(r.state);
    expect(again.say).toBe("");
  });
  it("bounds repeated follow-ups without treating the limit as poor performance", async () => {
    const { state, deps } = fixture();
    state.currentStudentTurns = ["first", "second", "third"];
    const r = await advanceAgent(
      state,
      { action: "answer", studentText: "fourth" },
      deps,
    );
    expect(r.state.evidence[0].completionReason).toBe("turn_limit");
    expect(r.state.evidence[0].outcome).toBe("incomplete");
  });
  it("ends an exhausted bank instead of looping indefinitely", async () => {
    const { state, deps } = fixture();
    deps.bank = [bank[0]];
    const r = await advanceAgent(state, { action: "time_up" }, deps);
    expect(r.done).toBe(true);
    expect(r.state.current).toBeNull();
  });
});
describe("Queued controls", () => {
  it("deduplicates repeated clicks and the bell for the same station", () => {
    const q = new StationControlQueue();
    q.enqueue({ action: "skip", stationIndex: 0 });
    q.enqueue({ action: "time_up", stationIndex: 0 });
    expect(q.take(0)?.action).toBe("skip");
    expect(q.take(0)).toBeUndefined();
  });
  it("discards a queued control if the in-flight answer already advanced", () => {
    const q = new StationControlQueue();
    q.enqueue({ action: "time_up", stationIndex: 0 });
    q.enqueue({ action: "skip", stationIndex: 1 });
    expect(q.take(1)?.action).toBe("skip");
    expect(q.take(1)).toBeUndefined();
  });
  it("keeps the latest requested topic and clears between sessions", () => {
    const q = new StationControlQueue();
    q.enqueue({ action: "switch_topic", topic: "old" });
    q.enqueue({ action: "switch_topic", topic: "new" });
    expect(q.take()?.topic).toBe("new");
    q.enqueue({ action: "skip" });
    q.clear();
    expect(q.take()).toBeUndefined();
  });
});
describe("Database metadata and dated content", () => {
  it("retains actor rules and honours database expiry overrides", () => {
    const row = {
      ...bank[0],
      roleplay: {
        name: "Sam",
        hiddenFacts: [{ fact: "Private", disclosureCondition: "Ask" }],
      },
      current_affairs_expiry: "2020-01-01",
      currentAffairsExpiry: "2099-01-01",
      clinical_review_required: true,
      format: "RP",
    };
    const mapped = normalizeQuestionRow(row);
    expect(mapped.roleplay).toEqual(row.roleplay);
    expect(mapped.clinicalReviewRequired).toBe(true);
    expect(
      selectQuestion({
        bank: [mapped],
        mode: "mock",
        difficulty: 2,
        askedIds: [],
        questionIndex: 0,
        seed: 0,
      }),
    ).toBeNull();
  });
  it("withholds malformed expiry dates", () => {
    expect(
      selectQuestion({
        bank: [{ ...bank[0], currentAffairsExpiry: "unknown" }],
        mode: "mock",
        difficulty: 2,
        askedIds: [],
        questionIndex: 0,
        seed: 0,
      }),
    ).toBeNull();
  });
  it("never attaches bundled actor instructions to an edited scenario or overrides explicit null", () => {
    const bundled = {
      ...bank[0],
      roleplay: { name: "Original actor" },
    } as BankQuestion;
    expect(
      normalizeQuestionRow(
        { ...bank[0], question: "A different scenario" },
        bundled,
      ).roleplay,
    ).toBeUndefined();
    expect(
      normalizeQuestionRow({ ...bank[0], roleplay: null }, bundled).roleplay,
    ).toBeNull();
    expect(normalizeQuestionRow({ ...bank[0] }, bundled).roleplay).toEqual(
      bundled.roleplay,
    );
  });
});
