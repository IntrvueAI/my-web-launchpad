import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { formatPence } from "@/config/medicinePricing";
import { AdminCreatorEditor } from "@/components/creators/AdminCreatorEditor";
import { CreatorDashboardView } from "@/components/creators/CreatorDashboardView";
import {
  PLATFORM_LABEL, creatorApi, linkEconomics, previewView,
  type AdminOverview, type Creator, type CreatorPayoutRow, type CreatorPlatform, type ProgrammeCosts,
} from "@/lib/creatorProgramme";

const selectClass = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";
type Data = { creators: Creator[]; overview: AdminOverview; payouts: CreatorPayoutRow[] };
const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "–");

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function CostSettings({ costs, onSaved }: { costs: ProgrammeCosts; onSaved: () => void }) {
  const [form, setForm] = useState({
    stripePercent: (costs.stripe_percent_bp / 100).toFixed(2), stripeFixed: (costs.stripe_fixed_pence / 100).toFixed(2),
    medicine: (costs.medicine_cost_per_credit_pence / 100).toFixed(2), school: (costs.school_cost_per_credit_pence / 100).toFixed(2),
  });
  const [status, setStatus] = useState("");
  const pence = (v: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) * 100) || 0));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await creatorApi.saveCosts({
        stripe_percent_bp: pence(form.stripePercent, 1000), stripe_fixed_pence: pence(form.stripeFixed, 200),
        medicine_cost_per_credit_pence: pence(form.medicine, 10000), school_cost_per_credit_pence: pence(form.school, 10000),
      });
      setStatus("Saved.");
      onSaved();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save.");
    }
  }
  const field = (key: keyof typeof form, label: string, hint: string, unit: "£" | "%") => (
    <label className="text-sm font-medium">
      {label}
      <span className="mt-1 flex items-center gap-1">{unit === "£" && "£"}<Input type="number" min={0} step="0.01" value={form[key]} onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setStatus(""); }} />{unit === "%" && "%"}</span>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>
    </label>
  );
  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5" aria-labelledby="cost-title">
      <div>
        <h3 id="cost-title" className="font-semibold">Cost assumptions</h3>
        <p className="text-sm text-muted-foreground">Used for every cost, margin and markup figure on this page. Estimates, not invoices.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {field("stripePercent", "Stripe fee %", "Per card payment. Check your Stripe pricing.", "%")}
        {field("stripeFixed", "Stripe fee per payment", "Fixed part of the card fee.", "£")}
        {field("medicine", "Our cost per Medicine credit", "Anam minutes + OpenAI for one 7-minute station.", "£")}
        {field("school", "Our cost per 11+ credit", "Anam minutes + OpenAI per credit used.", "£")}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" className="gap-2"><Save className="h-4 w-4" aria-hidden /> Save assumptions</Button>
        {status && <span role="status" className="text-sm">{status}</span>}
      </div>
    </form>
  );
}

