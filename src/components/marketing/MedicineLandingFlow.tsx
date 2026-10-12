import { useEffect, useRef, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MEDICINE_FONTS_HREF } from "@/components/medicine-dashboard/MedicineTheme";
import { MEDICINE_LANDING_FAQS, MEDICINE_LANDING_FORMATS } from "./medicineLandingContent";
import claraShot from "@/assets/landing-hero-shot.png";
import "./medicine-landing-flow.css";

const TICKER = [
  "Ethics & judgement",
  "Communication roleplays",
  "Motivation & reflection",
  "Data & prioritisation",
  "Six-station MMI circuit",
  "One minute to read",
  "Follow-ups that build on your answer",
  "Written feedback with evidence",
];

const PATHS = [
  { label: "Solo studio", title: "Start on your own", text: "Read a prompt, answer aloud or in writing, and compare with a review guide. No account needed.", href: "/medicine/practice", cta: "Open the studio" },
  { label: "Mini interview", title: "One station, seven minutes", text: "A focused station on ethics, communication, motivation or data, with a live interviewer.", href: "/auth?mode=medicine", cta: "Choose a station" },
  { label: "Full MMI", title: "The complete circuit", text: "Six stations in a row, each with reading time, a spoken answer and follow-up questions.", href: "/auth?mode=medicine", cta: "Plan a full mock" },
];

const STATION = [
  { n: "01", title: "Read the brief", text: "One minute to read. The brief stays on screen while you answer." },
  { n: "02", title: "Answer out loud", text: "Up to five minutes to talk it through. Prefer to type? You can." },
  { n: "03", title: "Follow-ups that listen", text: "Clara responds to the point you actually made. Roleplay characters stay in role." },
  { n: "04", title: "Feedback with evidence", text: "Each score is tied to a quote from your answer. Anything unassessed is labelled, never guessed." },
];

const PRINCIPLES = [
  { title: "Original questions", text: "Practice material for transferable MMI skills, not real university questions." },
  { title: "Independent", text: "Not affiliated with or endorsed by any university." },
  { title: "Your audio, your tab", text: "Solo studio recordings stay in your browser tab unless you download them." },
  { title: "Practice, not prediction", text: "Feedback helps you improve. It is not an admissions result." },
];

/** Fades content up as it scrolls into view; visible immediately without IntersectionObserver. */
function Reveal({ children, as: Tag = "div", className = "" }: { children: ReactNode; as?: "div" | "section" | "article" | "li"; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as never} className={`mlf-reveal ${className}`}>{children}</Tag>;
}

