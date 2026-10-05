import { useState } from "react";
import { ArrowRight, PencilLine } from "lucide-react";
import type { AnswerCoaching } from "@/types/interview";
import { getMedicinePractice } from "@/interview/subjects/medicine/practiceModes";

const STRUCTURES: Record<string, string[]> = {
  "medicine-ethics-practice": [
    "Name the decision and the people affected.",
    "Explain the competing considerations using details from this scenario.",
    "State a proportionate next step, what you need to clarify and when you would seek support.",
  ],
  "medicine-roleplay-practice": [
    "Acknowledge the person’s concern without assuming how they feel.",
    "Ask one open question, then respond to what they actually tell you.",
    "Agree a realistic next step within your role and check it addresses their concern.",
  ],
  "medicine-motivation-practice": [
    "Make one clear point about your motivation or learning.",
    "Support it with a real example: your own action and what happened.",
    "Reflect on what changed in your thinking and why it matters for medicine.",
  ],
  "medicine-data-practice": [
    "Describe the relevant pattern, using the supplied figures and units.",
    "Explain what it supports, then test another explanation or limitation.",
    "Give a cautious conclusion and name the extra evidence you would need.",
  ],
};

export function StationAnswerCoach({
  interviewType,
  coaching,
  question,
}: {
  interviewType: string;
  coaching?: AnswerCoaching | null;
  question?: string;
}) {
  const [draft, setDraft] = useState("");
  const [practising, setPractising] = useState(false);
  if (!getMedicinePractice(interviewType)) return null;
  const rewrite = coaching?.original_quote && coaching?.improved_answer;
  const structure = coaching?.structure?.length
    ? coaching.structure
    : STRUCTURES[interviewType];
  return (
    <section
      aria-label="Improve this station answer"
      className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-7"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Your next attempt
      </p>
      <h3 className="mt-2 font-display text-xl font-semibold">
        {rewrite
          ? "Make this answer stronger"
          : "Build your answer, step by step"}
      </h3>
      {question && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            The question you practised
          </summary>
          <p className="mt-2 whitespace-pre-line">{question}</p>
        </details>
      )}
      {rewrite ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <h4 className="text-xs font-semibold text-muted-foreground">
                You said
              </h4>
              <blockquote className="mt-2 text-sm leading-relaxed">
                “{coaching.original_quote}”
              </blockquote>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ArrowRight size={14} />A possible stronger version
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                {coaching.improved_answer}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            <strong>Why it helps: </strong>
            {coaching.why}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            AI coaching, not an official model answer. Keep it in your own words
            and use only experiences that are true for you.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {coaching?.structure?.length
            ? "Use this structure for your next attempt. Add details from your own experience and keep the answer in your own words."
            : "Use this structure for the question you just practised. There isn’t a verified personal rewrite for this result."}
        </p>
      )}
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {structure?.map((step, i) => (
          <li key={i} className="rounded-xl border p-3 text-sm leading-relaxed">
            <span className="mb-2 block text-xs font-bold text-primary">
              0{i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <button
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold hover:bg-muted"
        aria-expanded={practising}
        onClick={() => setPractising((v) => !v)}
      >
        <PencilLine size={16} />
        {practising ? "Close practice pad" : "Try it in your own words"}
      </button>
      {practising && (
        <div className="mt-3">
          <label htmlFor="coaching-retry" className="block text-sm font-medium">
            Rewrite your opening or next response
          </label>
          <textarea
            id="coaching-retry"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2500}
            className="mt-2 min-h-32 w-full rounded-xl border bg-background p-3 text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Private practice pad · not scored or saved. Compare your reasoning
            with the guidance above.
          </p>
        </div>
      )}
    </section>
  );
}