function Overview({ data, platform, onChanged }: { data: Data; platform: "all" | CreatorPlatform; onChanged: () => void }) {
  const links = data.creators.flatMap((c) => c.creator_links.map((l) => ({ creator: c, link: l }))).filter(({ link }) => platform === "all" || link.platform === platform);
  const rows = links.map(({ creator, link }) => {
    const stats = data.overview.links.find((s) => s.linkId === link.id);
    const money = stats ? linkEconomics(stats, link.platform, data.overview.costs) : { revenue: 0, allocated: 0, fees: 0, delivery: 0, ourNet: 0, discount: 0 };
    return { creator, link, stats, money };
  });
  const total = rows.reduce((t, r) => ({
    visits: t.visits + (r.stats?.visits ?? 0), signups: t.signups + (r.stats?.signups ?? 0), paying: t.paying + (r.stats?.payingCustomers ?? 0),
    orders: t.orders + (r.stats?.orders ?? 0), revenue: t.revenue + r.money.revenue, discount: t.discount + r.money.discount,
    allocated: t.allocated + r.money.allocated, hold: t.hold + (r.stats?.holdPence ?? 0), ready: t.ready + (r.stats?.readyPence ?? 0),
    paid: t.paid + (r.stats?.paidPence ?? 0), fees: t.fees + r.money.fees, delivery: t.delivery + r.money.delivery, ourNet: t.ourNet + r.money.ourNet,
  }), { visits: 0, signups: 0, paying: 0, orders: 0, revenue: 0, discount: 0, allocated: 0, hold: 0, ready: 0, paid: 0, fees: 0, delivery: 0, ourNet: 0 });
  const costs = total.allocated + total.fees + total.delivery;
  return (
    <div className="space-y-6">
      <section aria-labelledby="money-title" className="space-y-3">
        <h2 id="money-title" className="text-lg font-semibold">Money from referred customers</h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Revenue (what they paid)" value={formatPence(total.revenue)} hint={`${total.orders} order(s) · ${formatPence(total.discount)} in discounts given`} />
          <Tile label="Allocated to creators" value={formatPence(total.allocated)} hint={`${percent(total.allocated, total.revenue)} of revenue · ${formatPence(total.ready)} ready to pay`} />
          <Tile label="Our costs (estimated)" value={formatPence(total.fees + total.delivery)} hint={`Stripe ${formatPence(total.fees)} · delivery ${formatPence(total.delivery)}`} />
          <Tile label="Our net" value={formatPence(total.ourNet)} hint={`Margin ${percent(total.ourNet, total.revenue)} · markup on cost ${percent(total.ourNet, costs)}`} />
        </dl>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Link visits" value={String(total.visits)} />
          <Tile label="Sign-ups" value={String(total.signups)} hint={`${percent(total.signups, total.visits)} of visits`} />
          <Tile label="Paying customers" value={String(total.paying)} hint={`${percent(total.paying, total.signups)} of sign-ups`} />
          <Tile label="Creator earnings" value={formatPence(total.hold + total.ready + total.paid)} hint={`hold ${formatPence(total.hold)} · ready ${formatPence(total.ready)} · paid ${formatPence(total.paid)}`} />
        </dl>
      </section>
      <section aria-labelledby="by-link-title" className="space-y-2">
        <h2 id="by-link-title" className="text-lg font-semibold">By creator link</h2>
        {!rows.length ? <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">No creator links yet. Invite a creator from the Creators tab.</p> : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {["Creator", "Link", "Visits", "Sign-ups", "Paying", "Revenue", "To creator", "Our costs", "Our net", "Margin"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ creator, link, stats, money }) => (
                  <tr key={link.id} className="border-b last:border-0 tabular-nums">
                    <td className="px-3 py-2 font-medium">{creator.name}</td>
                    <td className="px-3 py-2">/r/{link.code} <span className="text-muted-foreground">· {PLATFORM_LABEL[link.platform]}{link.active ? "" : " · paused"}</span></td>
                    <td className="px-3 py-2">{stats?.visits ?? 0}</td>
                    <td className="px-3 py-2">{stats?.signups ?? 0}</td>
                    <td className="px-3 py-2">{stats?.payingCustomers ?? 0}</td>
                    <td className="px-3 py-2">{formatPence(money.revenue)}</td>
                    <td className="px-3 py-2">{formatPence(money.allocated)}</td>
                    <td className="px-3 py-2">{formatPence(money.fees + money.delivery)}</td>
                    <td className={`px-3 py-2 font-medium ${money.ourNet < 0 ? "text-destructive" : ""}`}>{formatPence(money.ourNet)}</td>
                    <td className="px-3 py-2">{percent(money.ourNet, money.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Revenue counts paid orders by referred customers on the link's platform after they signed up. Per-interview splits are under Creators → a link → Per-interview economics.</p>
      </section>
      <CostSettings key={JSON.stringify(data.overview.costs)} costs={data.overview.costs} onSaved={onChanged} />
    </div>
  );
}

function Commissions({ data, platform, onChanged }: { data: Data; platform: "all" | CreatorPlatform; onChanged: () => void }) {
  const [reversing, setReversing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const rows = data.overview.recent.filter((c) => platform === "all" || c.platform === platform);
  const name = (id: string) => data.creators.find((c) => c.id === id)?.name ?? "Unknown";
  const code = (id: string) => data.creators.flatMap((c) => c.creator_links).find((l) => l.id === id)?.code ?? "?";
  const label = (c: AdminOverview["recent"][number]) =>
    c.status === "pending" ? (Date.parse(c.availableAt) > Date.now() ? `Hold until ${new Date(c.availableAt).toLocaleDateString("en-GB")}` : "Ready to pay") : c.status === "paid" ? "Paid" : `Reversed: ${c.reversedReason ?? ""}`;
  async function reverse(id: string) {
    try {
      const done = await creatorApi.reverseCommission(id, reason);
      setStatus(done ? "Reversed." : "This earning is already being paid or was paid, so it can't be reversed.");
      setReversing(null);
      setReason("");
      onChanged();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not reverse.");
    }
  }
  if (!rows.length) return <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">No creator earnings yet. They appear here when a referred customer pays.</p>;
  return (
    <div className="space-y-2">
      {status && <p role="status" className="text-sm">{status}</p>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            {["Date", "Creator", "Link", "Purchase", "List", "Discount", "Paid", "Creator earns", "Status", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b align-top last:border-0 tabular-nums">
                <td className="px-3 py-2">{new Date(c.date).toLocaleDateString("en-GB")}</td>
                <td className="px-3 py-2">{name(c.creatorId)}</td>
                <td className="px-3 py-2">/r/{code(c.linkId)}</td>
                <td className="px-3 py-2">{PLATFORM_LABEL[c.platform]} · {c.credits} cr</td>
                <td className="px-3 py-2">{formatPence(c.listPricePence)}</td>
                <td className="px-3 py-2">{formatPence(c.discountPence)}</td>
                <td className="px-3 py-2">{formatPence(c.amountPaidPence)}</td>
                <td className="px-3 py-2 font-medium">{formatPence(c.commissionPence)}</td>
                <td className="px-3 py-2">{label(c)}</td>
                <td className="px-3 py-2">
                  {c.status === "pending" && (reversing === c.id ? (
                    <span className="flex min-w-[220px] flex-col gap-1">
                      <Input aria-label="Reason" placeholder="Reason, e.g. refunded" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
                      <span className="flex gap-1">
                        <Button type="button" size="sm" variant="destructive" disabled={reason.trim().length < 3} onClick={() => void reverse(c.id)}>Reverse</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setReversing(null)}>Cancel</Button>
                      </span>
                    </span>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => { setReversing(c.id); setReason(""); }}><Undo2 className="h-4 w-4" aria-hidden /> Reverse</Button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Reverse an earning when its purchase is refunded. Earnings already in a payout can't be reversed.</p>
    </div>
  );
}

/** Admin: creators, their links and terms, the money (revenue, allocation, costs, margin), earnings and payouts. */
export default function AdminCreators() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [platform, setPlatform] = useState<"all" | CreatorPlatform>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [creators, overview, payouts] = await Promise.all([creatorApi.creators(), creatorApi.overview(), creatorApi.payouts()]);
      setData({ creators, overview, payouts });
      setError("");
    } catch (e) {
      const text = e instanceof Error ? e.message : "";
      setError(/does not exist|schema cache|function .* not/i.test(text)
        ? "The creator programme isn't in the database yet. Deploy migration 20261024000001_creator_programme.sql, then reload."
        : text || "The creator programme could not be loaded.");
    }
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const preview = useMemo(() => {
    const creator = data?.creators.find((c) => c.id === (previewId ?? selectedId)) ?? data?.creators[0];
    return creator && data ? previewView(creator, data.overview, data.payouts) : null;
  }, [data, previewId, selectedId]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" /></div>;
  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-foreground">
      <header className="space-y-3">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden /> Admin</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Creator programme</h1>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Platform" className="inline-flex rounded-xl border bg-card p-1">
              {(["all", "medicine", "11plus"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={platform === p} onClick={() => setPlatform(p)}
                  className={`min-h-9 rounded-lg px-3 text-sm font-medium ${platform === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {p === "all" ? "All" : PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="icon" aria-label="Refresh" onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden /></Button>
          </div>
        </div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm">{error}</p>}
      {!data && !error && <p role="status" className="text-muted-foreground">Loading creators…</p>}
      {data && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="creators">Creators & links</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="preview">Creator's view</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Overview data={data} platform={platform} onChanged={() => void load()} /></TabsContent>
          <TabsContent value="creators">
            <AdminCreatorEditor creators={data.creators} overview={data.overview} platform={platform} selectedId={selectedId}
              onSelect={setSelectedId} onChanged={() => void load()} onPreview={(id) => { setPreviewId(id); setTab("preview"); }} />
          </TabsContent>
          <TabsContent value="earnings"><Commissions data={data} platform={platform} onChanged={() => void load()} /></TabsContent>
          <TabsContent value="preview" className="space-y-4">
            {!data.creators.length ? <p className="text-sm text-muted-foreground">Invite a creator to preview their dashboard.</p> : (
              <>
                <label className="block max-w-sm text-sm font-medium">Viewing as
                  <select className={`${selectClass} mt-1`} value={preview?.creator.id} onChange={(e) => setPreviewId(e.target.value)}>
                    {data.creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                {preview && <div className="rounded-2xl border border-dashed p-4"><CreatorDashboardView view={preview} preview /></div>}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
