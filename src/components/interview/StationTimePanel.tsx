import { Clock3, Volume2, VolumeX } from "lucide-react";
import type { StationClockState } from "@/interview/engine/stationClock";

export function StationTimePanel({
  clock,
  progress,
  onBeginResponse,
  soundEnabled,
  onToggleSound,
}: {
  clock: StationClockState;
  progress: string;
  onBeginResponse: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  const reading = clock.phase === "prep";
  const finalMinute =
    !reading && clock.secondsRemaining <= 60 && clock.secondsRemaining > 0;
  const time = `${Math.floor(clock.secondsRemaining / 60)}:${String(clock.secondsRemaining % 60).padStart(2, "0")}`;
  const announcement = reading
    ? "Reading time. Read the station brief before answering."
    : clock.expired
      ? "Station time is up. Moving on…"
      : finalMinute
        ? "Final minute. Finish your key point."
        : "Answer time. You can begin.";
  return (
    <section
      aria-label="Station timer"
      className={`fixed inset-x-0 top-0 z-40 border-b bg-background shadow-md pt-[env(safe-area-inset-top)] ${finalMinute ? "border-amber-500" : "border-primary/30"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">
            {progress}
          </p>
          <div className="flex items-center gap-2">
            <Clock3
              aria-hidden="true"
              className={`h-5 w-5 ${finalMinute ? "text-amber-600" : "text-primary"}`}
            />
            <span
              role="timer"
              aria-live="off"
              aria-label={`${reading ? "Reading time" : "Answer time"} ${time}`}
              className="font-mono text-3xl font-bold leading-tight tabular-nums"
            >
              {time}
            </span>
            <span className="text-xs font-semibold">
              {reading
                ? "Read the brief"
                : clock.expired
                  ? "Time up"
                  : finalMinute
                    ? "Final minute"
                    : "Answer time"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {reading && (
            <button
              onClick={onBeginResponse}
              className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              I’m ready
            </button>
          )}
          <button
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={
              soundEnabled ? "Mute timer sounds" : "Enable timer sounds"
            }
            title={soundEnabled ? "Timer sounds on" : "Timer sounds off"}
            className="flex h-11 w-11 items-center justify-center rounded-lg border hover:bg-muted"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="sr-only">Timer sounds</span>
          </button>
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`px-4 pb-2 text-center text-xs ${finalMinute ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}
      >
        {announcement}
      </p>
      <div aria-hidden="true" className="h-1 bg-muted">
        <div
          className={`h-full ${finalMinute ? "bg-amber-500" : "bg-primary"}`}
          style={{
            width: `${clock.totalSeconds > 0 ? Math.max(0, Math.min(100, (clock.secondsRemaining / clock.totalSeconds) * 100)) : 0}%`,
          }}
        />
      </div>
    </section>
  );
}
