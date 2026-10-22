import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { getStudioBank } from "@/interview/studio/bank";
import { Reveal, useLandingFonts } from "./LandingReveal";
import { MEDICINE_LANDING_PRICES } from "./medicineLandingContent";
import "./medicine-landing-story.css";

const STORY_PROMPT = "MED-D6";
const FALLBACK_BRIEF = "A headline says a new drug halves the risk of a rare complication. Is the figure misleading?";

const STEPS = [
  { id: "read", label: "01 · Read", title: "A minute to think before you speak.", text: "Each station opens with a short brief and one minute of reading time. The brief stays on screen, so nothing rests on memory." },
  { id: "speak", label: "02 · Speak", title: "Answer out loud, in your own words.", text: "You have up to five minutes to think it through. Prefer to type? You can. A gentle alert marks the final minute." },
  { id: "probe", label: "03 · Get challenged", title: "A follow-up built on your point.", text: "Clara asks about what you actually said, the way an assessor would. Roleplay characters stay in role." },
  { id: "learn", label: "04 · Improve", title: "Feedback that quotes you.", text: "Each score is tied to a line from your answer, with one specific thing to try next time. Unassessed areas are labelled, never guessed." },
] as const;
type StepId = (typeof STEPS)[number]["id"];

function Screen({ step, brief, probe }: { step: StepId; brief: string; probe: string }) {
  return (
    <div className="ms-screen">
      <div className="ms-screen-bar"><i /><i /><i /><span>Station 2 · Data & prioritisation</span></div>
      <div className="ms-panel">
        {step === "read" && (
          <>
            <p className="ms-tag">Reading time · 0:42</p>
            <p className="ms-brief">{brief}</p>
            <div className="ms-progress"><span style={{ width: "30%" }} /></div>
          </>
        )}
        {step === "speak" && (
          <>
            <p className="ms-tag ms-tag-live">Answering · 3:12 left</p>
            <div className="ms-wave" aria-hidden>{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.12}s` }} />)}</div>
            <p className="ms-transcript">“The 50% is true, but it's a relative figure. In absolute terms it's one fewer case in every thousand people…”</p>
          </>
        )}
        {step === "probe" && (
          <>
            <p className="ms-tag">Clara</p>
            <p className="ms-bubble">{probe}</p>
            <p className="ms-bubble ms-bubble-me">Then the same 50% would mean a hundred fewer cases per thousand, which matters far more.</p>
          </>
        )}
        {step === "learn" && (
          <>
            <p className="ms-tag">Station feedback</p>
            {[["Evidence & reasoning", 4], ["Communication", 3]].map(([name, score]) => (
              <div className="ms-score" key={name}>
                <span>{name}</span>
                <span className="ms-bars">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= (score as number) ? "on" : ""} />)}</span>
              </div>
            ))}
            <p className="ms-quote">“In absolute terms it's one fewer case in every thousand.”</p>
            <p className="ms-next">Next time: say who the headline might mislead, and why that matters for patients.</p>
          </>
        )}
      </div>
      <p className="ms-illustration">Illustration · not a real candidate</p>
    </div>
  );
}

/** "Story": a sticky interview screen that changes as each step scrolls past. */
export function MedicineLandingStory() {
  useLandingFonts();
  const { brief, probe } = useMemo(() => {
    const q = getStudioBank().find((x) => x.id === STORY_PROMPT);
    return {
      brief: q?.question ?? FALLBACK_BRIEF,
      probe: q?.liveProbes?.[0]?.probe ?? "Would the same 50% feel as misleading if the complication were far more common?",
    };
  }, []);
  const [active, setActive] = useState<StepId>("read");
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.step as StepId);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of stepRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="ms">
      <header className="ms-nav">
        <a className="ms-brand" href="/medicine">MMI Practice</a>
        <div className="ms-nav-actions">
          <a href="/auth?mode=medicine">Log in</a>
          <a className="ms-btn ms-btn-sm" href="/auth?mode=medicine">Try it free</a>
        </div>
      </header>

      <main>
        <section className="ms-hero">
          <p className="ms-eyebrow">MMI practice with Clara</p>
          <h1>
            Seven minutes.<br />One station.<br /><span>A clearer answer.</span>
          </h1>
          <p className="ms-lede">Follow one mini interview from the first second of reading time to the feedback you take away.</p>
          <a className="ms-scroll" href="#ms-story"><ArrowDown size={18} aria-hidden /> Scroll through a station</a>
        </section>

        <section className="ms-story" id="ms-story" aria-label="How a station works">
          <div className="ms-steps">
            {STEPS.map((s, i) => (
              <article
                key={s.id}
                data-step={s.id}
                ref={(el) => { stepRefs.current[i] = el; }}
                className={`ms-step${active === s.id ? " is-active" : ""}`}
              >
                <p className="ms-step-label">{s.label}</p>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
                <div className="ms-inline" aria-hidden>
                  <Screen step={s.id} brief={brief} probe={probe} />
                </div>
              </article>
            ))}
          </div>
          <div className="ms-stage" aria-hidden>
            <Screen step={active} brief={brief} probe={probe} />
            <ol className="ms-dots">
              {STEPS.map((s) => <li key={s.id} className={active === s.id ? "on" : ""} />)}
            </ol>
          </div>
        </section>

        <section className="ms-pricing" aria-labelledby="ms-pricing-title">
          <Reveal className="ms-pricing-head">
            <p className="ms-eyebrow">Pricing</p>
            <h2 id="ms-pricing-title">Start free. Pay per interview after that.</h2>
          </Reveal>
          <div className="ms-plans">
            {MEDICINE_LANDING_PRICES.map((p) => (
              <Reveal as="article" key={p.id} className="ms-plan">
                <h3>{p.name}</h3>
                <p className="ms-plan-price">{p.price}<small>{p.unit}</small></p>
                <p>{p.detail}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="ms-closing">
            <a className="ms-btn" href="/auth?mode=medicine">Try a free ethics station <ArrowRight size={17} aria-hidden /></a>
            <a className="ms-link" href="/medicine/practice">Or warm up in the free solo studio</a>
          </Reveal>
        </section>
      </main>

      <footer className="ms-footer">
        <span>MMI Practice</span>
        <span>Original practice questions. Not affiliated with or endorsed by any university. Feedback is practice, not an admissions prediction.</span>
      </footer>
    </div>
  );
}
