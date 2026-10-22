import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { labApi, type LabNote } from "@/lib/interviewLab";

/** Rating and notes for one lab test interview; saved per administrator and session. */
export function LabNoteEditor({
  ownerId, sessionReference, interviewType, version, draftId, existing, onSaved, disabledReason,
}: {
  ownerId: string;
  sessionReference: string | null;
  interviewType: string;
  version: string;
  draftId?: string | null;
  existing?: LabNote | null;
  onSaved?: (note: LabNote) => void;
  disabledReason?: string;
}) {
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    setRating(existing?.rating ?? null);
    setNotes(existing?.notes ?? "");
    setStatus("idle");
  }, [existing?.id, sessionReference]); // eslint-disable-line react-hooks/exhaustive-deps
  const readOnly = !!existing && existing.owner_id !== ownerId;
  async function save() {
    if (!sessionReference) return;
    setStatus("saving");
    setError("");
    try {
      const saved = await labApi.saveNote({ owner_id: ownerId, session_reference: sessionReference, interview_type: interviewType, version, draft_id: draftId, rating, notes });
      setStatus("saved");
      onSaved?.(saved);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Notes could not be saved");
    }
  }
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} out of 5`}
            disabled={readOnly}
            onClick={() => { setRating(rating === n ? null : n); setStatus("idle"); }}
            className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={`h-5 w-5 ${rating !== null && n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} aria-hidden />
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{rating ? `${rating}/5` : "No rating"}</span>
      </div>
      <Textarea
        aria-label="Notes"
        value={notes}
        maxLength={5000}
        disabled={readOnly}
        onChange={(e) => { setNotes(e.target.value); setStatus("idle"); }}
        placeholder="What worked? What felt off? Exact lines worth keeping or changing…"
        rows={5}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={() => void save()} disabled={readOnly || !sessionReference || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save notes"}
        </Button>
        <span role="status" className="text-xs text-muted-foreground">
          {readOnly ? "Notes by another administrator (read only)."
            : !sessionReference ? disabledReason ?? "Start the interview to attach notes."
            : status === "saved" ? "Saved." : status === "error" ? error : ""}
        </span>
      </div>
    </div>
  );
}
