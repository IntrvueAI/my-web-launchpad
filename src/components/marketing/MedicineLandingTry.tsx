import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import { getStudioBank } from "@/interview/studio/bank";
import { medicinePriceTag } from "@/config/medicinePricing";
import { Reveal, useLandingFonts } from "./LandingReveal";
import {
  MEDICINE_LANDING_FAQS, MEDICINE_LANDING_FORMATS, MEDICINE_LANDING_PRICES, MEDICINE_TRY_PROMPT_IDS,
} from "./medicineLandingContent";
import "./medicine-landing-try.css";

const READING_SECONDS = 60;
const TOPIC: Record<string, { label: string; interview: string }> = {
  "ethics-scenarios": { label: "Ethics & judgement", interview: "medicine-ethics-practice" },
  "data-interpretation": { label: "Data & prioritisation", interview: "medicine-data-practice" },
  "motivation-reflection": { label: "Motivation & reflection", interview: "medicine-motivation-practice" },
};

const STEPS = [
  ["Read", "One minute with the brief, which stays on screen."],
  ["Answer aloud", "Up to five minutes. Typing is there if you need it."],
  ["Follow-ups", "Clara builds her next question on the point you made."],
  ["Feedback", "Scores tied to quotes from your answer, plus one next step."],
] as const;

type Phase = "idle" | "reading" | "paused" | "answer";

/** The interactive hero: pick a station, use the reading minute, then see a follow-up. */
function StationDemo() {
  const stations = useMemo(() => {
    const bank = getStudioBank();
    return MEDICINE_TRY_PROMPT_IDS.map((id) => bank.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q && !!TOPIC[q.topic]);
  }, []);
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(READING_SECONDS);
  const station = stations[active];

  useEffect(() => {
    if (phase !== "reading") return;
    const timer = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase === "reading" && left === 0) setPhase("answer");
  }, [phase, left]);
  const choose = (i: number) => {
    setActive(i);
    setPhase("idle");
    setLeft(READING_SECONDS);
  };
  if (!station) return null;

  const topic = TOPIC[station.topic];
  const probe = station.liveProbes?.[0]?.probe ?? station.hints?.[0];
  const progress = 1 - left / READING_SECONDS;
  const price = medicinePriceTag(topic.interview);
  return (
    <div className="mt-demo">
      <div role="tablist" aria-label="Choose a station" className="mt-tabs">
        {stations.map((q, i) => (
          <button key={q.id} type="button" role="tab" id={`mt-tab-${q.id}`} aria-selected={i === active} aria-controls="mt-station" onClick={() => choose(i)}>
            {TOPIC[q.topic].label}
          </button>
        ))}
      </div>
      <div className="mt-station" id="mt-station" role="tabpanel" aria-labelledby={`mt-tab-${station.id}`}>
        <div className="mt-station-head">
          <span className="mt-chip">Station brief</span>
          <span className="mt-muted">Original practice question</span>
        </div>
        <h3 className="mt-sr">{topic.label} station brief</h3>
        <p className="mt-brief">{station.question}</p>

        <div className="mt-timer">
          <svg viewBox="0 0 44 44" className="mt-ring" aria-hidden>
            <circle cx="22" cy="22" r="19" />
            <circle cx="22" cy="22" r="19" className="mt-ring-on" style={{ strokeDashoffset: `${119.4 * (1 - progress)}` }} />
          </svg>
          <div className="mt-timer-text" aria-live="polite">
            <b>{phase === "answer" ? "Answering time" : "Reading time"}</b>
            <span className="mt-mono">{phase === "answer" ? "Up to 5:00" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</span>
          </div>
          <div className="mt-timer-actions">
            {phase === "reading" ? (
              <button type="button" className="mt-icon" onClick={() => setPhase("paused")} aria-label="Pause reading time"><Pause size={16} aria-hidden /></button>
            ) : phase !== "answer" ? (
              <button type="button" className="mt-icon" onClick={() => setPhase("reading")} aria-label={phase === "paused" ? "Resume reading time" : "Start reading time"}><Play size={16} aria-hidden /></button>
            ) : null}
            {phase !== "answer" ? (
              <button type="button" className="mt-ready" onClick={() => setPhase("answer")}>I'm ready</button>
            ) : (
              <button type="button" className="mt-icon" onClick={() => choose(active)} aria-label="Start again"><RotateCcw size={16} aria-hidden /></button>
            )}
          </div>
        </div>

        {phase === "answer" && (
          <div className="mt-answer" role="status">
            <p className="mt-answer-lead">Now say your answer out loud, as you would in the room.</p>
            {probe && (
              <div className="mt-probe">
                <span className="mt-avatar" aria-hidden>C</span>
                <div>
                  <p className="mt-muted">A follow-up you might hear</p>
                  <p>{probe}</p>
                </div>
              </div>
            )}
            <p className="mt-muted mt-small">In a live interview, Clara chooses her follow-up from what you actually said.</p>
          </div>
        )}
      </div>
      <div className="mt-demo-actions">
        <a className="mt-btn" href="/auth?mode=medicine">
          Practise {topic.label.toLowerCase()} with Clara <ArrowRight size={16} aria-hidden />
        </a>
        <span className="mt-price">{price}</span>
        <a className="mt-link" href="/medicine/practice">or practise more like this in the free solo studio</a>
      </div>
    </div>
  );
}

