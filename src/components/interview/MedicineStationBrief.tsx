import { FileText } from "lucide-react";
import { censorTranscript } from "@/interview/shared/transcript";

/** Only the server's public exercise reaches this panel; actor notes stay private. */
export function MedicineStationBrief({ prompt }: { prompt: string }) {
  return (
    <section
      className="tile min-w-0 border border-primary/25 p-5"
      aria-label="Candidate brief"
    >
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <FileText className="h-4 w-4" aria-hidden="true" />
        Candidate brief
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Keep this scenario to hand as you answer. You can ask Clara to repeat
        the task.
      </p>
      <p className="whitespace-pre-line break-words text-sm leading-relaxed">
        {censorTranscript(prompt)}
      </p>
    </section>
  );
}
