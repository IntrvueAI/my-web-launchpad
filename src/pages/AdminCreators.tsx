import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Copy, ExternalLink, Link2, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { formatPence } from "@/config/medicinePricing";
import {
  CREATOR_LIMITS, CREATOR_STATUS_LABEL, EXAMPLE_SALES, PAYOUT_LABEL, SAMPLE_CONVERSIONS, SAMPLE_CREATORS, SCOPE_LABEL,
  isValidReferralCode, referralUrl, splitSale, type Creator, type CreatorPlatform, type CreatorStatus,
} from "@/lib/creatorProgramme";

const PLATFORM_LABEL: Record<CreatorPlatform, string> = { medicine: "Medicine", "11plus": "11+" };
const selectClass = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";
const statusTone: Record<CreatorStatus, string> = {
  active: "bg-primary text-primary-foreground",
  invited: "border border-primary/50 text-primary",
  paused: "bg-muted text-muted-foreground",
};
const clampPercent = (value: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => {
      void navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }}>
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

/** One sale split three ways, for the first purchase and a later one. */
function SplitTable({ creator }: { creator: Creator }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">How a sale splits</caption>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="py-1 font-medium">Sale</th><th className="py-1 font-medium">Customer pays</th>
          <th className="py-1 font-medium">Creator earns</th><th className="py-1 font-medium">We keep*</th>
        </tr>
      </thead>
      <tbody>
        {EXAMPLE_SALES.flatMap((sale) => [true, false].map((first) => {
          if (!first && creator.scope === "first_purchase") return null;
          const s = splitSale(sale.pence, creator, first);
          return (
            <tr key={`${sale.label}-${first}`} className="border-t">
              <td className="py-1.5">{sale.label} {first ? "(first)" : "(later)"}</td>
              <td className="py-1.5">{formatPence(s.customerPays)}{s.discount ? <span className="text-muted-foreground"> (−{formatPence(s.discount)})</span> : null}</td>
              <td className="py-1.5 font-medium">{formatPence(s.creatorEarns)}</td>
              <td className="py-1.5">{formatPence(s.platformKeeps)}</td>
            </tr>
          );
        }))}
      </tbody>
    </table>
  );
}

