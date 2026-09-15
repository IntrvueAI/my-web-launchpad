import { useEffect, useRef, useState } from "react";
import {
  Play,
  Send,
  Download,
  RotateCcw,
  Check,
  FlaskConical,
} from "lucide-react";
import rawDrafts from "@/data/interview-staging/medicine-expansion.json";
import {
  MEDICINE_PILOTS,
  initialiseMedicinePilot,
  sessionBudgetMinutes,
  type PilotQuestion,
} from "@/interview/subjects/medicine/pilots";
import {
  rehearseTurn,
  runMedicineDiagnostics,
  type EngineDiagnostic,
} from "@/interview/subjects/medicine/rehearsal";
import type { AgentRequest, AgentState } from "@/interview/engine/agent";
import { useStationClock } from "@/hooks/useStationClock";
import "./engine-rehearsal.css";

const bank = rawDrafts as PilotQuestion[];
const HISTORY_KEY = "intrvue:medicine-engine-rehearsal:seen:v1";
function loadHistory(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
function exportRun(state: AgentState, school: string) {
  const content = {
    exportedAt: new Date().toISOString(),
    school,
    kind: "scripted-engine-rehearsal",
    assessed: false,
    state,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${school.toLowerCase()}-engine-rehearsal.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function EngineRehearsal() {
  const [profileId, setProfileId] = useState(
    MEDICINE_PILOTS[0].interviewTypeId,
  );
  const pilot = MEDICINE_PILOTS.find((p) => p.interviewTypeId === profileId)!;
  const [state, setState] = useState<AgentState | null>(null);
  const [answer, setAnswer] = useState("");
  const [seen, setSeen] = useState(loadHistory);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<EngineDiagnostic[]>([]);
  const [checkedAt, setCheckedAt] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const transcriptNode = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (transcriptNode.current)
      transcriptNode.current.scrollTop = transcriptNode.current.scrollHeight;
  }, [state?.transcript.length]);
  const current = useRef(state);
  current.current = state;
  const busyRef = useRef(false);
  const queuedBell = useRef<number | null>(null);
  const runRef = useRef<(req: AgentRequest) => Promise<void>>(async () => {});
  async function run(req: AgentRequest) {
    if (!current.current || current.current.done) return;
    if (busyRef.current) {
      if (req.action === "time_up")
        queuedBell.current =
          req.expectedQuestionIndex ?? current.current.questionIndex;
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await rehearseTurn(current.current, req, pilot, bank);
      current.current = result.state;
      setState(result.state);
      const ids = [...new Set([...seen, ...result.state.askedIds])];
      setSeen(ids);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(ids));
      } catch {
        setError("Browser storage is full. Export your rehearsal to keep it.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rehearsal failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
      const bell = queuedBell.current;
      queuedBell.current = null;
      if (bell !== null)
        void runRef.current({ action: "time_up", expectedQuestionIndex: bell });
    }
  }
  runRef.current = run;
  const clock = useStationClock({
    stationKey:
      timerOn && state?.current && !state.done
        ? `${state.seed}:${state.questionIndex}`
        : null,
    timing: {
      prep: pilot.circuit.prepSeconds,
      response: pilot.circuit.responseSeconds,
    },
    onTimeUp: () => {
      void run({
        action: "time_up",
        expectedQuestionIndex: state?.questionIndex,
        studentText: answer.trim() || undefined,
      });
      setAnswer("");
    },
  });
  async function start() {
    if (busyRef.current) return;
    const planned = initialiseMedicinePilot(pilot, bank, {
      seed: Math.floor(Math.random() * 2 ** 31),
      seenIds: seen,
    });
    if (planned.ok === false) {
      setError(
        `A fresh circuit needs more content: ${planned.shortages.join(", ")}. You can explicitly reset rehearsal history to repeat earlier exercises.`,
      );
      return;
    }
    current.current = planned.state;
    setState(planned.state);
    setAnswer("");
    await run({ action: "start" });
  }
  async function diagnose() {
    setDiagnosing(true);
    setReport([]);
    try {
      setReport(await runMedicineDiagnostics(bank));
      setCheckedAt(new Date().toLocaleString("en-GB"));
    } finally {
      setDiagnosing(false);
    }
  }
  return (
    <section className="lab-section engine-rehearsal" id="engine-rehearsal">
      <div className="lab-section-title">
        <div>
          <div className="lab-eyebrow">
            <FlaskConical size={14} /> ENGINE WORKBENCH
          </div>
          <h2>Put the interview through its paces.</h2>
          <p>
            Run the real sequencing engine with scripted follow-ups. This local
            rehearsal makes no AI assessment and does not simulate an actor’s
            responses.
          </p>
        </div>
        <a href="/admin/medicine-interviews">Open AI pilot launcher ↗</a>
      </div>
      <div
        className="engine-profile-tabs"
        role="group"
        aria-label="Engine profile"
      >
        {MEDICINE_PILOTS.map((p) => (
          <button
            key={p.interviewTypeId}
            aria-pressed={profileId === p.interviewTypeId}
            disabled={busy}
            onClick={() => {
              setProfileId(p.interviewTypeId);
              setState(null);
              current.current = null;
              setAnswer("");
              setError("");
              setTimerOn(false);
            }}
          >
            {p.school}
            <small>
              {p.style === "academic" ? "Academic conversation" : "Timed MMI"}
            </small>
          </button>
        ))}
      </div>
      <div className="engine-work-grid">
        <aside className="engine-profile">
          <span className="lab-draft-badge">ADMIN PILOT · DRAFT CONTENT</span>
          <h3>{pilot.school} practice</h3>
          <p>{pilot.evidence}</p>
          <a href={pilot.sourceUrl} target="_blank" rel="noreferrer">
            University evidence ↗
          </a>
          <ul>
            {pilot.behaviours.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <dl>
            <div>
              <dt>Exercises</dt>
              <dd>{pilot.circuit.slots.length}</dd>
            </div>
            <div>
              <dt>Answer time</dt>
              <dd>{pilot.circuit.responseSeconds / 60} minutes</dd>
            </div>
            <div>
              <dt>Session cap</dt>
              <dd>
                {sessionBudgetMinutes(pilot.circuit.slots.length, {
                  prep: pilot.circuit.prepSeconds,
                  response: pilot.circuit.responseSeconds,
                })}{" "}
                minutes
              </dd>
            </div>
          </dl>
          <p className="engine-timing-note">
            {pilot.circuit.timingBasis} The session cap includes opening,
            closing and transition allowance.
          </p>
          <div className="engine-history">
            {seen.length} exercises seen in this browser
            <button
              disabled={busy}
              onClick={() => {
                setSeen([]);
                localStorage.removeItem(HISTORY_KEY);
                setError(
                  "Rehearsal history reset. Earlier questions may be used again.",
                );
              }}
            >
              <RotateCcw size={13} /> Allow repeats
            </button>
          </div>
        </aside>
        <div className="engine-console">
          <div className="engine-console-top">
            <strong>
              {state?.done
                ? "Rehearsal complete"
                : state?.current
                  ? `Exercise ${state.questionIndex + 1} of ${state.targetQuestions}`
                  : "Ready to rehearse"}
            </strong>
            {clock && (
              <span>
                {clock.phase} · {Math.floor(clock.secondsRemaining / 60)}:
                {String(clock.secondsRemaining % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div
            ref={transcriptNode}
            className="engine-transcript"
            aria-label="Engine rehearsal transcript"
            aria-live="polite"
          >
            {!state ? (
              <div className="engine-empty">
                <FlaskConical size={30} />
                <h3>Try the question, then the follow-up.</h3>
                <p>
                  Your words remain in this browser. Export the run to keep its
                  transcript and evidence.
                </p>
                <button className="lab-primary" onClick={() => void start()}>
                  <Play size={15} /> Start engine rehearsal
                </button>
              </div>
            ) : (
              state.transcript
                .filter((t) => !t.content.startsWith("["))
                .map((t, i) => (
                  <article
                    key={i}
                    className={`engine-line engine-line-${t.role}`}
                  >
                    <b>{t.role === "user" ? "You" : "Scripted interviewer"}</b>
                    <p>{t.content}</p>
                  </article>
                ))
            )}
          </div>
          {state && !state.done && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (answer.trim() && !busy) {
                  void run({ action: "answer", studentText: answer.trim() });
                  setAnswer("");
                }
              }}
            >
              <label htmlFor="engine-answer">Your response</label>
              <textarea
                id="engine-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={12000}
                rows={3}
                placeholder="Think aloud, explain an assumption, or ask for clarification…"
              />
              <button className="lab-primary" disabled={busy || !answer.trim()}>
                <Send size={14} /> Send response
              </button>
            </form>
          )}
          <div className="engine-controls">
            {state && !state.done && (
              <>
                <button
                  disabled={busy}
                  onClick={() => void run({ action: "repeat" })}
                >
                  Repeat prompt
                </button>
                <button
                  disabled={busy || !state.current}
                  onClick={() => {
                    void run({
                      action: "skip",
                      studentText: answer.trim() || undefined,
                      expectedQuestionIndex: state.questionIndex,
                    });
                    setAnswer("");
                  }}
                >
                  Skip exercise
                </button>
                <button
                  disabled={busy || !state.current}
                  onClick={() => {
                    void run({
                      action: "time_up",
                      studentText: answer.trim() || undefined,
                      expectedQuestionIndex: state.questionIndex,
                    });
                    setAnswer("");
                  }}
                >
                  Test time up
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    void run({
                      action: "end",
                      studentText: answer.trim() || undefined,
                    });
                    setAnswer("");
                  }}
                >
                  End rehearsal
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={timerOn}
                    onChange={(e) => setTimerOn(e.target.checked)}
                  />{" "}
                  Run real timer
                </label>
              </>
            )}
            {state && (
              <button
                disabled={busy}
                onClick={() => exportRun(state, pilot.school)}
              >
                <Download size={14} /> Export run
              </button>
            )}
            {state?.done && (
              <button
                disabled={busy}
                className="lab-primary"
                onClick={() => void start()}
              >
                New unseen circuit
              </button>
            )}
          </div>
          <p className="engine-status" role="status">
            {error ||
              (state
                ? `${state.evidence.length} evidence records · ${state.askedIds.length} distinct prompts · no grades generated`
                : "Choose a school to inspect its practice design.")}
          </p>
        </div>
      </div>
      <div className="engine-diagnostics">
        <div>
          <h3>Engine diagnostics</h3>
          <p>
            Execute complete circuits, evidence retention and repeat protection.
            These checks use scripted responses, not a live model.
          </p>
        </div>
        <button
          disabled={diagnosing}
          onClick={() => void diagnose()}
          className="lab-primary"
        >
          <Play size={14} />
          {diagnosing ? "Running diagnostics…" : "Run engine diagnostics"}
        </button>
        {report.length > 0 && (
          <>
            <p className="engine-diagnostic-result" role="status">
              {report.filter((r) => r.passed).length}/{report.length} checks
              passed · {checkedAt}
            </p>
            <div className="engine-diagnostic-grid">
              {report.map((r) => (
                <article key={r.name}>
                  <span>{r.passed ? <Check size={15} /> : "!"}</span>
                  <div>
                    <b>{r.name}</b>
                    <p>{r.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
