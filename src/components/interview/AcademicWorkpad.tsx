import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ReasoningNotes {
  explanation: string;
  evidence: string;
  revision: string;
}
export const emptyReasoningNotes: ReasoningNotes = {
  explanation: "",
  evidence: "",
  revision: "",
};
export function notesAsAnswer(notes: ReasoningNotes): string {
  return [
    notes.explanation.trim() && `My explanation: ${notes.explanation.trim()}`,
    notes.evidence.trim() &&
      `Evidence and assumptions: ${notes.evidence.trim()}`,
    notes.revision.trim() &&
      `What would change my mind: ${notes.revision.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function AcademicWorkpad({
  exercise,
  notes,
  onChange,
  onSubmit,
  disabled,
}: {
  exercise: { id: string; prompt: string; topic: string };
  notes: ReasoningNotes;
  onChange: (notes: ReasoningNotes) => void;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}) {
  const fields = [
    [
      "explanation",
      "Possible explanation",
      "Connect the observation to a scientific mechanism.",
    ],
    [
      "evidence",
      "Evidence and assumptions",
      "What is known? What are you assuming?",
    ],
    [
      "revision",
      "What would change my mind?",
      "Consider an alternative and a way to test it.",
    ],
  ] as const;
  const answer = notesAsAnswer(notes);
  return (
    <Card className="p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
          Current exercise
        </p>
        <h3 className="mt-2 text-sm font-medium leading-relaxed whitespace-pre-wrap">
          {exercise.prompt}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Original practice material. Your reasoning matters more than a
          polished answer.
        </p>
      </div>
      <details>
        <summary className="cursor-pointer font-semibold text-sm py-2">
          Open reasoning pad
        </summary>
        <p className="text-xs text-muted-foreground mb-3">
          Optional notes for this exercise. They stay in this session until you
          choose to send them.
        </p>
        <div className="space-y-3">
          {fields.map(([key, label, hint]) => (
            <div key={key}>
              <label
                htmlFor={`reasoning-${exercise.id}-${key}`}
                className="block text-xs font-semibold mb-1"
              >
                {label}
              </label>
              <textarea
                id={`reasoning-${exercise.id}-${key}`}
                value={notes[key]}
                maxLength={1500}
                rows={3}
                placeholder={hint}
                onChange={(event) =>
                  onChange({ ...notes, [key]: event.target.value })
                }
                className="w-full rounded-lg border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          ))}
          <Button
            className="w-full"
            variant="secondary"
            disabled={disabled || !answer}
            onClick={() => onSubmit(answer)}
          >
            Use notes as my answer
          </Button>
          <p className="text-xs text-muted-foreground">
            Sending adds these notes to your interview transcript.
          </p>
        </div>
      </details>
    </Card>
  );
}
