import { siteName } from '@/lib/site';
import { medicinePriceTag } from "@/config/medicinePricing";
import {
  ArrowRight,
  Check,
  Clock3,
  MessageSquare,
  Mic,
  Stethoscope,
  Bookmark,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { INTERVIEW_TYPES, MEDICINE_LIVE_INTERVIEW_IDS } from "@/config/interviewTypes";
import { MedicineWarmup } from "./MedicineWarmup";
import { MEDICINE_LANDING_FAQS as faqs } from "./medicineLandingContent";
import "./medicine-landing-clinical.css";

const modes = MEDICINE_LIVE_INTERVIEW_IDS.map(id=>INTERVIEW_TYPES[id]);
const paths = [
  {
    name: "Build my confidence",
    focus: "motivation-reflection",
    title: "Start with your own experience.",
    text: "Practise explaining what you noticed, what you learned, and why medicine matters to you.",
  },
  {
    name: "Sharpen my reasoning",
    focus: "data-interpretation",
    title: "Make your thinking visible.",
    text: "Work through evidence, question an assumption and explain what would change your view.",
  },
  {
    name: "Explore a difficult decision",
    focus: "ethics-scenarios",
    title: "Think beyond a quick answer.",
    text: "Consider the people affected, competing priorities, and a practical next step you can justify.",
  },
];
export function MedicineLandingClinical() {
  const [path, setPath] = useState(0);
  return (
    <div className="med-landing">
      <header className="med-landing-nav">
        <a className="med-wordmark" href="/medicine">
          <span className="med-logo-mark">
            <Stethoscope size={19} />
          </span>
          {siteName()}
        </a>
        <nav aria-label="Medicine landing">
          <a href="#how-it-works">Your practice routine</a>
          <a href="#formats">Live interviews</a>
          <a href="#medicine-faq">Questions</a>
        </nav>
        <div>
          <a href="/auth?mode=medicine">Log in</a>
          <a className="med-landing-primary" href="/medicine/practice">
            Try it free <ArrowRight size={15} />
          </a>
        </div>
      </header>
      <main>
        <section className="med-landing-hero">
          <div>
            <span className="med-landing-eyebrow">
              A PRACTICE SPACE FOR FUTURE DOCTORS
            </span>
            <h1>
              Find your words.
              <br />
              Trust your thinking.
            </h1>
            <p>
              The question lands. Your mind goes blank. Start here: one prompt,
              a little space to think, and a clearer next attempt.
            </p>
            <div className="med-landing-actions">
              <a className="med-landing-primary" href="/medicine/practice">
                Enter the free practice studio <ArrowRight size={17} />
              </a>
              <a className="med-landing-secondary" href="#formats">
                Explore live interviews
              </a>
            </div>
            <p className="med-landing-hero-note">
              No account or card needed for solo practice.
            </p>
            <div className="med-landing-proof">
              <div>
                <strong>Your pace</strong>
                <span>timed or untimed</span>
              </div>
              <div>
                <strong>Your voice</strong>
                <span>private audio playback</span>
              </div>
              <div>
                <strong>Your plan</strong>
                <span>a useful reason to return</span>
              </div>
            </div>
          </div>
          <MedicineWarmup />
        </section>
        <section className="med-landing-section" id="how-it-works">
          <span className="med-landing-eyebrow">
            SMALL SESSIONS. INTENTIONAL PRACTICE.
          </span>
          <h2>A routine you can return to.</h2>
          <div className="med-landing-three">
            {[
              {
                n: "01",
                title: "Give it a real attempt",
                text: "Choose a question. Read, think and respond before opening the guide. Type your answer or practise speaking aloud.",
              },
              {
                n: "02",
                title: "Keep one useful insight",
                text: "Listen back if you recorded. Compare your reasoning with the guide. Save one thing you will try next time.",
              },
              {
                n: "03",
                title: "Come back with a purpose",
                text: "Your reflections create a revisit queue. See what you tried last time, then have another go in your own words.",
              },
            ].map((s) => (
              <article key={s.n}>
                <b>{s.n}</b>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="med-landing-section med-landing-paths">
          <div>
            <span className="med-landing-eyebrow">
              MEET YOURSELF WHERE YOU ARE
            </span>
            <h2>What would help today?</h2>
            <div
              className="med-path-options"
              role="group"
              aria-label="Choose your practice focus"
            >
              {paths.map((p, i) => (
                <button
                  aria-pressed={path === i}
                  onClick={() => setPath(i)}
                  key={p.name}
                >
                  {p.name}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </div>
          <article className="med-path-detail">
            <span className="med-landing-eyebrow">YOUR STARTING POINT</span>
            <h3>{paths[path].title}</h3>
            <p>{paths[path].text}</p>
            <ul>
              <li>
                <Clock3 size={16} />
                Set a timer that fits your practice.
              </li>
              <li>
                <Bookmark size={16} />
                Save prompts you want to revisit.
              </li>
              <li>
                <CalendarDays size={16} />
                Build a routine of 3, 5 or 7 days a week.
              </li>
            </ul>
            <a
              className="med-landing-primary"
              href={`/medicine/practice?skill=${paths[path].focus}`}
            >
              Find my first prompt <ArrowRight size={17} />
            </a>
          </article>
        </section>
        <section
          className="med-landing-section med-landing-formats"
          id="formats"
        >
          <div>
            <span className="med-landing-eyebrow">
              WHEN YOU’RE READY FOR A CONVERSATION
            </span>
            <h2>
              Take your thinking
              <br />
              into a live interview.
            </h2>
            <p>
              Practise a spoken circuit with Clara, respond to follow-ups, and
              review AI-generated written feedback. Choose a full MMI or a
              seven-minute mini interview.
            </p>
            <p>
              These are original practice questions, not a reproduction of real
              admissions questions. Build the skills shared across MMI interviews.
            </p>
            <a className="med-landing-primary" href="/auth?mode=medicine">
              Explore live practice <ArrowRight size={17} />
            </a>
          </div>
          <div>
            {modes.map((m) => (
              <article key={m.id}>
                <div>
                  <span className="med-landing-eyebrow">
                    {m.id==='medicine-mmi-practice'?'FULL MMI':'7-MINUTE MINI INTERVIEW'}
                  </span>
                  <h3>{m.name.replace("Medicine MMI — ", "")}</h3>
                </div>
                <p>
                  <Clock3 size={16} />
                  {m.timingSeconds!.response / 60} min per station ·{" "}
                  {m.timingSeconds!.prep
                    ? `${m.timingSeconds!.prep / 60} min reading`
                    : "no reading time"}
                </p>
                <p>
                  {medicinePriceTag(m.id) === "Free"
                    ? "Free · no credits required"
                    : `${medicinePriceTag(m.id)} · price shown before starting`}
                </p>
                <a href={`/?medicinePractice=${m.id}`}>
                  {m.id==='medicine-mmi-practice'?'Start full MMI':'Start mini interview'} <ArrowRight size={15}/>
                </a>
              </article>
            ))}
            <p className="med-format-note">
              One consistent MMI format and four focused mini interviews.
              General solo practice is also available.
            </p>
          </div>
        </section>
        <section
          className="med-landing-section med-landing-feedback"
          id="feedback"
        >
          <div>
            <span className="med-landing-eyebrow">
              FROM “I SHOULD PRACTISE” TO “I KNOW WHAT’S NEXT”
            </span>
            <h2>
              Make the next attempt
              <br />
              more deliberate.
            </h2>
            <p>
              Keep track of your own reflections in the studio. For live
              interviews, use written AI feedback to examine your reasoning,
              communication and professional judgement.
            </p>
            <ul>
              {[
                "Ground your answer in a specific example.",
                "Explain the trade-off, then justify your position.",
                "Show how new information changes your thinking.",
              ].map((t) => (
                <li key={t}>
                  <Check size={17} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <article className="med-example-feedback">
            <span className="med-landing-eyebrow">
              ILLUSTRATIVE REFLECTION · NOT A STUDENT RESULT
            </span>
            <h3>A clearer next attempt.</h3>
            <div>
              <span>WHAT I NOTICED</span>
              <p>
                I considered more than one perspective, but took too long to
                explain my own choice.
              </p>
            </div>
            <div>
              <span>MY NEXT STEP</span>
              <p>
                Start with a clear position. Then explain the reason, the
                uncertainty and what I would do next.
              </p>
            </div>
            <p className="med-example-note">
              <MessageSquare size={14} /> Your self-reflection stays separate
              from AI interview feedback.
            </p>
          </article>
        </section>
        <section
          className="med-landing-section med-landing-faq"
          id="medicine-faq"
        >
          <div>
            <span className="med-landing-eyebrow">BEFORE YOU BEGIN</span>
            <h2>A few good questions.</h2>
          </div>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="med-landing-closing">
          <div>
            <span className="med-landing-eyebrow">
              ONE PROMPT IS A GOOD START
            </span>
            <h2>
              Your next answer
              <br />
              starts here.
            </h2>
          </div>
          <a href="/medicine/practice">
            <Mic size={19} />
            Try the free practice studio
            <ArrowRight size={17} />
          </a>
        </section>
      </main>
      <footer className="med-landing-footer">
        <span>{siteName()} · Medicine</span>
        <span>
          Independent practice. Not affiliated with or endorsed by the named
          universities.
        </span>
      </footer>
    </div>
  );
}
