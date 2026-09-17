import { describe, expect, it } from "vitest";
import drafts from "@/data/interview-staging/medicine-expansion.json";
import {
  MEDICINE_PILOTS,
  initialiseMedicinePilot,
  packForMedicinePilot,
  sessionBudgetMinutes,
  type PilotQuestion,
} from "../pilots";
import { runMedicineDiagnostics, rehearseTurn } from "../rehearsal";
import {
  advanceAgent,
  buildSystemPrompt,
  type ChatResult,
} from "../../../engine/agent";
import {
  getAllInterviewTypes,
  INTERVIEW_TYPES,
  INTERVIEW_TYPES_CONFIG,
} from "@/config/interviewTypes";
const bank = drafts as PilotQuestion[];
describe("Medicine pilot engines", () => {
  it.each(MEDICINE_PILOTS)(
    "$school builds the required coverage over 100 seeds",
    (pilot) => {
      for (let seed = 0; seed < 100; seed++) {
        const result = initialiseMedicinePilot(pilot, bank, { seed });
        expect(result.ok).toBe(true);
        if (result.ok === false) continue;
        const ids = result.state.questionPlan!.questionIds;
        expect(new Set(ids).size).toBe(pilot.circuit.slots.length);
        ids.forEach((id, i) =>
          expect(pilot.circuit.slots[i].topics).toContain(
            bank.find((q) => q.id === id)!.topic,
          ),
        );
        expect(result.state.questionPlan?.contentStatus).toBe("draft");
      }
    },
  );
  it("runs twelve full engine diagnostics successfully", async () => {
    const report = await runMedicineDiagnostics(bank);
    expect(report).toHaveLength(12);
    expect(report.filter((r) => !r.passed)).toEqual([]);
  });
  it("does not put draft pilots in the student picker", () => {
    const publicIds = getAllInterviewTypes().map((t) => t.id);
    for (const p of MEDICINE_PILOTS) {
      expect(publicIds).not.toContain(p.interviewTypeId);
      expect(INTERVIEW_TYPES[p.interviewTypeId].adminOnly).toBe(true);
    }
  });
  it("keeps academic guidance and rubric distinct from MMI", () => {
    const ox = packForMedicinePilot(MEDICINE_PILOTS[0]),
      cam = packForMedicinePilot(MEDICINE_PILOTS[1]),
      imp = packForMedicinePilot(MEDICINE_PILOTS[2]);
    expect(ox.speakingNotes).toContain("scientific mechanism");
    expect(cam.speakingNotes).toContain("experiment");
    expect(imp.scoringPhilosophy).toContain("not Imperial's official");
    expect(ox.domains).not.toEqual(imp.domains);
    expect(
      INTERVIEW_TYPES_CONFIG["medicine-oxford-pilot"].sections.map(
        (s) => s.title,
      ),
    ).toEqual(ox.domains);
  });
  it("budgets the whole circuit instead of ending all modes at 25 minutes", () => {
    expect(INTERVIEW_TYPES["medicine-mmi"].duration * 60).toBeGreaterThan(
      8 * (120 + 360),
    );
    expect(
      INTERVIEW_TYPES["medicine-mmi-manchester"].duration * 60,
    ).toBeGreaterThan(5 * 480);
    expect(sessionBudgetMinutes(4, { prep: 0, response: 480 })).toBe(36);
  });
  it.each(MEDICINE_PILOTS.slice(0, 2))("$school gets academic discussion guidance without school or MMI instructions", async pilot => {
    const planned = initialiseMedicinePilot(pilot, bank, {seed:2});
    if (!planned.ok) throw new Error('fixture');
    const pack = packForMedicinePilot(pilot);
    const prompt = buildSystemPrompt(pack, planned.state);
    expect(prompt).toContain('competing explanation');
    expect(prompt).toContain('quantities, units');
    expect(prompt).not.toContain('seven times eight');
    expect(prompt).not.toContain('10–11 year old');
    expect(prompt).not.toContain('real school interviewer');
    let control = '';
    await advanceAgent(planned.state, {action:'time_up'}, {bank,pack,chat:async ({messages}) => {
      control = messages.map(m=>m.content||'').join('\n');
      return {content:'We will move on to the next exercise.',toolCalls:[],raw:[]};
    }});
    expect(control).not.toContain('REAL MMI');
  });
  it("reports shortages rather than substituting unrelated or repeated exercises", () => {
    const result = initialiseMedicinePilot(MEDICINE_PILOTS[0], bank, {
      seed: 1,
      seenIds: bank
        .filter((q) => q.topic === "scientific-reasoning")
        .map((q) => q.id),
    });
    expect(result.ok).toBe(false);
  });
  it('keeps academic follow-ups to one ask while preserving a repeated authored exercise', async () => {
    const pilot=MEDICINE_PILOTS[0], pack=packForMedicinePilot(pilot);
    const planned=initialiseMedicinePilot(pilot,bank,{seed:3});
    if(!planned.ok)throw new Error('fixture');
    planned.state.current=bank.find(q=>q.id===planned.state.questionPlan!.questionIds[0])!;
    const deps={bank,pack,chat:async()=>({content:'What mechanism could explain it? Which process might cause it?',toolCalls:[],raw:[]})};
    const answer=await advanceAgent(planned.state,{action:'answer',studentText:'I would investigate the mechanism.'},deps);
    expect(answer.say).toBe('What mechanism could explain it?');
    const repeated=await advanceAgent(planned.state,{action:'repeat'},deps);
    expect(repeated.say).toContain('Which process');
  });
  it("closes safely if a planned prompt disappears after assembly", async () => {
    const p = MEDICINE_PILOTS[0],
      r = initialiseMedicinePilot(p, bank, { seed: 1 });
    if (r.ok === false) throw new Error("fixture");
    const result = await rehearseTurn(
      r.state,
      { action: "answer", studentText: "ready" },
      p,
      bank.filter((q) => q.id !== r.state.questionPlan!.questionIds[0]),
    );
    expect(result.done).toBe(true);
    expect(result.state.askedIds).toEqual([]);
  });
  it("retains draft actor state, conditional disclosures and private rubric", () => {
    const actors = bank.filter((q) => q.roleplay);
    expect(actors).toHaveLength(4);
    for (const q of actors) {
      expect(q.status).toBe("draft");
      expect(q.roleplay!.hiddenFacts.length).toBeGreaterThan(0);
      expect(q.roleplay!.endings).toHaveLength(2);
    }
    const p = MEDICINE_PILOTS[2],
      r = initialiseMedicinePilot(p, bank, { seed: 1 });
    if (r.ok === false) throw new Error("fixture");
    r.state.current = actors[0];
    const prompt = buildSystemPrompt(r.pack, r.state);
    expect(prompt).toContain("only if:");
    expect(prompt).toContain("PRIVATE assessment rubric");
  });
  it("will not score a newly fetched question before the candidate answers it", async () => {
    const pilot = MEDICINE_PILOTS[0],
      r = initialiseMedicinePilot(pilot, bank, { seed: 3 });
    if (r.ok === false) throw new Error("fixture");
    let calls = 0;
    const result = await advanceAgent(
      r.state,
      { action: "answer", studentText: "ready" },
      {
        bank,
        pack: r.pack,
        chat: async () => {
          const name = calls++ === 0 ? "next_problem" : "finish_interview";
          if (calls > 2)
            return {
              content: "Please consider this question.",
              toolCalls: [],
              raw: [],
            };
          return {
            content: "",
            toolCalls: [{ id: "x", name, args: { outcome: "correct_method" } }],
            raw: [],
          } as ChatResult;
        },
      },
    );
    expect(result.state.current).not.toBeNull();
    expect(result.state.evidence).toHaveLength(0);
    expect(result.done).toBe(false);
  });
});
