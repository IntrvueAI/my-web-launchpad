import { Eye, EyeOff, Keyboard, Mic } from "lucide-react";
import { MedicineColourControls } from '@/components/medicine-dashboard/MedicineTheme';

export function InterviewToolbar({
  title,
  live,
  progress,
  timer,
  typeMode,
  pushToTalk,
  hideTranscript,
  microphoneEnabled,
  onTypeMode,
  onPushToTalk,
  onFocus,
  onBeginResponse,
  medicine = false,
}: {
  title: string;
  live: boolean;
  progress?: string;
  timer?: { phase: "prep" | "response"; secondsRemaining: number } | null;
  typeMode: boolean;
  pushToTalk: boolean;
  hideTranscript: boolean;
  microphoneEnabled: boolean;
  onTypeMode: () => void;
  onPushToTalk: () => void;
  onFocus: () => void;
  onBeginResponse?: () => void;
  medicine?: boolean;
}) {
  const seconds = Math.max(0, timer?.secondsRemaining ?? 0);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const button =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10";
  return (
    <header
      className="mb-5 overflow-hidden rounded-2xl border bg-card"
      aria-label="Interview controls"
    >
      <div className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-base font-semibold text-foreground">
            {title}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            />
            {live ? "Live with Clara" : "Your practice session"}
          </p>
        </div>
        {live && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm sm:justify-end">
            <span className="font-medium whitespace-nowrap">{progress}</span>
            {timer && (
              <div
                className="rounded-xl bg-muted px-3 py-2 text-right"
                role="timer"
                aria-label={`${timer.phase === "prep" ? "Reading time" : "Answer time"} ${clock}`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {timer.phase === "prep" ? "Reading time" : "Answer time"}
                </span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {clock}
                </span>
              </div>
            )}
            {timer?.phase === 'prep' && onBeginResponse && <button className={button} onClick={onBeginResponse}>I'm ready · start answering</button>}
          </div>
        )}
        {medicine && !live && <MedicineColourControls />}
      </div>
      {live && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {typeMode
              ? "Keyboard answers · microphone muted"
              : pushToTalk
                ? "Hold the talk button to speak"
                : microphoneEnabled
                  ? "Microphone enabled"
                  : "Microphone muted"}
          </p>
          <div className="flex flex-wrap gap-2">
            {medicine && <MedicineColourControls />}
            <button
              className={button}
              aria-pressed={typeMode}
              onClick={onTypeMode}
              title="Answer by typing instead of talking (mutes the microphone)"
            >
              <Keyboard className="h-4 w-4" />
              Type answers
            </button>
            <button
              className={button}
              aria-pressed={pushToTalk}
              disabled={typeMode}
              onClick={onPushToTalk}
              title="When on, the microphone only listens while you hold the talk button (or hold T)"
            >
              <Mic className="h-4 w-4" />
              Push to talk
            </button>
            <button
              className={button}
              aria-pressed={hideTranscript}
              onClick={onFocus}
            >
              {hideTranscript ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {hideTranscript ? "Show transcript" : "Hide transcript"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
