import { NavLink } from "react-router-dom";
import { Link2, MessageSquareText } from "lucide-react";
import type { TrialProduct } from "@/lib/guestTrials";

export function BetaPortalNav({ product = "medicine" }: { product?: TrialProduct }) {
  return (
    <nav
      aria-label="Beta testing"
      className="mb-7 flex flex-wrap gap-2 border-b pb-4"
    >
      {[
        { to: product === "11plus" ? "/admin/11plus-trials" : "/admin/guest-trials", label: "Invitations", icon: Link2 },
        {
          to: `/admin/feedback?view=testers&product=${product}`,
          label: "Tester feedback",
          icon: MessageSquareText,
        },
      ].map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`
          }
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
