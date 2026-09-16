import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Download,
  Expand,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import type { BankQuestion } from "@/interview/engine/types";
import {
  CONFIDENCE,
  REVIEW_CHECKS,
  TOPICS,
  revisitAt,
  type PracticeAttempt,
} from "@/interview/studio/practice";
import { usePracticeClock } from "./usePracticeClock";
import { usePrivateRecorder } from "./usePrivateRecorder";

type Phase = "brief" | "prepare" | "answer" | "review" | "saved";
const formatTime = (n: number) =>
  `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
export function PracticeSession({
  question,
  previous,
  onSave,
  onClose,
  onNext,
}: {
  question: BankQuestion;
  previous?: PracticeAttempt;
  onSave: (attempt: PracticeAttempt) => void;
  onClose: () => void;
  onNext?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [duration, setDuration] = useState(180);
  const [timed, setTimed] = useState(true);
  const [prep, setPrep] = useState(true);
  const [focus, setFocus] = useState(false);
  const [answer, setAnswer] = useState("");
  const [spoken, setSpoken] = useState(false);
  const [reflection, setReflection] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<1 | 2 | 3>();
  const [probe, setProbe] = useState(-1);
  const [hint, setHint] = useState(false);
  const [leave, setLeave] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finishedAt, setFinishedAt] = useState("");
  const [notice, setNotice] = useState("");
  const recorder = usePrivateRecorder();
  const heading = useRef<HTMLHeadingElement>(null);
  const room = useRef<HTMLElement>(null);
  const saved = useRef(false);
  const clock = usePracticeClock(duration, () => {
    if (phase === "prepare") beginAnswer();
    else if (phase === "answer")
      finish("Time is up. Take a moment to reflect on your attempt.", duration);
  });
  const probes = question.liveProbes ?? [];
  const cancelSpeech = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };
  useEffect(() => {
    heading.current?.focus();
    cancelSpeech();
  }, [phase]);
  useEffect(() => () => cancelSpeech(), []);
  useEffect(() => {
    if (!focus) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setFocus(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(
        room.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,audio[controls]",
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !room.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
    };
  }, [focus]);
  useEffect(() => {
    if (phase === "brief" || phase === "saved") return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [phase]);
  function beginAnswer() {
    setPhase("answer");
    setNotice("");
    clock.reset(duration, timed);
  }
  function begin() {
    if (prep) {
      setPhase("prepare");
      clock.reset(45, timed);
    } else beginAnswer();
  }
  function finish(message = "", elapsed?: number) {
    clock.pause();
    recorder.stop();
    cancelSpeech();
    setSeconds(timed ? (elapsed ?? duration - clock.remaining) : 0);
    setNotice(message);
    setPhase("review");
  }
  function readPrompt() {
    if (!("speechSynthesis" in window)) {
      setNotice(
        "Read aloud is unavailable in this browser. The full prompt is on screen.",
      );
      return;
    }
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(
      probe >= 0 ? probes[probe].probe : question.question,
    );
    utterance.lang = "en-GB";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
  function save() {
    if (
      !confidence ||
      saved.current ||
      !nextStep.trim() ||
      !(answer.trim() || spoken || recorder.url)
    )
      return;
    const now = Date.now();
    saved.current = true;
    const completedAt = new Date(now).toISOString();
    setFinishedAt(completedAt);
    onSave({
      id: crypto.randomUUID(),
      questionId: question.id,
      completedAt,
      revisitAt: revisitAt(confidence, now),
      confidence,
      answer: answer.trim(),
      reflection: reflection.trim(),
      nextStep: nextStep.trim(),
      seconds: Math.max(0, seconds),
      checks,
    });
    setPhase("saved");
  }
  const active = phase === "prepare" || phase === "answer";
  const step =
    phase === "brief" || phase === "prepare" ? 0 : phase === "answer" ? 1 : 2;
  return (
    <section
      ref={room}
      role={focus ? "dialog" : undefined}
      aria-modal={focus ? true : undefined}
      className={`practice-session ${focus ? "studio-focus" : ""}`}
      data-active={active}
      aria-label="Practice session"
    >
      <div className="studio-session-top">
        <button
          className="studio-quiet"
          onClick={() =>
            phase === "brief" || phase === "saved" ? onClose() : setLeave(true)
          }
        >
          <ArrowLeft size={16} />
          Practice desk
        </button>
        <div className="studio-inline">
          <span className="studio-tag">SELF PRACTICE</span>
          <button
            className="studio-icon"
            aria-label={focus ? "Exit focus view" : "Enter focus view"}
            aria-pressed={focus}
            onClick={() => setFocus((v) => !v)}
          >
            <Expand size={17} />
          </button>
        </div>
      </div>
      {leave && (
        <div className="studio-notice" role="alert">
          <p>Leave this attempt? Unsaved notes and audio will be removed.</p>
          <div className="studio-inline">
            <button className="studio-button" onClick={() => setLeave(false)}>
              Keep practising
            </button>
            <button className="studio-secondary" onClick={onClose}>
              Discard attempt
            </button>
          </div>
        </div>
      )}
      <ol className="studio-steps" aria-label="Practice steps">
        {["Prepare", "Respond", "Reflect"].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            <span>{i < step ? <Check size={14} /> : `0${i + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>
      {active && (
        <div className="studio-mobile-clock">
          <span className="studio-eyebrow">
            {phase === "prepare" ? "READ & PLAN" : "YOUR RESPONSE"}
          </span>
          <strong
            role="timer"
            aria-label={
              timed
                ? `${clock.remaining} seconds remaining`
                : "Untimed practice"
            }
          >
            {timed ? formatTime(clock.remaining) : "No rush"}
          </strong>
          {timed && (
            <button
              className="studio-icon"
              onClick={() => (clock.running ? clock.pause() : clock.start())}
              aria-label={clock.running ? "Pause timer" : "Resume timer"}
            >
              {clock.running ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}
        </div>
      )}
      <div className="studio-session-grid">
        <div className="studio-session-main">
          <div className="studio-inline studio-between">
            <span className="studio-eyebrow">
              {TOPICS[question.topic]} · Level {question.difficulty}
            </span>
            <button
              className="studio-icon"
              onClick={readPrompt}
              aria-label="Read prompt aloud"
            >
              <Volume2 size={18} />
            </button>
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {phase === "saved"
              ? "One attempt. A clearer next step."
              : question.title}
          </h2>
          {phase !== "saved" && (
            <div className="studio-prompt">
              <p>{question.question}</p>
            </div>
          )}
          {notice && (
            <p className="studio-notice" role="status">
              {notice}
            </p>
          )}
          {phase === "brief" && (
            <>
              <p className="studio-muted">
                An original practice prompt. Explain your thinking in your own
                words, then compare it with the review guide.
              </p>
              <fieldset className="studio-settings">
                <legend>Your pace</legend>
                <div className="studio-inline">
                  {[120, 180, 300].map((n) => (
                    <button
                      className="studio-chip"
                      aria-pressed={duration === n}
                      onClick={() => setDuration(n)}
                      key={n}
                    >
                      {n / 60} min answer
                    </button>
                  ))}
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={prep}
                    onChange={(e) => setPrep(e.target.checked)}
                  />
                  45 seconds to read and plan
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!timed}
                    onChange={(e) => setTimed(!e.target.checked)}
                  />
                  Untimed practice
                </label>
                <small>
                  These are practice settings, not a university’s interview
                  format.
                </small>
              </fieldset>
              <button className="studio-button" onClick={begin}>
                Enter practice room <ArrowRight size={17} />
              </button>
            </>
          )}
          {phase === "prepare" && (
            <>
              <div className="studio-prepare">
                <span className="studio-orbit">
                  <Clock3 size={30} />
                </span>
                <h3>Read. Breathe. Find your opening.</h3>
                <p>
                  Identify the question, the people affected, and what you would
                  need to know. A few words are enough to plan your answer.
                </p>
              </div>
              <button className="studio-button" onClick={beginAnswer}>
                I’m ready to respond <ArrowRight size={17} />
              </button>
            </>
          )}
          {phase === "answer" && (
            <>
              {probe >= 0 && (
                <div className="studio-probe">
                  <span className="studio-eyebrow">
                    FOLLOW-UP {probe + 1} · AUTHORED PROMPT
                  </span>
                  <p>{probes[probe].probe}</p>
                </div>
              )}
              <label className="studio-field">
                Your answer or notes
                <textarea
                  autoComplete="off"
                  maxLength={10000}
                  rows={7}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Speak aloud, type, or use a few notes. Aim for a clear answer, a reason and a specific example."
                />
              </label>
              <div className="studio-answer-meta">
                <span>
                  {answer.trim() ? answer.trim().split(/\s+/).length : 0} words
                  · no automated grade
                </span>
                <button
                  className="studio-quiet"
                  onClick={() => setHint((v) => !v)}
                >
                  {hint ? "Hide thinking prompt" : "Need a starting point?"}
                </button>
              </div>
              {hint && (
                <p className="studio-notice">
                  {question.hints?.[0] ??
                    "Start with your position, explain your reasoning, then consider what could change your mind."}
                </p>
              )}
              <div className="studio-inline studio-wrap">
                <button className="studio-button" onClick={() => finish()}>
                  Finish & reflect <ArrowRight size={16} />
                </button>
                {probe < probes.length - 1 && (
                  <button
                    className="studio-secondary"
                    onClick={() => {
                      cancelSpeech();
                      setProbe((p) => p + 1);
                    }}
                  >
                    Add a follow-up
                  </button>
                )}
              </div>
              <p className="studio-small">
                Follow-ups are prewritten practice prompts. This room does not
                analyse your answer or act as a live interviewer.
              </p>
            </>
          )}
          {phase === "review" && (
            <>
              <p className="studio-muted">
                Review your own reasoning before reading the guide. These
                reflections are yours; they are not an admissions score.
              </p>
              {answer && (
                <details className="studio-details" open>
                  <summary>Your answer</summary>
                  <p className="studio-preserve">{answer}</p>
                </details>
              )}
              {!answer.trim() && (
                <label className="studio-checkbox">
                  <input
                    type="checkbox"
                    checked={spoken}
                    onChange={(e) => setSpoken(e.target.checked)}
                  />
                  I practised my response aloud.
                </label>
              )}
              <fieldset className="studio-settings">
                <legend>What came through?</legend>
                {REVIEW_CHECKS.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={checks.includes(c.id)}
                      onChange={(e) =>
                        setChecks((old) =>
                          e.target.checked
                            ? [...old, c.id]
                            : old.filter((id) => id !== c.id),
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </fieldset>
              <details className="studio-details">
                <summary>Open the question’s review guide</summary>
                <h4>A stronger response</h4>
                <p>{question.rubric?.strong}</p>
                <h4>A response to develop</h4>
                <p>{question.rubric?.developing}</p>
                {question.topic === "data-interpretation" && (
                  <>
                    <h4>Reasoning to compare</h4>
                    <p>{question.modelReasoningPath || question.answer}</p>
                  </>
                )}
                {probes.slice(0, probe + 1).map((p) => (
                  <div key={p.probe}>
                    <h4>{p.probe}</h4>
                    <p>{p.goodResponse}</p>
                  </div>
                ))}
              </details>
              <label className="studio-field">
                What would you change?
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="For example: I explained my choice, but didn’t ask what information was missing."
                />
              </label>
              <label className="studio-field">
                One thing to try next time{" "}
                <span className="studio-small">Required</span>
                <input
                  maxLength={500}
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="Start with one clear sentence before exploring the alternatives."
                />
              </label>
              <fieldset className="studio-settings">
                <legend>How ready do you feel to try this again?</legend>
                <div className="studio-confidence">
                  {CONFIDENCE.map((label, i) => (
                    <button
                      key={label}
                      className="studio-chip"
                      aria-pressed={confidence === i + 1}
                      onClick={() => setConfidence((i + 1) as 1 | 2 | 3)}
                    >
                      <span>{label}</span>
                      <small>
                        Revisit in {[1, 3, 7][i]} day{i === 0 ? "" : "s"}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                className="studio-button"
                onClick={save}
                disabled={
                  !confidence ||
                  !nextStep.trim() ||
                  !(answer.trim() || spoken || recorder.url)
                }
              >
                Save reflection <Check size={17} />
              </button>
              <p className="studio-small">
                Saved in this browser, separate from your scored interviews.
                Audio is not saved with it.
              </p>
            </>
          )}
          {phase === "saved" && (
            <>
              <div className="studio-saved">
                <span className="studio-orbit">
                  <Check size={30} />
                </span>
                <span className="studio-eyebrow">YOUR NEXT STEP</span>
                <h3>{nextStep}</h3>
                <p>
                  Come back on{" "}
                  {new Date(
                    revisitAt(confidence!, Date.parse(finishedAt)),
                  ).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  for a fresh attempt.
                </p>
              </div>
              {previous && (
                <div className="studio-comparison">
                  <div>
                    <span className="studio-eyebrow">PREVIOUS NEXT STEP</span>
                    <p>{previous.nextStep}</p>
                    <small>
                      {new Date(previous.completedAt).toLocaleDateString(
                        "en-GB",
                      )}
                    </small>
                  </div>
                  <div>
                    <span className="studio-eyebrow">
                      THIS TIME YOU NOTICED
                    </span>
                    <p>{reflection || nextStep}</p>
                    <small>Your reflection, not an automated assessment</small>
                  </div>
                </div>
              )}
              <div className="studio-inline studio-wrap">
                {onNext && (
                  <button className="studio-button" onClick={onNext}>
                    Next practice <ArrowRight size={16} />
                  </button>
                )}
                <button className="studio-secondary" onClick={onClose}>
                  Back to my plan
                </button>
              </div>
            </>
          )}
        </div>
        <aside className="studio-session-aside">
          <div className="studio-room">
            <div className="studio-inline">
              <span className="studio-live-dot" />
              YOUR PRACTICE SPACE
            </div>
            <div className="studio-wave" aria-hidden="true">
              {[18, 32, 48, 26, 64, 42, 75, 54, 32, 62, 40, 20, 36].map(
                (height, i) => (
                  <i key={i} style={{ height }} />
                ),
              )}
            </div>
            <p>
              A moment to think.
              <br />A chance to say it better.
            </p>
          </div>
          <div className="studio-clock">
            <span className="studio-eyebrow">
              {phase === "prepare"
                ? "READ & PLAN"
                : phase === "answer"
                  ? "YOUR RESPONSE"
                  : "YOUR PACE"}
            </span>
            <strong
              role="timer"
              aria-label={
                timed
                  ? `${clock.remaining} seconds remaining`
                  : "Untimed practice"
              }
            >
              {timed
                ? formatTime(active ? clock.remaining : duration)
                : "No rush"}
            </strong>
            {active && timed && (
              <button
                className="studio-secondary"
                onClick={() => (clock.running ? clock.pause() : clock.start())}
              >
                {clock.running ? <Pause size={15} /> : <Play size={15} />}{" "}
                {clock.running ? "Pause timer" : "Resume timer"}
              </button>
            )}
            <small>
              {active && timed && !clock.running
                ? "Timer paused. Recording has its own control."
                : "Your thinking matters more than filling every second."}
            </small>
          </div>
          {phase !== "brief" && phase !== "prepare" && (
            <div className="studio-recorder">
              <div className="studio-inline">
                <Mic size={17} />
                <h3>Listen to yourself</h3>
              </div>
              <p>
                Optional audio stays in this tab. Download it to keep it.
                Closing the room removes it.
              </p>
              {phase === "answer" && (
                <button
                  className="studio-secondary"
                  disabled={recorder.state === "stopping"}
                  onClick={() =>
                    recorder.state === "recording" ||
                    recorder.state === "requesting"
                      ? recorder.stop()
                      : recorder.start()
                  }
                >
                  {recorder.state === "recording" ? (
                    <Square size={14} />
                  ) : (
                    <Mic size={16} />
                  )}{" "}
                  {recorder.state === "recording"
                    ? "Stop recording"
                    : recorder.state === "requesting"
                      ? "Cancel microphone request"
                      : recorder.url
                        ? "Record again"
                        : "Record my answer"}
                </button>
              )}
              {recorder.state === "recording" && (
                <p role="status" className="studio-recording">
                  ● Recording · maximum 10 minutes
                </p>
              )}
              {recorder.error && <p role="status">{recorder.error}</p>}
              {recorder.url && (
                <>
                  <audio
                    controls
                    src={recorder.url}
                    aria-label="Your private practice recording"
                  />
                  <div className="studio-inline studio-wrap">
                    <a
                      className="studio-quiet"
                      href={recorder.url}
                      download={`medicine-practice-${question.id}.${recorder.extension}`}
                    >
                      <Download size={15} />
                      Keep audio
                    </a>
                    <button className="studio-quiet" onClick={recorder.discard}>
                      <RotateCcw size={14} />
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <p className="studio-small">
            Solo practice · original intrvue prompt
            <br />
            No camera or live AI connection is needed.
          </p>
        </aside>
      </div>
    </section>
  );
}
