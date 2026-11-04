import { Gift, Info } from "lucide-react";
import { attachOutcome, type AttachResult } from "@/lib/creatorProgramme";

/** What adding a creator's code did to this account: the discount, or why it doesn't apply. */
export function CodeOutcome({ result }: { result: AttachResult }) {
  const { ok, title, text } = attachOutcome(result);
  const Icon = ok ? Gift : Info;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 ${ok ? "border-primary/40 bg-primary/5" : "bg-muted/40"}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ok ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
      <span><strong className="block">{title}</strong><span className="text-sm text-muted-foreground">{text}</span></span>
    </div>
  );
}
