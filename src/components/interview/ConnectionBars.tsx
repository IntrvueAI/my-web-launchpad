import { LEVEL_LABEL, type ConnectionLevel } from "@/lib/callQuality";

const FILLED: Record<ConnectionLevel, number> = { strong: 4, ok: 3, weak: 1, offline: 0, unknown: 0 };
const TONE: Record<ConnectionLevel, string> = {
  strong: "bg-success", ok: "bg-warning", weak: "bg-destructive", offline: "bg-destructive", unknown: "bg-muted-foreground/50",
};

/** Signal-strength bars for the live connection to Clara, with the numbers in a tooltip. */
export function ConnectionBars({ level, details }: {
  level: ConnectionLevel;
  details: { rttMs: number | null; lossPercent: number | null; fps: number | null };
}) {
  const filled = FILLED[level];
  const facts = [
    details.rttMs !== null ? `${details.rttMs} ms round trip` : null,
    details.lossPercent !== null ? `${details.lossPercent}% packet loss` : null,
    details.fps !== null ? `${Math.round(details.fps)} fps video` : null,
  ].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground" role="status" title={facts || undefined}
      aria-label={`${LEVEL_LABEL[level]}${facts ? `: ${facts}` : ""}`}>
      <span className="flex h-3.5 shrink-0 items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={`w-[3px] rounded-sm ${bar <= filled ? TONE[level] : "bg-muted-foreground/25"} ${level === "unknown" ? "animate-pulse" : ""}`}
            style={{ height: `${bar * 25}%` }} />
        ))}
      </span>
      {LEVEL_LABEL[level]}
    </span>
  );
}