function CreatorEditor({ creator, onChange, onPreview }: { creator: Creator; onChange: (c: Creator) => void; onPreview: () => void }) {
  const set = <K extends keyof Creator>(key: K, value: Creator[K]) => onChange({ ...creator, [key]: value });
  const codeOk = isValidReferralCode(creator.code);
  return (
    <section aria-label={`Settings for ${creator.name}`} className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Name
          <Input className="mt-1" value={creator.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Platform
          <select className={`${selectClass} mt-1`} value={creator.platform} onChange={(e) => set("platform", e.target.value as CreatorPlatform)}>
            <option value="medicine">Medicine · MMI Practice</option>
            <option value="11plus">11+ · intrvue.ai</option>
          </select>
        </label>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="creator-code">Referral link</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{referralUrl(creator.platform, "")}</span>
          <Input id="creator-code" className="w-48" value={creator.code} maxLength={CREATOR_LIMITS.codeMax} aria-invalid={!codeOk}
            onChange={(e) => set("code", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
          {codeOk && <CopyLink url={referralUrl(creator.platform, creator.code)} />}
        </div>
        {!codeOk && <p className="mt-1 text-xs text-destructive">Use {CREATOR_LIMITS.codeMin}–{CREATOR_LIMITS.codeMax} lower-case letters, numbers or single hyphens.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="creator-discount" className="text-sm font-medium">Discount for their audience</label>
            <Switch id="creator-discount" checked={creator.discountOn} onCheckedChange={(on) => set("discountOn", on)} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Input type="number" className="w-20" min={0} max={CREATOR_LIMITS.discountMax} disabled={!creator.discountOn}
              value={creator.discountPercent} onChange={(e) => set("discountPercent", clampPercent(e.target.value, CREATOR_LIMITS.discountMax))} />
            % off the first interview they buy
          </label>
        </div>
        <div className="rounded-xl border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Input type="number" className="w-20" min={0} max={CREATOR_LIMITS.shareMax}
              value={creator.sharePercent} onChange={(e) => set("sharePercent", clampPercent(e.target.value, CREATOR_LIMITS.shareMax))} />
            % of what the customer pays goes to the creator
          </label>
          <select className={`${selectClass} mt-3`} aria-label="Which purchases earn" value={creator.scope} onChange={(e) => set("scope", e.target.value as Creator["scope"])}>
            {Object.entries(SCOPE_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Account status
          <select className={`${selectClass} mt-1`} value={creator.status} onChange={(e) => set("status", e.target.value as CreatorStatus)}>
            {Object.entries(CREATOR_STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Paused links still open the site but stop discounts and earnings.</span>
        </label>
        <div className="text-sm">
          <p className="font-medium">Payouts</p>
          <p className="mt-1 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> {PAYOUT_LABEL[creator.payout]}</p>
          <p className="mt-1 text-xs text-muted-foreground">The creator enters bank details on Stripe's own pages. We never see or store them.</p>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">What one sale looks like</p>
        <SplitTable creator={creator} />
        <p className="mt-2 text-xs text-muted-foreground">*Before Stripe card fees, refunds and VAT, which this prototype does not model.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="button" variant="outline" className="gap-2" onClick={onPreview}><ExternalLink className="h-4 w-4" aria-hidden /> See their dashboard</Button>
        <p className="self-center text-xs text-muted-foreground">Changes stay on this page only. Nothing is saved.</p>
      </div>
    </section>
  );
}

/** What a creator would see when they sign in. Aggregate numbers only, never customer details. */
export function CreatorDashboardPreview({ creator }: { creator: Creator }) {
  const url = referralUrl(creator.platform, creator.code);
  const stats = [
    ["Link visits", String(creator.stats.clicks)],
    ["Sign-ups", String(creator.stats.signups)],
    ["First purchases", String(creator.stats.firstPurchases)],
    ["Earned so far", formatPence(creator.stats.owedPence + creator.stats.paidPence)],
  ];
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your link</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="break-all rounded-lg bg-background px-3 py-2 text-sm">{url}</code>
          <CopyLink url={url} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {creator.discountOn ? `Your audience gets ${creator.discountPercent}% off their first interview. ` : ""}
          You earn {creator.sharePercent}% of what they pay ({SCOPE_LABEL[creator.scope].toLowerCase()}).
        </p>
        {creator.status !== "active" && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium"><TriangleAlert className="h-4 w-4" aria-hidden />
            {creator.status === "invited" ? "Finish setting up your account to activate this link." : "This link is paused. Contact us to restart it."}
          </p>
        )}
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border bg-card p-5" aria-labelledby="creator-sales">
          <h3 id="creator-sales" className="font-semibold">Recent purchases through your link</h3>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">Purchase</th><th className="py-1 font-medium">You earn</th><th className="py-1 font-medium">Status</th></tr></thead>
            <tbody>
              {SAMPLE_CONVERSIONS.map((c) => (
                <tr key={`${c.date}-${c.item}`} className="border-t">
                  <td className="py-1.5">{new Date(`${c.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                  <td className="py-1.5">{c.item} · {formatPence(c.pence)}</td>
                  <td className="py-1.5 font-medium">{formatPence(c.earned)}</td>
                  <td className="py-1.5 text-muted-foreground">{c.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">Customers stay anonymous: you see what was bought, never who bought it.</p>
        </section>
        <section className="space-y-3 rounded-2xl border bg-card p-5" aria-labelledby="creator-payouts">
          <h3 id="creator-payouts" className="font-semibold">Payouts</h3>
          <p className="text-3xl font-semibold">{formatPence(creator.stats.owedPence)}</p>
          <p className="text-sm text-muted-foreground">Approved earnings are paid monthly once they pass the 30-day refund window.</p>
          <Button type="button" className="w-full" disabled>
            {creator.payout === "not_connected" ? "Set up payouts with Stripe" : "Manage payouts on Stripe"}
          </Button>
          <p className="text-xs text-muted-foreground">Prototype: this button would open Stripe's secure onboarding.</p>
        </section>
      </div>
      <p className="rounded-xl bg-muted/50 p-3 text-sm">
        <strong>Posting your link?</strong> Say clearly that you earn from it, for example with #ad. UK advertising rules require it.
      </p>
    </div>
  );
}

const STEPS = [
  ["Invite", "You add a creator, choose their code, discount and share. They get an email to set up a creator account."],
  ["Payouts", "They connect a bank account through Stripe Connect (Stripe hosts the form and checks identity). We never hold bank details."],
  ["Share", "Their link (mmipractice.co.uk/r/code) opens the normal site and remembers the referral for 30 days in that browser."],
  ["Sign up", "When the visitor creates an account, the referral is attached to it once. First link wins; it cannot be changed later."],
  ["Buy", "On their first purchase the server applies the discount and records the creator's share. Prices still come only from the server."],
  ["Hold", "Earnings wait 30 days in case of a refund, then become approved. Refunds reverse the share automatically."],
  ["Pay", "Once a month, approved earnings are transferred to the creator's Stripe account, with a statement in their dashboard."],
] as const;

const DECISIONS = [
  "Default discount and share, and whether the share is first purchase only or ongoing for 12 months.",
  "Minimum payout (for example £20) and payout day.",
  "Whether creators can be under 18. Stripe Connect has its own age and identity rules, so this needs checking with Stripe.",
  "Separate programmes for Medicine and 11+, or one creator account with a link per platform.",
  "Whether a referred customer's discount can stack with pay-what-you-can or admin credit gifts (suggested: no).",
];

const SAFEGUARDS = [
  "No self-referral: the creator's own account, email and card cannot earn from their own link.",
  "Earnings only from paid, settled Stripe orders, never from free interviews or admin credits.",
  "Creators see totals and anonymous purchases only. No names, emails or interview content.",
  "Pausing a creator stops new discounts and earnings immediately; existing approved earnings are still paid.",
  "A ledger, like the Medicine credit ledger, records every share, reversal and payout for audit.",
  "Creators must disclose that they earn from the link (#ad), in line with UK advertising rules.",
];

/** Admin prototype for the creator programme: sample data only, nothing saved or paid. */
export default function AdminCreators() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [creators, setCreators] = useState<Creator[]>(SAMPLE_CREATORS);
  const [selectedId, setSelectedId] = useState(SAMPLE_CREATORS[0].id);
  const [platform, setPlatform] = useState<"all" | CreatorPlatform>("all");
  const [tab, setTab] = useState("creators");
  const shown = creators.filter((c) => platform === "all" || c.platform === platform);
  const selected = creators.find((c) => c.id === selectedId) ?? creators[0];
  const totals = useMemo(() => ({
    active: shown.filter((c) => c.status === "active").length,
    clicks: shown.reduce((n, c) => n + c.stats.clicks, 0),
    purchases: shown.reduce((n, c) => n + c.stats.firstPurchases, 0),
    owed: shown.reduce((n, c) => n + c.stats.owedPence, 0),
  }), [shown]);
  const update = (next: Creator) => setCreators((all) => all.map((c) => (c.id === next.id ? next : c)));
  const invite = () => {
    const id = `new-${creators.length + 1}`;
    const fresh: Creator = {
      id, name: "New creator", platform: platform === "11plus" ? "11plus" : "medicine", code: `creator-${creators.length + 1}`, status: "invited",
      discountOn: true, discountPercent: 10, sharePercent: 20, scope: "first_purchase", payout: "not_connected",
      stats: { clicks: 0, signups: 0, firstPurchases: 0, revenuePence: 0, owedPence: 0, paidPence: 0 },
    };
    setCreators((all) => [...all, fresh]);
    setSelectedId(id);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-foreground">
      <header className="space-y-3">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Admin</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Creator programme</h1>
          <Badge variant="outline">Prototype · sample data</Badge>
        </div>
        <p role="note" className="flex gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          A prototype to agree the design. Nothing here is saved, no discount is applied, no link works yet and no one is paid.
          Every creator and number below is made up.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="dashboard">Creator's dashboard</TabsTrigger>
          <TabsTrigger value="how">How it would work</TabsTrigger>
        </TabsList>

        <TabsContent value="creators" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Platform" className="inline-flex rounded-xl border bg-card p-1">
              {(["all", "medicine", "11plus"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={platform === p} onClick={() => setPlatform(p)}
                  className={`min-h-9 rounded-lg px-3 text-sm font-medium ${platform === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {p === "all" ? "All" : PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
            <Button type="button" className="gap-2" onClick={invite}><Plus className="h-4 w-4" aria-hidden /> Invite a creator</Button>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Active creators", String(totals.active)], ["Link visits", String(totals.clicks)], ["First purchases", String(totals.purchases)], ["Owed to creators", formatPence(totals.owed)]].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>
            ))}
          </dl>
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <ul aria-label="Creators" className="space-y-2">
              {shown.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelectedId(c.id)} aria-current={selected?.id === c.id ? "true" : undefined}
                    className={`w-full rounded-xl border p-3 text-left hover:bg-muted/50 ${selected?.id === c.id ? "border-primary bg-primary/5" : ""}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[c.status]}`}>{CREATOR_STATUS_LABEL[c.status]}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" aria-hidden /> /r/{c.code} · {PLATFORM_LABEL[c.platform]}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {c.discountOn ? `${c.discountPercent}% off · ` : "No discount · "}{c.sharePercent}% share · owed {formatPence(c.stats.owedPence)}
                    </span>
                  </button>
                </li>
              ))}
              {!shown.length && <li className="text-sm text-muted-foreground">No creators on this platform yet.</li>}
            </ul>
            {selected && <CreatorEditor creator={selected} onChange={update} onPreview={() => setTab("dashboard")} />}
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <label className="block max-w-sm text-sm font-medium">
            Viewing as
            <select className={`${selectClass} mt-1`} value={selected?.id} onChange={(e) => setSelectedId(e.target.value)}>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {selected && <CreatorDashboardPreview creator={selected} />}
        </TabsContent>

        <TabsContent value="how" className="space-y-6">
          <section aria-labelledby="how-steps">
            <h2 id="how-steps" className="text-xl font-semibold">The journey</h2>
            <ol className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold text-primary">Step {i + 1}</p>
                  <p className="mt-1 font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="how-safe">
              <h2 id="how-safe" className="text-xl font-semibold">Safeguards built in</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{SAFEGUARDS.map((s) => <li key={s}>{s}</li>)}</ul>
            </section>
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="how-decide">
              <h2 id="how-decide" className="text-xl font-semibold">Decisions for you</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{DECISIONS.map((d) => <li key={d}>{d}</li>)}</ul>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
