import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, CheckCircle2, Target } from "lucide-react";
import {
  getInterviewTypeConfig,
  INTERVIEW_TYPES,
} from "@/config/interviewTypes";
import type { FeedbackData, InterviewType } from "@/types/interview";
import {
  censorFeedback,
  censorTranscript,
} from "@/interview/shared/transcript";
import { AnnotatedTranscript } from "@/components/AnnotatedTranscript";
import { conciseFeedback } from "@/utils/feedbackSummary";

export interface ReviewItem {
  index: number;
  topic: string;
  question: string;
  outcome: string;
  skipped: boolean;
  your_answer?: string;
  note?: string;
}
export type SummaryFeedback = FeedbackData & {
  questions_review?: ReviewItem[];
};

export function FeedbackSummary({
  feedback: input,
  interviewType = "11-plus",
  isLoading = false,
}: {
  feedback: SummaryFeedback;
  interviewType?: string;
  isLoading?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  if (isLoading)
    return (
      <div className="rounded-2xl border bg-card p-6" role="status">
        Reviewing your answers and preparing your next step…
      </div>
    );
  const feedback = censorFeedback(input);
  const config = getInterviewTypeConfig(interviewType as InterviewType);
  const detail = feedback.detailed_feedback ?? {};
  const sections = config.sections;
  const summary = conciseFeedback(feedback, sections);
  const medicine = interviewType.startsWith("medicine-");
  const title = INTERVIEW_TYPES[interviewType]?.name ?? config.name;
  function download() {
    const url = URL.createObjectURL(
      new Blob([censorTranscript(feedback.transcription ?? "")], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${interviewType}-transcript.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="feedback-summary space-y-5 text-foreground"
      aria-label="Interview feedback"
    >
      <header className="flex flex-col items-start gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:justify-between sm:p-7">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Your Interview Feedback
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {summary.overview}
          </p>
        </div>
        <div
          className="rounded-2xl bg-primary/10 px-5 py-4 text-center"
          aria-label={`Practice score ${feedback.total_score} out of ${config.maxTotalScore}`}
        >
          <strong className="text-4xl tabular-nums">
            {feedback.total_score}
          </strong>
          <span className="text-muted-foreground">/{config.maxTotalScore}</span>
          <p className="mt-1 text-xs font-medium">Practice score</p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Keep doing
          </h3>
          <p className="mt-3 text-sm leading-relaxed">{summary.strength}</p>
        </article>
        <article className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Try next
          </h3>
          <p className="mt-3 text-sm leading-relaxed">{summary.nextStep}</p>
          <Link
            to={`${medicine ? "/medicine/examples" : "/examples"}?interview=${encodeURIComponent(interviewType)}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            {medicine ? "See MMI worked answers" : "See worked answers"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Your skills</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a skill for its evidence and next step.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sections.map((section) => {
            const score = feedback[section.scoreField];
            const assessed = typeof score === "number";
            const text = (detail as Record<string, string>)[
              section.feedbackField
            ];
            const open = activeSection === section.id;
            return (
              <div key={section.id} className="min-w-0 rounded-xl border">
                <button
                  className="w-full rounded-xl p-4 text-left hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => setActiveSection(open ? null : section.id)}
                  aria-expanded={open}
                >
                  <span className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-medium">{section.title}</span>
                    <span className="shrink-0 tabular-nums">
                      {assessed ? `${score}/${config.maxSectionScore}` : "—"}
                    </span>
                  </span>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${assessed ? Math.max(0, Math.min(100, (score / config.maxSectionScore) * 100)) : 0}%`,
                      }}
                    />
                  </span>
                </button>
                {open && (
                  <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {text ||
                      "There is not enough evidence to assess this skill yet."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {medicine && (
          <p className="mt-4 text-xs text-muted-foreground">
            This score reflects this session’s evidence. It is a practice
            rubric, not a university mark or admission prediction.
          </p>
        )}
      </div>
      {!!feedback.questions_review?.length && (
        <details className="rounded-2xl border bg-card p-5">
          <summary className="cursor-pointer font-semibold">
            Review your {medicine ? "stations" : "questions"} ·{" "}
            {feedback.questions_review.length}
          </summary>
          <div className="mt-4 space-y-3">
            {feedback.questions_review.map((review, index) => (
              <details
                key={`${review.index}-${index}`}
                className="rounded-xl border p-4"
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {index + 1}. {review.topic?.replace(/-/g, " ")}
                  {review.skipped ? " · Skipped" : ""}
                </summary>
                <p className="mt-3 text-sm">{review.question}</p>
                {review.your_answer && (
                  <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                    {review.your_answer}
                  </blockquote>
                )}
                {review.note && <p className="mt-3 text-sm">{review.note}</p>}
              </details>
            ))}
          </div>
        </details>
      )}
      {feedback.transcription && (
        <details className="rounded-2xl border bg-card p-5">
          <summary className="cursor-pointer font-semibold">
            Transcript & highlighted moments
          </summary>
          <button
            onClick={download}
            className="my-4 inline-flex items-center gap-2 text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            Download transcript
          </button>
          <AnnotatedTranscript
            transcript={feedback.transcription}
            annotations={feedback.annotations ?? []}
          />
        </details>
      )}
      {feedback.overall_improvement_feedback && (
        <details className="rounded-2xl border bg-card p-5">
          <summary className="cursor-pointer font-semibold">
            Full improvement notes
          </summary>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
            {feedback.overall_improvement_feedback}
          </p>
        </details>
      )}
    </section>
  );
}
