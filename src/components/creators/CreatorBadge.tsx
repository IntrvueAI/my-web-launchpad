import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useCreatorStatus } from "@/hooks/useCreatorStatus";

/** Marks a creator account and links to the creator dashboard; renders nothing for other users. */
export function CreatorBadge({ className = "" }: { className?: string }) {
  const creator = useCreatorStatus();
  if (!creator) return null;
  return (
    <Link
      to="/creator"
      title="Your creator dashboard: links, sign-ups and payouts"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/15 ${className}`}
    >
      <Megaphone className="h-3.5 w-3.5" aria-hidden />
      Creator
      {creator.status === "paused" && <span className="text-muted-foreground">· paused</span>}
    </Link>
  );
}
