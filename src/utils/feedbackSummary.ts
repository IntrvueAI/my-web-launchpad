import type { FeedbackData, InterviewSection } from "@/types/interview";
import { censorTranscript } from '@/interview/shared/transcript';

/** Short excerpts from actual feedback. Never manufacture observed strengths. */
export function shortExcerpt(value: unknown, maxWords = 38): string {
  if (typeof value !== "string") return "";
  const clean = censorTranscript(value.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim());
  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [clean];
  let result = "";
  for (const sentence of sentences) {
    if ((result + sentence).split(/\s+/).length > maxWords) break;
    result += sentence;
    if (result.split(/\s+/).length >= 15) break;
  }
  return (
    result.trim() ||
    clean.split(" ").slice(0, maxWords).join(" ") +
      (clean.split(" ").length > maxWords ? "…" : "")
  );
}
export function conciseFeedback(
  feedback: FeedbackData,
  sections: InterviewSection[],
) {
  const detail = feedback.detailed_feedback ?? {};
  const ranked = sections
    .filter((s) => typeof feedback[s.scoreField] === "number")
    .sort(
      (a, b) => Number(feedback[b.scoreField]) - Number(feedback[a.scoreField]),
    );
  const text = detail as unknown as Record<string, string>;
  const legacyNextStep = feedback.overall_improvement_feedback?.split(/(?:even better if|practise next|practice next|try next)\s*:?/i)[1]?.replace(/^[\s*#-]+/, '');
  return {
    overview:
      shortExcerpt(text.overall) ||
      "Review the evidence from this session and choose one thing to practise next.",
    strength:
      shortExcerpt(text.strength) ||
      shortExcerpt(text[ranked[0]?.feedbackField]) ||
      "Complete an answer so we can identify a specific strength.",
    nextStep:
      shortExcerpt(text.next_step) ||
      shortExcerpt(legacyNextStep) ||
      shortExcerpt(text[ranked.at(-1)?.feedbackField]) ||
      shortExcerpt(feedback.overall_improvement_feedback) ||
      "Try another answer and explain each step of your reasoning.",
  };
}