/** "Try it now": the first screen is a working station, not a description of one. */
export function MedicineLandingTry() {
  useLandingFonts();
  return (
    <div className="mt">
      <header className="mt-nav">
        <a className="mt-brand" href="/medicine"><span aria-hidden />MMI Practice</a>
        <div className="mt-nav-actions">
          <a href="#mt-pricing">Pricing</a>
          <a href="/auth?mode=medicine">Log in</a>
          <a className="mt-btn mt-btn-sm" href="/auth?mode=medicine">Sign up free</a>
        </div>
      </header>

      <main>
        <section className="mt-hero">
          <div className="mt-hero-copy">
            <p className="mt-eyebrow">Try a station</p>
            <h1>Don't read about it. Try a station.</h1>
            <p className="mt-lede">
              Pick a station, use your minute of reading time, and see how an MMI interviewer might push your thinking.
              No account needed to try.
            </p>
            <ul className="mt-facts">
              <li><b>7 min</b> per mini interview</li>
              <li><b>6</b> stations in a full MMI</li>
              <li><b>Free</b> ethics station</li>
            </ul>
          </div>
          <StationDemo />
        </section>

        <section className="mt-section" aria-labelledby="mt-how-title">
          <Reveal className="mt-head">
            <p className="mt-eyebrow">The live version</p>
            <h2 id="mt-how-title">With Clara, the station talks back.</h2>
          </Reveal>
          <ol className="mt-steps">
            {STEPS.map(([title, text], i) => (
              <Reveal as="li" key={title}>
                <span className="mt-mono">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="mt-section" id="mt-pricing" aria-labelledby="mt-pricing-title">
          <Reveal className="mt-head">
            <p className="mt-eyebrow">Formats and prices</p>
            <h2 id="mt-pricing-title">Every format, one clear price.</h2>
          </Reveal>
          <Reveal className="mt-table-wrap">
            <table className="mt-table">
              <caption className="mt-sr">Live practice formats and prices</caption>
              <thead>
                <tr><th scope="col">Format</th><th scope="col">Timing</th><th scope="col">Price</th></tr>
              </thead>
              <tbody>
                {MEDICINE_LANDING_FORMATS.map((f) => (
                  <tr key={f.id}>
                    <th scope="row">{f.name}<span>{f.kind}</span></th>
                    <td>{f.readingMinutes} min reading · {f.answerMinutes} min answering{f.full ? " · ×6" : ""}</td>
                    <td><span className="mt-price">{f.price}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <div className="mt-packs">
            {MEDICINE_LANDING_PRICES.filter((p) => p.id !== "free").map((p) => (
              <Reveal key={p.id} className="mt-pack">
                <p><b>{p.name}</b> · {p.unit}</p>
                <p className="mt-pack-price">{p.price}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mt-section mt-faq" aria-labelledby="mt-faq-title">
          <Reveal className="mt-head">
            <p className="mt-eyebrow">Questions</p>
            <h2 id="mt-faq-title">Before you start.</h2>
          </Reveal>
          <Reveal>
            {MEDICINE_LANDING_FAQS.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </Reveal>
        </section>
      </main>

      <footer className="mt-footer">
        <span>MMI Practice</span>
        <span>Original practice questions. Not affiliated with or endorsed by any university.</span>
      </footer>
    </div>
  );
}
