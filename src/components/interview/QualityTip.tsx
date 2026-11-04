import { Headphones, Keyboard, Mic, Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIPS, type TipKind } from "@/lib/callQuality";

const ICON: Record<TipKind, typeof Wifi> = {
  weak_connection: Wifi, lag_spike: Wifi, slow_reply: Wifi, offline: WifiOff,
  no_audio: Mic, quiet: Mic, loud: Mic, mishearing: Mic, echo: Headphones,
};

/** One gentle, dismissible suggestion at a time; it never interrupts Clara. */
export function QualityTip({ kind, onDismiss, onType }: { kind: TipKind; onDismiss: () => void; onType?: () => void }) {
  const tip = TIPS[kind];
  const Icon = ICON[kind];
  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{tip.title}</p>
        <p className="text-sm text-muted-foreground">{tip.text}</p>
        {tip.action === "type" && onType && (
          <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={() => { onType(); onDismiss(); }}>
            <Keyboard className="h-4 w-4" aria-hidden /> Type answers instead
          </Button>
        )}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss tip" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
