import React from "react";
import {
  censorFeedback,
  censorTranscript,
} from "@/interview/shared/transcript";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Annotation } from "@/types/interview";
import { ANNOTATION_STYLES, ANNOTATION_LEGEND } from "@/constants/feedback";
import { usePreviewFeature } from "@/lib/previewFeatures";

/** Speaker blocks preserve multi-paragraph answers and the server's original quote offsets. */
export const AnnotatedTranscript: React.FC<{
  transcript: string;
  annotations: Annotation[];
  /** Message-bubble layout; defaults to the 'chat-transcript' preview setting. */
  chat?: boolean;
}> = ({ transcript: input, annotations: raw, chat: chatProp }) => {
  const chatPreview = usePreviewFeature("chat-transcript");
  const chat = chatProp ?? chatPreview;
  const transcript = censorTranscript(input);
  const annotations = censorFeedback(raw ?? []);
  const labels = [...transcript.matchAll(/^(Student|Interviewer):[ \t]*/gm)];
  const blocks = labels.map((label, index) => ({
    start: label.index!,
    end: labels[index + 1]?.index ?? transcript.length,
    contentStart: label.index! + label[0].length,
    student: label[1] === "Student",
  }));
  if (!blocks.length || blocks[0].start > 0)
    blocks.unshift({
      start: 0,
      end: blocks[0]?.start ?? transcript.length,
      contentStart: 0,
      student: false,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        {ANNOTATION_LEGEND.filter((item) =>
          annotations.some((a) => a.category === item.category),
        ).map(({ category, label, colorClass }) => (
          <span key={category} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${colorClass}`} />
            {label}
          </span>
        ))}
        {!!annotations.length && (
          <span className="text-xs text-muted-foreground">
            Select a highlight to see its feedback.
          </span>
        )}
      </div>
      <div className={chat ? "flex flex-col gap-3 text-sm leading-relaxed" : "space-y-3 text-sm leading-relaxed text-foreground/90"}>
        {blocks.map((block) => {
          const spans = block.student
            ? annotations
                .flatMap((annotation) => {
                  if (
                    !annotation.quote?.trim() ||
                    !ANNOTATION_STYLES[annotation.category]
                  )
                    return [];
                  const start =
                    typeof annotation.start === "number"
                      ? annotation.start
                      : transcript.indexOf(
                          annotation.quote,
                          block.contentStart,
                        );
                  const end = start + annotation.quote.length;
                  if (
                    start < block.contentStart ||
                    end > block.end ||
                    transcript.slice(start, end) !== annotation.quote
                  )
                    return [];
                  return [{ start, end, annotation }];
                })
                .sort((a, b) => a.start - b.start || b.end - a.end)
            : [];
          const nodes: React.ReactNode[] = [];
          // Bubbles name the speaker, so the "Student:" / "Interviewer:" prefix is not repeated.
          let position = chat ? block.contentStart : block.start;
          for (const { start, end, annotation } of spans) {
            if (start < position) continue;
            nodes.push(transcript.slice(position, start));
            nodes.push(
              <Popover key={start}>
                <PopoverTrigger asChild>
                  {/* A span, unlike a button, wraps inside the sentence instead of jumping to its own line. */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Feedback on: ${annotation.quote}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    className={`${ANNOTATION_STYLES[annotation.category]} inline cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
                  >
                    {transcript.slice(start, end)}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  className="max-w-[min(20rem,90vw)] text-sm"
                  align="start"
                >
                  <p className="mb-2 font-semibold capitalize">
                    {annotation.category === "development"
                      ? "Even better if"
                      : annotation.category}
                  </p>
                  <p>{annotation.explanation}</p>
                  {annotation.suggestion && (
                    <p className="mt-2 text-muted-foreground">
                      {annotation.suggestion}
                    </p>
                  )}
                </PopoverContent>
              </Popover>,
            );
            position = end;
          }
          nodes.push(transcript.slice(position, block.end).trimEnd());
          if (chat)
            return (
              <div key={block.start} className={`flex max-w-[85%] flex-col gap-1 ${block.student ? "self-end items-end" : "self-start items-start"}`}>
                <span className="px-1 text-xs font-medium text-muted-foreground">{block.student ? "You" : "Interviewer"}</span>
                <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${block.student ? "rounded-br-md bg-primary/15 text-foreground" : "rounded-bl-md bg-muted text-foreground"}`}>
                  {nodes}
                </div>
              </div>
            );
          return (
            <div
              key={block.start}
              className={
                block.student
                  ? "whitespace-pre-wrap rounded-xl border bg-muted/50 px-4 py-3 sm:ml-4"
                  : "whitespace-pre-wrap py-1"
              }
            >
              {nodes}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AnnotatedTranscript;
