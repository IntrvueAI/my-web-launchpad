import { AlertCircle, Loader2, Wifi } from "lucide-react";
interface InterviewStatusProps {
  isConnected: boolean;
  isStreaming: boolean;
  sessionStatus: "idle" | "connecting" | "connected" | "streaming" | "error";
  error?: string | null;
}
export function InterviewStatus({
  isConnected,
  isStreaming,
  sessionStatus,
  error,
}: InterviewStatusProps) {
  if (error)
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{error}</p>
      </div>
    );
  return (
    <div
      role="status"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      {sessionStatus === "connecting" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wifi className="h-4 w-4" />
      )}
      <span>
        {sessionStatus === "connecting"
          ? "Connecting to Clara…"
          : isStreaming
            ? "Connected · your interview is live"
            : isConnected
              ? "Connected · ready to begin"
              : "Ready when you are"}
      </span>
    </div>
  );
}
