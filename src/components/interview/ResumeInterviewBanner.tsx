import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPES, type InterviewType } from "@/config/interviewTypes";
import { useResumableInterview } from "@/hooks/useResumableInterview";
import { SessionService } from "@/services/SessionService";

/**
 * Offers to rejoin an interview that is still open (for example after a refresh). Rejoining
 * reconnects to the same session, so nothing is charged again and Clara recaps where it left off.
 */
export function ResumeInterviewBanner({
  onRejoin,
  enabled = true,
}: {
  onRejoin: (type: InterviewType, session: { id: string; reference: string }) => void;
  enabled?: boolean;
}) {
  const { data: open } = useResumableInterview(enabled);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const type = open ? INTERVIEW_TYPES[open.interviewType] : undefined;
  if (!open || !type || !enabled) return null;

  async function end() {
    setBusy(true);
    try {
      await SessionService.endSession(open!.id, "abandoned");
    } finally {
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["resumable-interview"] });
    }
  }

  return (
    <div role="region" aria-label="Interview in progress"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-primary/40 bg-card p-4 text-card-foreground shadow-2xl sm:bottom-6">
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{open.finished ? `Your ${type.name} finished` : `Your ${type.name} is still open`}</p>
        <p className="text-sm text-muted-foreground">
          {open.finished ? "Open it to see the transcript and get your feedback." : "Rejoin to carry on where you left off. Your answers so far are saved."}
        </p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button variant="ghost" disabled={busy} onClick={() => void end()} className="flex-1 sm:flex-none">End it</Button>
        <Button disabled={busy} onClick={() => onRejoin(type, { id: open.id, reference: open.reference })} className="flex-1 gap-2 sm:flex-none">
          <Play className="h-4 w-4" aria-hidden /> {open.finished ? "Open" : "Rejoin"}
        </Button>
      </div>
    </div>
  );
}
