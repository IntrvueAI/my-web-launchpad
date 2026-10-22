import { ArrowRight } from "lucide-react";
import claraShot from "@/assets/landing-hero-shot.png";
import { Reveal, useLandingFonts } from "./LandingReveal";
import { MEDICINE_LANDING_FAQS, MEDICINE_LANDING_FORMATS, MEDICINE_LANDING_PRICES } from "./medicineLandingContent";
import "./medicine-landing-calm.css";

const FRAUNCES = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap";

const STEPS = [
  { n: "1", title: "Read", text: "One minute with the station brief. It stays on screen while you answer, so nothing rests on memory." },
  { n: "2", title: "Speak", text: "Up to five minutes, out loud. Clara listens and follows up on the point you actually made." },
  { n: "3", title: "Reflect", text: "Written feedback that quotes your answer, with one specific thing to try next time." },
];

const PRINCIPLES = [
  ["Original questions", "Practice material for transferable MMI skills, not real university questions."],
  ["Independent", "Not affiliated with or endorsed by any university."],
  ["Honest feedback", "Anything Clara could not assess is labelled as not assessed, never guessed."],
  ["Practice, not prediction", "Feedback helps you improve. It is not an admissions result."],
] as const;

/** "Calm": a light, editorial landing page with generous space and a serif voice. */
export function MedicineLandingCalm() {
  useLandingFonts(FRAUNCES);
  return (
    <div className="mc">
      <header className="mc-nav">
        <a className="mc-brand" href="/medicine">MMI Practice</a>
        <nav aria-label="Page sections">
          <a href="#mc-how">How it works</a>
          <a href="#mc-formats">Formats</a>
          <a href="#mc-pricing">Pricing</a>
          <a href="#mc-faq">Questions</a>
        </nav>
        <div className="mc-nav-actions">
          <a href="/auth?mode=medicine">Log in</a>
          <a className="mc-btn mc-btn-sm" href="/auth?mode=medicine">Try it free</a>
        </div>
      </header>

      <main>
        <section className="mc-hero">
          <Reveal className="mc-hero-copy">
            <p className="mc-eyebrow">MMI practice for future doctors</p>
            <h1>
              Prepare for your MMI <em>calmly</em>, one station at a time.
            </h1>
            <p className="mc-lede">
              Practise with Clara, an AI interviewer. Read the brief, say your answer out loud, and get feedback that quotes
              what you said.
            </p>
            <div className="mc-actions">
              <a className="mc-btn" href="/auth?mode=medicine">Try a free ethics station <ArrowRight size={17} aria-hidden /></a>
              <a className="mc-text-link" href="/medicine/practice">or open the free solo studio</a>
            </div>
          </Reveal>
          <Reveal className="mc-hero-art">
            <div className="mc-portrait">
              <img src={claraShot} alt="Clara, the AI practice interviewer, on a video call" />
            </div>
            <div className="mc-breath" aria-hidden>
              <span className="mc-breath-ring" />
              <span>
                <b>Reading time</b>
                <small>0:47 left</small>
              </span>
            </div>
            <p className="mc-caption">Illustration of the interview screen.</p>
          </Reveal>
        </section>

        <section className="mc-section" id="mc-how" aria-labelledby="mc-how-title">
          <Reveal className="mc-head">
            <p className="mc-eyebrow">How a station works</p>
            <h2 id="mc-how-title">Three quiet steps.</h2>
          </Reveal>
          <ol className="mc-steps">
            {STEPS.map((s) => (
              <Reveal as="li" key={s.n}>
                <span className="mc-step-n" aria-hidden>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="mc-statement" aria-label="Our approach">
          <Reveal>
            <p>
              MMIs reward clear thinking under gentle pressure. Practice should build exactly that,
              <em> without the stakes.</em>
            </p>
          </Reveal>
        </section>

        <section className="mc-section" id="mc-formats" aria-labelledby="mc-formats-title">
          <Reveal className="mc-head">
            <p className="mc-eyebrow">Live formats</p>
            <h2 id="mc-formats-title">Choose your depth.</h2>
          </Reveal>
          <ul className="mc-formats">
            {MEDICINE_LANDING_FORMATS.map((f) => (
              <Reveal as="li" key={f.id}>
                <div>
                  <p className="mc-format-kind">{f.kind}</p>
                  <h3>{f.name}</h3>
                  <p className="mc-format-meta">{f.readingMinutes} min reading · {f.answerMinutes} min answering{f.full ? " · six stations" : ""}</p>
                </div>
                <span className="mc-format-price">{f.price}</span>
              </Reveal>
            ))}
          </ul>
        </section>

        <section className="mc-section mc-pricing" id="mc-pricing" aria-labelledby="mc-pricing-title">
          <Reveal className="mc-head">
            <p className="mc-eyebrow">Pricing</p>
            <h2 id="mc-pricing-title">Pay for the practice you use.</h2>
            <p className="mc-sub">No subscription. The solo studio is always free.</p>
          </Reveal>
          <div className="mc-plans">
            {MEDICINE_LANDING_PRICES.map((p) => (
              <Reveal as="article" key={p.id} className={p.id === "full" ? "mc-plan mc-plan-best" : "mc-plan"}>
                <h3>{p.name}</h3>
                <p className="mc-plan-price">{p.price}</p>
                <p className="mc-plan-unit">{p.unit}</p>
                <p>{p.detail}</p>
                <a className={p.id === "full" ? "mc-btn" : "mc-btn mc-btn-quiet"} href="/auth?mode=medicine">
                  {p.id === "free" ? "Start free" : "Get started"}
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mc-section" aria-labelledby="mc-principles-title">
          <Reveal className="mc-head">
            <p className="mc-eyebrow">Honest by design</p>
            <h2 id="mc-principles-title">What we promise, and what we don't.</h2>
          </Reveal>
          <dl className="mc-principles">
            {PRINCIPLES.map(([title, text]) => (
              <Reveal key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </Reveal>
            ))}
          </dl>
        </section>

        <section className="mc-section mc-faq" id="mc-faq" aria-labelledby="mc-faq-title">
          <Reveal className="mc-head">
            <p className="mc-eyebrow">Before you begin</p>
            <h2 id="mc-faq-title">Questions.</h2>
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

        <section className="mc-closing">
          <Reveal>
            <h2>
              Start with a <em>free</em> ethics station.
            </h2>
            <a className="mc-btn" href="/auth?mode=medicine">Try the ethics station <ArrowRight size={17} aria-hidden /></a>
          </Reveal>
        </section>
      </main>

      <footer className="mc-footer">
        <span>MMI Practice</span>
        <span>Independent practice. Not affiliated with or endorsed by any university.</span>
      </footer>
    </div>
  );
}