export function MedicineLandingFlow() {
  useEffect(() => {
    if (document.getElementById("medicine-identity-fonts")) return;
    const link = document.createElement("link");
    link.id = "medicine-identity-fonts";
    link.rel = "stylesheet";
    link.href = MEDICINE_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  return (
    <div className="mlf">
      <header className="mlf-nav">
        <a className="mlf-brand" href="/medicine"><span aria-hidden />MMI Practice</a>
        <nav aria-label="Page sections">
          <a href="#mlf-paths">Ways to practise</a>
          <a href="#mlf-station">Inside a station</a>
          <a href="#mlf-faq">Questions</a>
        </nav>
        <div className="mlf-nav-actions">
          <a href="/auth?mode=medicine">Log in</a>
          <a className="mlf-btn mlf-btn-sm" href="/auth?mode=medicine">Start free</a>
        </div>
      </header>

      <main>
        <section className="mlf-hero">
          <div className="mlf-glow" aria-hidden />
          <Reveal className="mlf-hero-copy">
            <p className="mlf-label">MMI PRACTICE · FOR FUTURE DOCTORS</p>
            <h1>Practise the interview before it counts.</h1>
            <p className="mlf-lede">
              Live MMI stations with Clara, an AI interviewer who listens to your answer and asks a follow-up built on it.
              Then written feedback grounded in what you actually said.
            </p>
            <div className="mlf-actions">
              <a className="mlf-btn" href="/auth?mode=medicine">Start a free mini interview <ArrowRight size={17} aria-hidden /></a>
              <a className="mlf-btn-ghost" href="/medicine/practice">Try the solo studio</a>
            </div>
            <p className="mlf-note">Medicine interviews are free during early access.</p>
          </Reveal>
          <Reveal className="mlf-call">
            <div className="mlf-call-frame">
              <img src={claraShot} alt="Clara, the AI practice interviewer, on a video call" />
              <span className="mlf-chip mlf-chip-live"><i aria-hidden />Live practice</span>
              <div className="mlf-call-bar" aria-hidden>
                <span>Station 1 of 6 · Ethics</span>
                <span className="mlf-mono">READING 0:47</span>
              </div>
            </div>
            <p className="mlf-caption">Illustration of the interview screen.</p>
          </Reveal>
        </section>

        <div className="mlf-ticker" aria-label="What you can practise">
          <ul className="mlf-ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <li key={i} aria-hidden={i >= TICKER.length || undefined}>{t}</li>
            ))}
          </ul>
        </div>

        <section className="mlf-section" id="mlf-paths">
          <Reveal className="mlf-head">
            <p className="mlf-label">THREE WAYS IN</p>
            <h2>Start where you are.</h2>
            <p className="mlf-sub">Warm up alone, focus on one station, or run the whole circuit. Same preparation, different depth.</p>
          </Reveal>
          <div className="mlf-grid mlf-grid-3">
            {PATHS.map((p) => (
              <Reveal as="article" className="mlf-card" key={p.label}>
                <p className="mlf-label">{p.label.toUpperCase()}</p>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <a className="mlf-link" href={p.href}>{p.cta} <ArrowUpRight size={15} aria-hidden /></a>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mlf-section mlf-band" id="mlf-station">
          <Reveal className="mlf-head">
            <p className="mlf-label">INSIDE A STATION</p>
            <h2>Read. Respond. Get challenged.</h2>
            <p className="mlf-sub">Every station runs the same way, so you can focus on your thinking rather than the format.</p>
          </Reveal>
          <div className="mlf-grid mlf-grid-4">
            {STATION.map((s) => (
              <Reveal as="article" className="mlf-tile" key={s.n}>
                <span className="mlf-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mlf-section">
          <Reveal className="mlf-head">
            <p className="mlf-label">LIVE FORMATS</p>
            <h2>Pick a station. Or all of them.</h2>
          </Reveal>
          <ol className="mlf-formats">
            {MEDICINE_LANDING_FORMATS.map((f, i) => (
              <Reveal as="li" key={f.id} className="mlf-format">
                  <span className="mlf-num">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{f.name}</h3>
                    <p>{f.kind} · {f.readingMinutes} min reading · {f.answerMinutes} min per station</p>
                  </div>
                  <span className="mlf-price">{f.price}</span>
                  <a className="mlf-link" href={f.href} aria-label={`Start ${f.name}`}>Start <ArrowRight size={15} aria-hidden /></a>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="mlf-section mlf-band">
          <Reveal className="mlf-head">
            <p className="mlf-label">HONEST BY DESIGN</p>
            <h2>Preparation you can trust.</h2>
          </Reveal>
          <div className="mlf-grid mlf-grid-4">
            {PRINCIPLES.map((p) => (
              <Reveal as="article" className="mlf-principle" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mlf-section mlf-faq" id="mlf-faq">
          <Reveal className="mlf-head">
            <p className="mlf-label">BEFORE YOU BEGIN</p>
            <h2>Good questions.</h2>
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

        <section className="mlf-closing">
          <div className="mlf-glow mlf-glow-low" aria-hidden />
          <Reveal>
            <h2>Your next answer starts here.</h2>
            <div className="mlf-actions mlf-actions-center">
              <a className="mlf-btn" href="/auth?mode=medicine">Start a free mini interview <ArrowRight size={17} aria-hidden /></a>
              <a className="mlf-btn-ghost" href="/medicine/practice">Try the solo studio</a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mlf-footer">
        <span>MMI Practice</span>
        <span>Independent practice. Not affiliated with or endorsed by any university.</span>
      </footer>
    </div>
  );
}
