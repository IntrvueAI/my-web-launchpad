import { useState } from "react";
import { Check, CheckCircle2, CircleDashed, Copy, ExternalLink, Link2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPence } from "@/config/medicinePricing";
import {
  CREATOR_LIMITS, PAYOUT_LABEL, PLATFORM_LABEL, SCOPE_LABEL, referralUrl, type CreatorView,
} from "@/lib/creatorProgramme";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => {
      void navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }}>
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const STATUS_TEXT = { hold: "In 30-day hold", ready: "Ready for next payout", paid: "Paid", reversed: "Reversed (refund)" } as const;

export interface CreatorActions {
  onConnect: () => void;
  onRefresh: () => void;
  onStripeDashboard: () => void;
  busy: "connect" | "status" | "stripe_dashboard" | null;
  notice?: string;
}

/** A creator's dashboard: links, sign-ups, earnings, payouts and Stripe setup. Shared by /creator and the admin preview. */
export function CreatorDashboardView({ view, actions, preview = false }: { view: CreatorView; actions?: CreatorActions; preview?: boolean }) {
  const { creator, links, earnings } = view;
  const signups = links.reduce((n, l) => n + l.signups, 0);
  const paying = links.reduce((n, l) => n + l.payingCustomers, 0);
  const tiles: [string, string, string][] = [
    ["Sign-ups through your links", String(signups), `${paying} became paying customers`],
    ["In the 30-day hold", formatPence(earnings.holdPence), "Becomes payable after the refund window"],
    ["Ready for the next payout", formatPence(earnings.readyPence), "Paid to your bank through Stripe"],
    ["Paid to you so far", formatPence(earnings.paidPence), `${view.payouts.filter((p) => p.status === "paid").length} payout(s)`],
  ];
  const disabled = preview || !actions;
  const step = creator.payoutStatus === "verified" ? 3 : creator.payoutStatus === "pending" ? 2 : 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Creator dashboard</p>
          <h1 className="mt-1 text-3xl font-bold">Hi {creator.name}</h1>
        </div>
        {creator.status === "paused" && (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <TriangleAlert className="h-4 w-4 text-primary" aria-hidden /> Your links are paused. Earnings already approved will still be paid.
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="creator-links" className="space-y-3">
        <h2 id="creator-links" className="text-xl font-semibold">Your links</h2>
        {!links.length && <p className="text-sm text-muted-foreground">No links yet. We'll add your first one shortly.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {links.map((l) => {
            const url = referralUrl(l.platform, l.code);
            return (
              <article key={l.id} className="space-y-3 rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4 text-primary" aria-hidden /> {l.label || PLATFORM_LABEL[l.platform]}</p>
                  <span className="rounded-full border px-2 py-0.5 text-xs">{PLATFORM_LABEL[l.platform]}{l.active ? "" : " · paused"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all rounded-lg bg-muted px-3 py-2 text-sm">{url}</code>
                  <CopyButton text={url} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {l.discountEnabled && l.discountPercent > 0 ? `Your audience gets ${l.discountPercent}% off their first purchase. ` : "No audience discount on this link. "}
                  You earn {l.commissionType === "percent" ? `${l.commissionPercent}% of what they pay` : `${formatPence(l.commissionFixedPence)} per purchase`}, {SCOPE_LABEL[l.commissionScope]}.
                </p>
                <dl className="grid grid-cols-4 gap-2 border-t pt-3 text-center">
                  {([["Visits", l.visits], ["Sign-ups", l.signups], ["Paying", l.payingCustomers], ["Earned", formatPence(l.earnedPence)]] as const).map(([label, value]) => (
                    <div key={label}><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="creator-payouts" className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="creator-payouts" className="text-xl font-semibold">Get paid with Stripe</h2>
            <span className="rounded-full border px-2 py-0.5 text-xs">{PAYOUT_LABEL[creator.payoutStatus]}</span>
          </div>
          <ol className="space-y-3">
            {[
              ["Create your Stripe payout account", "Stripe's own secure pages ask for your details and the bank account to pay. We never see or store your bank details."],
              ["Stripe checks your details", "Usually a few minutes. Stripe may ask for ID; you can come back and continue at any time."],
              ["Get paid", `Earnings become payable ${CREATOR_LIMITS.holdDays} days after each purchase (the refund window). We send payouts to your bank through Stripe.`],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                {step > i + 1 || (step === 3 && i === 2)
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-label="Done" />
                  : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-label={step === i + 1 ? "Next step" : "Not started"} />}
                <span><span className="block font-medium">{i + 1}. {title}</span><span className="text-sm text-muted-foreground">{text}</span></span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {creator.payoutStatus === "verified" ? (
              <Button type="button" className="gap-2" disabled={disabled || !!actions?.busy} onClick={actions?.onStripeDashboard}>
                {actions?.busy === "stripe_dashboard" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
                Open your Stripe dashboard
              </Button>
            ) : (
              <Button type="button" className="gap-2" disabled={disabled || !!actions?.busy || creator.status === "paused"} onClick={actions?.onConnect}>
                {actions?.busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
                {creator.payoutStatus === "pending" ? "Continue setup on Stripe" : "Set up payouts with Stripe"}
              </Button>
            )}
            {creator.stripeConnected && (
              <Button type="button" variant="outline" className="gap-2" disabled={disabled || !!actions?.busy} onClick={actions?.onRefresh}>
                <RefreshCw className={`h-4 w-4 ${actions?.busy === "status" ? "animate-spin" : ""}`} aria-hidden /> Check status
              </Button>
            )}
          </div>
          {actions?.notice && <p role="status" className="text-sm">{actions.notice}</p>}
          {preview && <p className="text-xs text-muted-foreground">Preview: buttons are disabled.</p>}
        </div>
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <h3 className="font-semibold">Payout history</h3>
          {!view.payouts.length ? <p className="text-sm text-muted-foreground">No payouts yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">Amount</th><th className="py-1 font-medium">Status</th></tr></thead>
              <tbody>
                {view.payouts.map((p) => (
                  <tr key={p.date} className="border-t"><td className="py-1.5">{date(p.date)}</td><td className="py-1.5 tabular-nums">{formatPence(p.amountPence)}</td>
                    <td className="py-1.5">{p.status === "paid" ? "Paid" : p.status === "failed" ? "Failed, will retry" : "Processing"}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section aria-labelledby="creator-activity" className="rounded-2xl border bg-card p-5">
        <h2 id="creator-activity" className="text-xl font-semibold">Purchases through your links</h2>
        <p className="mt-1 text-sm text-muted-foreground">Customers stay anonymous: you see what was bought, never who bought it.</p>
        {!view.recent.length ? <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Share your link to get started.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">Purchase</th><th className="py-1 font-medium">You earn</th><th className="py-1 font-medium">Status</th></tr></thead>
              <tbody>
                {view.recent.map((r, i) => (
                  <tr key={`${r.date}-${i}`} className="border-t">
                    <td className="py-1.5">{date(r.date)}</td>
                    <td className="py-1.5">{PLATFORM_LABEL[r.platform]} · {r.credits} credit{r.credits === 1 ? "" : "s"} · {formatPence(r.amountPaidPence)}</td>
                    <td className="py-1.5 font-medium tabular-nums">{formatPence(r.commissionPence)}</td>
                    <td className="py-1.5 text-muted-foreground">{STATUS_TEXT[r.status]}{r.status === "hold" ? ` until ${date(r.availableAt)}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="creator-rules" className="rounded-2xl bg-muted/50 p-5 text-sm">
        <h2 id="creator-rules" className="font-semibold">The rules, briefly</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Say clearly that you earn from your link, for example with #ad. UK advertising rules require it.</li>
          <li>Your link counts when someone opens it and creates a new account within 30 days, in the same browser.</li>
          <li>You can't earn from your own account. Refunded purchases are reversed.</li>
          <li>Earnings are held for {CREATOR_LIMITS.holdDays} days, then paid through Stripe.</li>
        </ul>
      </section>
    </div>
  );
}
