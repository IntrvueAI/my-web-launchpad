import { useEffect, useState } from "react";
import { ChevronDown, Eye, Link2, Plus, Save, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatPence } from "@/config/medicinePricing";
import {
  CREATOR_LIMITS, CREATOR_STATUS_LABEL, DEFAULT_LINK_TERMS, PAYOUT_LABEL, PLATFORM_LABEL, SCOPE_LABEL,
  creatorApi, isValidReferralCode, normaliseCode, referralUrl,
  type AdminOverview, type Creator, type CreatorLink, type CreatorPlatform, type CreatorStatus,
} from "@/lib/creatorProgramme";
import { MEDICINE_ORIGIN, SCHOOL_ORIGIN } from "@/lib/site";
import { CopyButton } from "./CreatorDashboardView";
import { SaleBreakdown } from "./SaleBreakdown";

const selectClass = "min-h-10 w-full rounded-lg border bg-background px-3 text-sm";
const inlineSelect = "min-h-10 rounded-lg border bg-background px-3 text-sm";
const clamp = (value: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
export const statusTone: Record<CreatorStatus, string> = {
  active: "bg-primary text-primary-foreground",
  invited: "border border-primary/50 text-primary",
  paused: "bg-muted text-muted-foreground",
};

function InviteForm({ onCreated }: { onCreated: (creator: Creator) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", platform: "medicine" as CreatorPlatform, code: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = form.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()) && isValidReferralCode(form.code);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) { setStatus("Add a name, a valid email and a link code (3-24 lower-case letters, numbers or hyphens)."); return; }
    setBusy(true);
    try {
      const creator = await creatorApi.inviteCreator(form);
      const link = await creatorApi.saveLink({ creator_id: creator.id, code: form.code, platform: form.platform, ...DEFAULT_LINK_TERMS });
      onCreated({ ...creator, creator_links: [link] });
      setForm({ name: "", email: "", platform: form.platform, code: "" });
      setStatus("");
      setOpen(false);
    } catch (err) {
      setStatus(message(err, "The creator could not be added."));
    } finally {
      setBusy(false);
    }
  }
  if (!open) return <Button type="button" className="w-full gap-2" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" aria-hidden /> Invite a creator</Button>;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4" aria-label="Invite a creator">
      <label className="block text-sm font-medium">Name<Input className="mt-1" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className="block text-sm font-medium">Email they sign in with<Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="block text-sm font-medium">Platform
        <select className={`${selectClass} mt-1`} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as CreatorPlatform })}>
          <option value="medicine">Medicine · MMI Practice</option><option value="11plus">11+ · intrvue.ai</option>
        </select>
      </label>
      <label className="block text-sm font-medium">Link code
        <Input className="mt-1" maxLength={CREATOR_LIMITS.codeMax} value={form.code} onChange={(e) => setForm({ ...form, code: normaliseCode(e.target.value) })} placeholder="e.g. studywithsam" />
        {form.code && <span className="mt-1 block text-xs font-normal text-muted-foreground">{referralUrl(form.platform, form.code)}</span>}
      </label>
      <p className="text-xs text-muted-foreground">Starts at {DEFAULT_LINK_TERMS.discount_percent}% off for their audience and a {DEFAULT_LINK_TERMS.commission_percent}% share of the first purchase. You can change both after.</p>
      {status && <p role="alert" className="text-sm text-destructive">{status}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="gap-2"><Plus className="h-4 w-4" aria-hidden /> Add creator</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function LinkEditor({ link, overview, onSaved }: { link: CreatorLink; overview: AdminOverview; onSaved: (link: CreatorLink) => void }) {
  const [draft, setDraft] = useState(link);
  const [status, setStatus] = useState("");
  const [showMoney, setShowMoney] = useState(false);
  useEffect(() => setDraft(link), [link]);
  const set = <K extends keyof CreatorLink>(key: K, value: CreatorLink[K]) => { setDraft((d) => ({ ...d, [key]: value })); setStatus(""); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(link);
  const stats = overview.links.find((s) => s.linkId === link.id);
  async function save() {
    try {
      const { id, creator_id, label, active, discount_enabled, discount_percent, commission_type, commission_percent, commission_fixed_pence, commission_scope } = draft;
      onSaved(await creatorApi.saveLink({ id, creator_id, label: label?.trim() || null, active, discount_enabled, discount_percent, commission_type, commission_percent, commission_fixed_pence, commission_scope }));
      setStatus("Saved. New terms apply to purchases from now on.");
    } catch (e) {
      setStatus(message(e, "The link could not be saved."));
    }
  }
  const url = referralUrl(link.platform, link.code);
  return (
    <article className="space-y-4 rounded-xl border p-4" aria-label={`Link ${link.code}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4 text-primary" aria-hidden /> /r/{link.code} <span className="rounded-full border px-2 py-0.5 text-xs font-normal">{PLATFORM_LABEL[link.platform]}</span></p>
        <label className="flex items-center gap-2 text-sm">Active <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} aria-label="Link active" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-2"><code className="break-all rounded bg-muted px-2 py-1 text-xs">{url}</code><CopyButton text={url} /></div>
      <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        {([["Visits", stats?.visits ?? 0], ["Sign-ups", stats?.signups ?? 0], ["Paying", stats?.payingCustomers ?? 0], ["Revenue", formatPence(stats?.revenuePence ?? 0)],
          ["To creator", formatPence((stats?.holdPence ?? 0) + (stats?.readyPence ?? 0) + (stats?.paidPence ?? 0))], ["Discounts", formatPence(stats?.discountPence ?? 0)]] as const).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted/40 p-2"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>
        ))}
      </dl>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">Label <span className="font-normal text-muted-foreground">(where they post it)</span>
          <Input className="mt-1" maxLength={60} value={draft.label ?? ""} onChange={(e) => set("label", e.target.value)} placeholder="e.g. YouTube description" />
        </label>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`d-${link.id}`} className="text-sm font-medium">Audience discount</label>
            <Switch id={`d-${link.id}`} checked={draft.discount_enabled} onCheckedChange={(v) => set("discount_enabled", v)} />
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <Input type="number" className="w-20" min={0} max={CREATOR_LIMITS.discountMax} disabled={!draft.discount_enabled}
              value={draft.discount_percent} onChange={(e) => set("discount_percent", clamp(e.target.value, CREATOR_LIMITS.discountMax))} />
            % off the first purchase
          </label>
        </div>
        <div className="rounded-lg border p-3 md:col-span-2">
          <p className="text-sm font-medium">Creator payout</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <select aria-label="Payout type" className={inlineSelect} value={draft.commission_type} onChange={(e) => set("commission_type", e.target.value as CreatorLink["commission_type"])}>
              <option value="percent">Share of what the customer pays</option>
              <option value="fixed">Fixed amount per purchase</option>
            </select>
            {draft.commission_type === "percent" ? (
              <label className="flex items-center gap-2"><Input type="number" className="w-20" min={0} max={CREATOR_LIMITS.percentMax} value={draft.commission_percent}
                onChange={(e) => set("commission_percent", clamp(e.target.value, CREATOR_LIMITS.percentMax))} aria-label="Share percent" />%</label>
            ) : (
              <label className="flex items-center gap-2">£<Input type="number" className="w-24" min={0} max={CREATOR_LIMITS.fixedMaxPence / 100} step="0.01"
                value={(draft.commission_fixed_pence / 100).toFixed(2)} onChange={(e) => set("commission_fixed_pence", clamp(String(Number(e.target.value) * 100), CREATOR_LIMITS.fixedMaxPence))} aria-label="Fixed payout in pounds" /></label>
            )}
            <select aria-label="Which purchases earn" className={inlineSelect} value={draft.commission_scope} onChange={(e) => set("commission_scope", e.target.value as CreatorLink["commission_scope"])}>
              {Object.entries(SCOPE_LABEL).map(([id, label]) => <option key={id} value={id}>{label[0].toUpperCase() + label.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" className="gap-2" disabled={!dirty} onClick={() => void save()}><Save className="h-4 w-4" aria-hidden /> Save link</Button>
        <Button type="button" size="sm" variant="outline" className="gap-2" aria-expanded={showMoney} onClick={() => setShowMoney((v) => !v)}>
          <ChevronDown className={`h-4 w-4 transition-transform ${showMoney ? "rotate-180" : ""}`} aria-hidden /> Per-interview economics
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        {status && <span role="status" className="text-xs">{status}</span>}
      </div>
      {showMoney && <SaleBreakdown link={draft} costs={overview.costs} />}
    </article>
  );
}

function AddLink({ creator, onSaved }: { creator: Creator; onSaved: (link: CreatorLink) => void }) {
  const [code, setCode] = useState("");
  const [platform, setPlatform] = useState<CreatorPlatform>(creator.creator_links[0]?.platform ?? "medicine");
  const [status, setStatus] = useState("");
  async function add() {
    if (!isValidReferralCode(code)) { setStatus("Use 3-24 lower-case letters, numbers or single hyphens."); return; }
    try {
      onSaved(await creatorApi.saveLink({ creator_id: creator.id, code, platform, ...DEFAULT_LINK_TERMS }));
      setCode("");
      setStatus("");
    } catch (e) {
      setStatus(/duplicate/i.test(message(e, "")) ? "That code is already taken." : message(e, "The link could not be added."));
    }
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed p-3">
      <label className="text-sm font-medium">New link code<Input className="mt-1 w-48" value={code} maxLength={CREATOR_LIMITS.codeMax} onChange={(e) => setCode(normaliseCode(e.target.value))} /></label>
      <label className="text-sm font-medium">Platform
        <select className={`${inlineSelect} mt-1 block`} value={platform} onChange={(e) => setPlatform(e.target.value as CreatorPlatform)}>
          <option value="medicine">Medicine</option><option value="11plus">11+</option>
        </select>
      </label>
      <Button type="button" variant="outline" className="gap-2" onClick={() => void add()}><Plus className="h-4 w-4" aria-hidden /> Add link</Button>
      {status && <p role="alert" className="w-full text-sm text-destructive">{status}</p>}
    </div>
  );
}

function PayCreator({ creator, readyPence, onPaid }: { creator: Creator; readyPence: number; onPaid: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const canPay = creator.payout_status === "verified" && readyPence > 0;
  async function pay() {
    setBusy(true);
    try {
      const result = await creatorApi.pay(creator.id);
      setStatus(`Sent ${formatPence(result.amountPence)} to ${creator.name}'s Stripe account.`);
      setConfirming(false);
      onPaid();
    } catch (e) {
      setStatus(message(e, "The payout could not be sent."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">Ready to pay (past the {CREATOR_LIMITS.holdDays}-day hold)</p>
      <p className="text-2xl font-semibold tabular-nums">{formatPence(readyPence)}</p>
      {!confirming ? (
        <Button type="button" className="gap-2" disabled={!canPay} onClick={() => setConfirming(true)}><Send className="h-4 w-4" aria-hidden /> Pay {formatPence(readyPence)}</Button>
      ) : (
        <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
          <p>Transfer <strong>{formatPence(readyPence)}</strong> from your Stripe balance to {creator.name}'s connected account? This moves real money.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void pay()}>{busy ? "Sending…" : "Confirm transfer"}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {!canPay && <p className="text-xs text-muted-foreground">{creator.payout_status !== "verified" ? `Waiting for the creator: ${PAYOUT_LABEL[creator.payout_status].toLowerCase()}.` : "Nothing is past the hold yet."}</p>}
      {status && <p role="status" className="text-sm">{status}</p>}
    </div>
  );
}

/** Creators tab: invite, edit terms per link, see per-interview economics and pay out. */
export function AdminCreatorEditor({
  creators, overview, selectedId, onSelect, onChanged, onPreview, platform,
}: {
  creators: Creator[];
  overview: AdminOverview;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChanged: () => void;
  onPreview: (id: string) => void;
  platform: "all" | CreatorPlatform;
}) {
  const shown = creators.filter((c) => platform === "all" || c.creator_links.some((l) => l.platform === platform) || !c.creator_links.length);
  const selected = creators.find((c) => c.id === selectedId) ?? shown[0];
  const readyFor = (c: Creator) => c.creator_links.reduce((n, l) => n + (overview.links.find((s) => s.linkId === l.id)?.readyPence ?? 0), 0);
  const [email, setEmail] = useState(selected?.email ?? "");
  const [status, setStatus] = useState("");
  useEffect(() => { setEmail(selected?.email ?? ""); setStatus(""); }, [selected?.id, selected?.email]);
  const update = async (patch: Partial<Pick<Creator, "email" | "status">>) => {
    try { await creatorApi.updateCreator(selected!.id, patch); setStatus("Saved."); onChanged(); }
    catch (e) { setStatus(message(e, "Could not save.")); }
  };
  const origin = selected?.creator_links[0]?.platform === "11plus" ? SCHOOL_ORIGIN : MEDICINE_ORIGIN;
  const invite = selected && `Hi ${selected.name}, you're set up as a creator. Sign in at ${origin}/creator with ${selected.email} to see your links and earnings, and to set up payouts with Stripe.`;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-3">
        <InviteForm onCreated={(c) => { onChanged(); onSelect(c.id); }} />
        <ul aria-label="Creators" className="space-y-2">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onSelect(c.id)} aria-current={selected?.id === c.id ? "true" : undefined}
                className={`w-full rounded-xl border p-3 text-left hover:bg-muted/50 ${selected?.id === c.id ? "border-primary bg-primary/5" : ""}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[c.status]}`}>{CREATOR_STATUS_LABEL[c.status]}</span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{c.creator_links.length} link{c.creator_links.length === 1 ? "" : "s"} · ready {formatPence(readyFor(c))} · {PAYOUT_LABEL[c.payout_status]}</span>
              </button>
            </li>
          ))}
          {!shown.length && <li className="text-sm text-muted-foreground">No creators yet.</li>}
        </ul>
      </aside>
      {selected && (
        <section aria-label={`Creator ${selected.name}`} className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">{selected.user_id ? "Signed in to their creator dashboard" : "Not signed in yet"} · {PAYOUT_LABEL[selected.payout_status]}</p>
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={() => onPreview(selected.id)}><Eye className="h-4 w-4" aria-hidden /> See their dashboard</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="space-y-3">
              <label className="block text-sm font-medium">Account status
                <select className={`${selectClass} mt-1`} value={selected.status} onChange={(e) => void update({ status: e.target.value as CreatorStatus })}>
                  {Object.entries(CREATOR_STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">Paused: links still open the site, but discounts, new referrals and new earnings stop.</span>
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 text-sm font-medium">Email they sign in with
                  <Input className="mt-1" type="email" value={email} disabled={!!selected.user_id} onChange={(e) => setEmail(e.target.value)} />
                </label>
                {!selected.user_id && email.trim().toLowerCase() !== selected.email && <Button type="button" variant="outline" onClick={() => void update({ email: email.trim().toLowerCase() })}>Save email</Button>}
              </div>
              {invite && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Invite message</p>
                  <p className="mt-1">{invite}</p>
                  <div className="mt-2"><CopyButton text={invite} label="Copy message" /></div>
                </div>
              )}
              {status && <p role="status" className="text-sm">{status}</p>}
            </div>
            <PayCreator creator={selected} readyPence={readyFor(selected)} onPaid={onChanged} />
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Links and terms</h3>
            {selected.creator_links.map((l) => <LinkEditor key={l.id} link={l} overview={overview} onSaved={onChanged} />)}
            <AddLink creator={selected} onSaved={onChanged} />
          </div>
        </section>
      )}
    </div>
  );
}
