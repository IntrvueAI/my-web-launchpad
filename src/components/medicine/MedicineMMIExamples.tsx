import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MEDICINE_MMI_EXAMPLES,
  MMI_SOURCES,
  MMI_SOURCE_CHECKED,
  MMI_TOPICS,
  type MMIExample,
} from "@/data/medicine-mmi-examples";

const topicForInterview: Record<string, string> = {
  "medicine-ethics-practice": "Ethics & consent",
  "medicine-roleplay-practice": "Patient communication",
  "medicine-motivation-practice": "Motivation & reflection",
  "medicine-data-practice": "Health data & numeracy",
};
const buttonClass =
  "min-h-11 rounded-xl border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export function MedicineMMIExamples() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const topic =
    MMI_TOPICS.find((value) => value === params.get("topic")) ??
    "All MMI topics";
  const preferred =
    MEDICINE_MMI_EXAMPLES.find(
      (s) => s.topic === topicForInterview[params.get("interview") ?? ""],
    ) ?? MEDICINE_MMI_EXAMPLES[0];
  const filtered = MEDICINE_MMI_EXAMPLES.filter(
    (s) =>
      (topic === "All MMI topics" || s.topic === topic) &&
      `${s.title} ${s.question} ${s.topic} ${s.assesses.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const selected =
    filtered.find((s) => s.id === (params.get("station") ?? preferred.id)) ??
    filtered.find((s) => s.id === preferred.id) ??
    filtered[0];
  const selectedIndex = filtered.findIndex((s) => s.id === selected?.id);
  const stationContainer = useRef<HTMLDivElement>(null);
  const focusNextStation = useRef(false);
  useEffect(() => {
    if (!focusNextStation.current) return;
    focusNextStation.current = false;
    const heading = stationContainer.current?.querySelector<HTMLElement>("h2");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: "start" });
  }, [selected?.id]);
  function selectStation(id: string) {
    if (id === selected?.id) return;
    focusNextStation.current = true;
    const next = new URLSearchParams(params);
    next.set("station", id);
    setParams(next, { preventScrollReset: true });
  }
  function filterStations(nextQuery: string, nextTopic: string) {
    const next = new URLSearchParams(params);
    if (nextQuery) next.set("q", nextQuery);
    else next.delete("q");
    if (nextTopic !== "All MMI topics") next.set("topic", nextTopic);
    else next.delete("topic");
    next.delete("station");
    setParams(next, { replace: true, preventScrollReset: true });
  }
  return (
    <div className="space-y-6 text-foreground">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Medicine interview preparation
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          Medicine MMI worked answers
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Patient scenarios. Ethical decisions. NHS challenges. Practise your
          response, examine the reasoning and tackle the interviewer’s
          follow-up.
        </p>
        <p className="mt-3 text-xs font-medium text-primary">
          {MEDICINE_MMI_EXAMPLES.length} stations · {MMI_TOPICS.length} MMI
          topics ·{" "}
          {MEDICINE_MMI_EXAMPLES.reduce((n, s) => n + s.followUps.length, 0)}{" "}
          follow-up challenges
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="min-w-0 space-y-3 lg:sticky lg:top-4"
          aria-label="MMI station library"
        >
          <label className="flex items-center gap-2 rounded-xl border bg-card px-3">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <input
              aria-label="Search MMI stations"
              placeholder="Search consent, NHS, screening…"
              className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
              value={query}
              onChange={(e) => filterStations(e.target.value, topic)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">MMI topic</span>
            <select
              aria-label="Filter MMI topics"
              value={topic}
              onChange={(e) => filterStations(query, e.target.value)}
              className="w-full rounded-xl border bg-card p-3 text-sm"
            >
              <option>All MMI topics</option>
              {MMI_TOPICS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground" role="status">
            {filtered.length} {filtered.length === 1 ? "station" : "stations"}{" "}
            available
          </p>
          {!!filtered.length && (
            <label className="block lg:hidden">
              <span className="mb-2 block text-xs font-semibold">
                Choose a station
              </span>
              <select
                aria-label="Choose an MMI station"
                value={selected.id}
                onChange={(e) => selectStation(e.target.value)}
                className="w-full rounded-xl border bg-card p-3 text-sm"
              >
                {filtered.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="hidden max-h-[65vh] space-y-2 overflow-y-auto pr-1 lg:block">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected.id === s.id}
                onClick={() => selectStation(s.id)}
                className={`w-full rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected.id === s.id ? "border-primary bg-primary/10" : "bg-card hover:bg-muted"}`}
              >
                <span className="block text-[11px] font-medium text-muted-foreground">
                  {s.topic} · {s.format}
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {s.title}
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <div className="rounded-xl border bg-card p-4 text-sm">
              No stations match these filters.
              <button
                className="mt-3 block font-semibold underline"
                onClick={() => filterStations("", "All MMI topics")}
              >
                Clear filters
              </button>
            </div>
          )}
        </aside>
        {selected && (
          <div ref={stationContainer} className="min-w-0 space-y-4">
            <MMIStation
              key={`${user?.id ?? "guest"}:${selected.id}`}
              station={selected}
              scope={user?.id ?? "guest"}
            />
            {filtered.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground">
                  Station {selectedIndex + 1} of {filtered.length} in this
                  selection
                </span>
                <button
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
                  onClick={() =>
                    selectStation(
                      filtered[(selectedIndex + 1) % filtered.length].id,
                    )
                  }
                >
                  Next MMI station <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Original applicant-level practice informed by official guidance. The
        assessment points are learning prompts, not a university mark scheme.
        School formats vary; these examples practise MMI skills and are not
        clinical instructions.
      </p>
    </div>
  );
}

interface Attempt {
  draft: string;
  followUps: string[];
  checked: number[];
}
function readAttempt(key: string, station: MMIExample): Attempt {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return {
      draft: typeof value?.draft === "string" ? value.draft.slice(0, 6000) : "",
      followUps: station.followUps.map((_, i) =>
        typeof value?.followUps?.[i] === "string"
          ? value.followUps[i].slice(0, 2000)
          : "",
      ),
      checked: Array.isArray(value?.checked)
        ? [
            ...new Set<number>(
              value.checked.filter(
                (n: unknown) =>
                  typeof n === "number" &&
                  Number.isInteger(n) &&
                  n >= 0 &&
                  n < station.why.length,
              ),
            ),
          ]
        : [],
    };
  } catch {
    return {
      draft: "",
      followUps: station.followUps.map(() => ""),
      checked: [],
    };
  }
}

function MMIStation({
  station,
  scope,
}: {
  station: MMIExample;
  scope: string;
}) {
  const storageKey = `intrvue:mmi-example:v1:${scope}:${station.id}`;
  const [attempt, setAttempt] = useState(() =>
    readAttempt(storageKey, station),
  );
  const [revealed, setRevealed] = useState(false);
  const [openFollowUps, setOpenFollowUps] = useState<number[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(attempt));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [attempt, storageKey]);
  return (
    <article className="min-w-0 space-y-4" aria-label="Selected MMI station">
      <section className="rounded-2xl border bg-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {station.topic} · {station.format}
        </p>
        <h2
          tabIndex={-1}
          className="mt-3 scroll-mt-5 font-display text-2xl font-semibold focus:outline-none"
        >
          {station.title}
        </h2>
        <div className="mt-4 rounded-xl bg-muted/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            Your role
          </h3>
          <p className="mt-2 text-sm leading-relaxed">{station.role}</p>
        </div>
        <h3 className="mt-5 text-sm font-semibold">Candidate brief</h3>
        <p className="mt-2 text-base leading-relaxed">{station.question}</p>
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Skills practised"
        >
          {station.assesses.map((skill) => (
            <span key={skill} className="rounded-full border px-3 py-1 text-xs">
              {skill}
            </span>
          ))}
        </div>
        {station.data && (
          <div
            className="mt-5 overflow-x-auto rounded-xl border"
            role="region"
            aria-label="Station data"
            tabIndex={0}
          >
            <table className="w-full min-w-[260px] border-collapse text-left text-sm">
              <caption className="bg-muted/40 p-3 text-left text-xs font-medium">
                {station.data.caption}
              </caption>
              <thead>
                <tr>
                  {station.data.columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="border-t px-3 py-3 text-xs font-semibold"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {station.data.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) =>
                      j === 0 ? (
                        <th
                          key={j}
                          scope="row"
                          className="border-t px-3 py-3 font-medium"
                        >
                          {cell}
                        </th>
                      ) : (
                        <td key={j} className="border-t px-3 py-3 tabular-nums">
                          {typeof cell === "number"
                            ? cell.toLocaleString("en-GB")
                            : cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details className="mt-5 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Need a structure? Plan your approach
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {station.approach.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      </section>
      <section
        className="rounded-2xl border bg-card p-5 sm:p-7"
        aria-label="Your MMI attempt"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Your attempt</h3>
          <span className="text-xs text-muted-foreground">
            Read the brief, then answer aloud or make notes.
          </span>
        </div>
        <RehearsalTimer />
        <label className="mt-4 block text-sm font-medium" htmlFor="mmi-answer">
          Outline your MMI answer
        </label>
        <textarea
          id="mmi-answer"
          value={attempt.draft}
          onChange={(e) => setAttempt((a) => ({ ...a, draft: e.target.value }))}
          maxLength={6000}
          rows={5}
          className="mt-2 w-full resize-y rounded-xl border bg-background p-4 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          placeholder={
            station.format === "Roleplay"
              ? "Write what you would actually say to the patient or relative…"
              : "State your first step, explain your reasoning and identify what you still need to know…"
          }
        />
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span role="status">
            {saveFailed
              ? "Browser storage is unavailable. Keep a copy before leaving."
              : "Your notes and self-review stay in this browser."}
          </span>
          <span>{attempt.draft.length}/6,000</span>
        </div>
        {station.calculations && (
          <div className="mt-5 space-y-3">
            <h4 className="text-sm font-semibold">Check your arithmetic</h4>
            {station.calculations.map((calculation, i) => (
              <ArithmeticCheck
                key={`${station.id}-${i}`}
                calculation={calculation}
                index={i}
              />
            ))}
          </div>
        )}
        <button
          onClick={() => setRevealed((v) => !v)}
          aria-expanded={revealed}
          aria-controls={`worked-${station.id}`}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          <BookOpen className="h-4 w-4" />
          {revealed ? "Hide worked response" : "Compare with a worked response"}
        </button>
      </section>
      {revealed && (
        <section
          id={`worked-${station.id}`}
          className="space-y-6 rounded-2xl border bg-card p-5 sm:p-7"
          aria-label="Worked MMI response"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Examine the reasoning
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              {station.format === "Roleplay"
                ? "A possible opening conversation"
                : "One defensible response"}
            </h3>
            {station.personal && (
              <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm font-medium">
                Fictional reflection: use the structure with an experience that
                genuinely happened to you.
              </p>
            )}
            {station.format === "Roleplay" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Speak to the person. Pauses in brackets are listening cues;
                adapt to what they actually say.
              </p>
            )}
            <p className="mt-4 whitespace-pre-line text-sm leading-7">
              {station.answer}
            </p>
          </div>
          <div className="border-t pt-5">
            <h3 className="font-semibold">What this answer demonstrates</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Tick only the points you can also identify in your own answer.
              This is a self-check, not an admissions score.
            </p>
            <ul className="mt-4 space-y-3">
              {station.why.map((point, i) => (
                <li key={point}>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0 accent-primary"
                      checked={attempt.checked.includes(i)}
                      onChange={() =>
                        setAttempt((a) => ({
                          ...a,
                          checked: a.checked.includes(i)
                            ? a.checked.filter((n) => n !== i)
                            : [...a.checked, i],
                        }))
                      }
                    />
                    <span>{point}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
              <Check className="h-4 w-4" />
              {attempt.checked.length} of {station.why.length} points identified
              in your answer
            </p>
          </div>
          <details className="rounded-xl bg-muted/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              A common weak response — and how to improve it
            </summary>
            <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic">
              “{station.weakAnswer}”
            </blockquote>
            <p className="mt-3 text-sm leading-relaxed">{station.upgrade}</p>
          </details>
        </section>
      )}
      <section
        className="rounded-2xl border bg-card p-5 sm:p-7"
        aria-label="MMI follow-up challenges"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Keep the station going
        </p>
        <h3 className="mt-2 text-lg font-semibold">
          The interviewer follows up
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Try each challenge before opening the suggested response.
        </p>
        <div className="mt-5 space-y-5">
          {station.followUps.map((followUp, i) => (
            <div key={followUp.question} className="rounded-xl border p-4">
              <h4 className="text-sm font-semibold leading-relaxed">
                {i + 1}. {followUp.question}
              </h4>
              <label className="sr-only" htmlFor={`mmi-followup-${i}`}>
                Your response to follow-up {i + 1}
              </label>
              <textarea
                id={`mmi-followup-${i}`}
                rows={2}
                maxLength={2000}
                className="mt-3 w-full rounded-lg border bg-background p-3 text-sm"
                placeholder="How would you respond?"
                value={attempt.followUps[i] ?? ""}
                onChange={(e) =>
                  setAttempt((a) => ({
                    ...a,
                    followUps: a.followUps.map((value, index) =>
                      index === i ? e.target.value : value,
                    ),
                  }))
                }
              />
              <button
                aria-expanded={openFollowUps.includes(i)}
                aria-controls={`followup-answer-${i}`}
                onClick={() =>
                  setOpenFollowUps((values) =>
                    values.includes(i)
                      ? values.filter((n) => n !== i)
                      : [...values, i],
                  )
                }
                className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4"
              >
                {openFollowUps.includes(i) ? "Hide" : "Reveal"} follow-up{" "}
                {i + 1} response
              </button>
              {openFollowUps.includes(i) && (
                <p
                  id={`followup-answer-${i}`}
                  className="mt-3 rounded-lg bg-primary/5 p-3 text-sm leading-relaxed"
                >
                  {followUp.response}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <details className="rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Official guidance behind this station
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Sources checked{" "}
          {new Date(`${MMI_SOURCE_CHECKED}T12:00:00Z`).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "long", year: "numeric" },
          )}
          . These sources inform the principles. The scenario, response and any
          figures are original practice material.
        </p>
        <ul className="mt-4 space-y-4">
          {station.sources.map((id) => (
            <li key={id}>
              <a
                href={MMI_SOURCES[id].url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold underline underline-offset-4"
              >
                {MMI_SOURCES[id].title}
              </a>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {MMI_SOURCES[id].supports}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function RehearsalTimer() {
  const [remaining, setRemaining] = useState(300);
  const [endAt, setEndAt] = useState<number | null>(null);
  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (!left) setEndAt(null);
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [endAt]);
  const formatted = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return (
    <div className="mt-4 rounded-xl bg-muted/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          role="timer"
          aria-label={`Rehearsal time ${formatted}`}
          className="mr-1 inline-flex items-center gap-2 font-mono text-sm font-semibold tabular-nums"
        >
          <Clock className="h-4 w-4" />
          {formatted}
        </span>
        <button
          className={buttonClass}
          disabled={!remaining}
          onClick={() => {
            if (endAt !== null) {
              setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
              setEndAt(null);
            } else {
              setEndAt(Date.now() + remaining * 1000);
            }
          }}
        >
          <span className="inline-flex items-center gap-2">
            {endAt !== null ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {endAt !== null
              ? "Pause rehearsal"
              : remaining === 300
                ? "Start 5-minute rehearsal"
                : "Resume rehearsal"}
          </span>
        </button>
        <button
          className={buttonClass}
          onClick={() => {
            setEndAt(null);
            setRemaining(300);
          }}
          aria-label="Reset rehearsal timer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {remaining === 0
          ? "Time is up. Finish your point, then review your answer."
          : "Optional practice clock. This does not start an AI call or record you."}
      </p>
    </div>
  );
}

function ArithmeticCheck({
  calculation,
  index,
}: {
  calculation: NonNullable<MMIExample["calculations"]>[number];
  index: number;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"correct" | "retry" | "empty" | null>(
    null,
  );
  return (
    <div className="rounded-xl border p-3">
      <label
        className="block text-sm font-medium"
        htmlFor={`mmi-calculation-${index}`}
      >
        {calculation.label}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          ({calculation.unit})
        </span>
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id={`mmi-calculation-${index}`}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setResult(null);
          }}
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Your calculation"
        />
        <button
          className={buttonClass}
          onClick={() => {
            const number = Number(value.trim());
            setResult(
              !value.trim() || !Number.isFinite(number)
                ? "empty"
                : Math.abs(number - calculation.expected) <=
                    calculation.tolerance
                  ? "correct"
                  : "retry",
            );
          }}
        >
          Check calculation
        </button>
      </div>
      {result && (
        <p className="mt-3 text-sm leading-relaxed" role="status">
          {result === "correct"
            ? `Correct. ${calculation.working}`
            : result === "empty"
              ? "Enter a number using the unit shown above."
              : `Try again. ${calculation.hint}`}
        </p>
      )}
    </div>
  );
}
