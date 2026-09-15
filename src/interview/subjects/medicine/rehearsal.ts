import {
  advanceAgent,
  type AgentRequest,
  type AgentState,
  type ChatComplete,
  type ChatResult,
} from "../../engine/agent";
import {
  initialiseMedicinePilot,
  packForMedicinePilot,
  MEDICINE_PILOTS,
  type MedicinePilot,
  type PilotQuestion,
} from "./pilots";

const spoken = (content: string): ChatResult => ({
  content,
  toolCalls: [],
  raw: [],
});
const nextTool = (hasQuestion: boolean): ChatResult => {
  const args = hasQuestion
    ? {
        outcome: "incomplete",
        method_quality: "unknown",
        note: "Scripted rehearsal only; no AI assessment was performed.",
      }
    : {};
  return {
    content: "",
    toolCalls: [{ id: "rehearsal-next", name: "next_problem", args }],
    raw: [
      {
        id: "rehearsal-next",
        type: "function",
        function: { name: "next_problem", arguments: JSON.stringify(args) },
      },
    ],
  };
};
/** Deterministic local adapter for inspecting the real engine. No model or scoring claims. */
export async function rehearseTurn(
  state: AgentState,
  request: AgentRequest,
  pilot: MedicinePilot,
  bank: PilotQuestion[],
) {
  const chat: ChatComplete = async ({ messages }) => {
    const last = messages[messages.length - 1];
    if (last?.role === "tool") {
      const result = JSON.parse(last.content ?? "{}");
      if (result.question) return spoken(result.question);
      return spoken(
        "This rehearsal is complete. Export the transcript for human review.",
      );
    }
    if (request.action === "start")
      return spoken(packForMedicinePilot(pilot).openers[0]);
    if (request.action === "repeat")
      return spoken(
        state.current?.question ??
          "Please answer the opening question when you are ready.",
      );
    if (request.action !== "answer") return spoken(""); // Exercise deterministic control handling.
    if (!state.current) return nextTool(false);
    const probe = state.current.liveProbes?.[state.currentStudentTurns.length];
    return probe ? spoken(probe.probe) : nextTool(true);
  };
  return advanceAgent(state, request, {
    bank,
    pack: packForMedicinePilot(pilot),
    chat,
  });
}

export interface EngineDiagnostic {
  name: string;
  passed: boolean;
  detail: string;
}
export async function runMedicineDiagnostics(
  bank: PilotQuestion[],
): Promise<EngineDiagnostic[]> {
  const report: EngineDiagnostic[] = [];
  for (const pilot of MEDICINE_PILOTS) {
    const planned = initialiseMedicinePilot(pilot, bank, {
      seed: 42,
      createdAt: "2026-09-16T00:00:00Z",
    });
    if (planned.ok === false) {
      report.push({
        name: `${pilot.school}: circuit coverage`,
        passed: false,
        detail: planned.shortages.join(", "),
      });
      continue;
    }
    const ids = planned.state.questionPlan!.questionIds;
    report.push({
      name: `${pilot.school}: balanced plan`,
      passed: new Set(ids).size === ids.length,
      detail: `${ids.length} distinct draft exercises in the required topic slots.`,
    });
    let state = (
      await rehearseTurn(
        planned.state,
        { action: "answer", studentText: "Ready to practise." },
        pilot,
        bank,
      )
    ).state;
    for (let i = 0; i < ids.length; i++) {
      state = (
        await rehearseTurn(
          state,
          {
            action: "time_up",
            studentText: `Diagnostic answer ${i + 1}`,
            expectedQuestionIndex: i,
          },
          pilot,
          bank,
        )
      ).state;
    }
    report.push({
      name: `${pilot.school}: full circuit and evidence`,
      passed:
        state.done &&
        state.evidence.length === ids.length &&
        state.evidence.every(
          (e, i) =>
            e.id === ids[i] &&
            e.studentAnswer.includes(`Diagnostic answer ${i + 1}`),
        ),
      detail: `${state.evidence.length}/${ids.length} answers retained; circuit ${state.done ? "closed" : "still open"}. Scripted controls, no grades.`,
    });
    const stale = await rehearseTurn(
      planned.state,
      { action: "time_up", expectedQuestionIndex: 99 },
      pilot,
      bank,
    );
    report.push({
      name: `${pilot.school}: stale timeout protection`,
      passed: JSON.stringify(stale.state) === JSON.stringify(planned.state),
      detail: "A late timer event cannot advance a different station.",
    });
    const fresh = initialiseMedicinePilot(pilot, bank, {
      seed: 43,
      seenIds: ids,
    });
    report.push({
      name: `${pilot.school}: repeat avoidance`,
      passed:
        fresh.ok === false ||
        fresh.state.questionPlan!.questionIds.every((id) => !ids.includes(id)),
      detail: fresh.ok
        ? "The second circuit contains no previously seen question."
        : "The pool reports a coverage shortage instead of repeating questions.",
    });
  }
  return report;
}
