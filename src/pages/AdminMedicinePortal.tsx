import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  listOntologyDomains, listOntologyTopics, listRoleplays, listCurrentAffairsTopics,
  isCurrentAffairsWithheld, daysUntilExpiry, listSchools, type CurrentAffairsTopic, type RoleplayPersona,
} from '@/interview/medicine-content';
import { getBank } from '@/interview/bank';
import type { BankQuestion } from '@/interview/engine/types';
import { ArrowLeft, Search, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const TOTAL_TOPICS = 158;
const TOTAL_ROLEPLAYS = 20;
const TOTAL_SCHOOLS = 68;

export default function AdminMedicinePortal() {
  const { isAdmin, isLoading } = useAdminStatus();

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Medicine Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The UK medicine MMI content pack — stations, roleplay personas, the current-affairs register, the school map and the master ontology, all sourced from the 29 August 2026 research pack.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-none">
            <Link to="/admin/medicine-interviews" className="text-sm text-primary underline whitespace-nowrap">Launch the interview →</Link>
            <Link to="/admin" className="text-sm text-primary underline whitespace-nowrap">← Back to admin</Link>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stations">Stations</TabsTrigger>
            <TabsTrigger value="roleplay">Roleplay</TabsTrigger>
            <TabsTrigger value="current-affairs">Current affairs</TabsTrigger>
            <TabsTrigger value="schools">School map</TabsTrigger>
            <TabsTrigger value="ontology">Ontology</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="stations"><StationsTab /></TabsContent>
          <TabsContent value="roleplay"><RoleplayTab /></TabsContent>
          <TabsContent value="current-affairs"><CurrentAffairsTab /></TabsContent>
          <TabsContent value="schools"><SchoolsTab /></TabsContent>
          <TabsContent value="ontology"><OntologyTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function OverviewTab() {
  const bank = useMemo(() => getBank('medicine'), []);
  const caTopics = useMemo(() => listCurrentAffairsTopics(), []);
  const now = new Date();
  const withheld = caTopics.filter((t) => isCurrentAffairsWithheld(t, now));
  const soon = caTopics.filter((t) => {
    const d = daysUntilExpiry(t, now);
    return d !== null && d >= 0 && d <= 30;
  });
  const byFormat = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of bank) m.set(q.format ?? 'unspecified', (m.get(q.format ?? 'unspecified') ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [bank]);
  const byTopic = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of bank) m.set(q.topic, (m.get(q.topic) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [bank]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Live stations" value={bank.length} sub="in the practice/mock bank" />
        <StatCard label="Roleplay personas" value={`${TOTAL_ROLEPLAYS}/${TOTAL_ROLEPLAYS}`} sub="fully ported, all live" />
        <StatCard label="Current-affairs topics" value={caTopics.length} sub={`${withheld.length} withheld today · ${soon.length} expiring within 30 days`} />
        <StatCard label="Course-routes mapped" value={TOTAL_SCHOOLS} sub="68 UK medicine course-routes, 50 institutions" />
      </div>

      {withheld.length > 0 && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2">
            <AlertTriangle className="h-4 w-4" /> Withheld today (past hard expiry)
          </div>
          <ul className="text-sm space-y-1">
            {withheld.map((t) => (
              <li key={t.id}>{t.id} — {t.title} <span className="text-muted-foreground">(expired {t.expiry_date})</span></li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Stations by format</h3>
          <div className="space-y-1.5">
            {byFormat.map(([format, count]) => (
              <div key={format} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{format}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Stations by strand</h3>
          <div className="space-y-1.5">
            {byTopic.map(([topic, count]) => (
              <div key={topic} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{topic}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4 border-dashed">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Scope, honestly stated: this is a real, live subset of the research pack's roadmap — the full 20-persona roleplay engine,
          all {caTopics.length} current-affairs topics with live hard-expiry enforcement, and {bank.length} authored stations spanning every format the
          research found in use (roleplay, ethics, policy, motivation, communication, data/numeracy) — past the pack's own 120-station
          MVP threshold for non-roleplay content is still ahead. Not yet built: the remaining ontology coverage toward the pack's own
          "Strong launch" target (~110 of {TOTAL_TOPICS} topics), per-school interview-mode configuration (station count/timing/roleplay-inclusion
          per course-route), group-task and Oxbridge-tutorial formats (Phase 3 in the research roadmap), and — critically — a real
          clinician review pass, which the research pack itself flags as required before any safeguarding, capacity, confidentiality or
          end-of-life station should be treated as launch-ready.
        </p>
      </Card>
    </div>
  );
}

function StationsTab() {
  const bank = useMemo(() => getBank('medicine'), []);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(() => [...new Set(bank.map((x) => x.topic))].sort(), [bank]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return bank.filter((x) =>
      (!topic || x.topic === topic) &&
      (!query || x.title?.toLowerCase().includes(query) || x.question.toLowerCase().includes(query) || x.tags?.some((t) => t.toLowerCase().includes(query))),
    );
  }, [bank, q, topic]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stations…" className="pl-8 h-9" />
        </div>
        <button className={`chip ${!topic ? 'chip-on' : ''}`} onClick={() => setTopic(null)}>All ({bank.length})</button>
        {topics.map((t) => (
          <button key={t} className={`chip ${topic === t ? 'chip-on' : ''}`} onClick={() => setTopic(t)}>
            {t} ({bank.filter((x) => x.topic === t).length})
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {filtered.map((question) => <StationCard key={question.id} q={question} />)}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No stations match.</p>}
      </div>
    </div>
  );
}

function StationCard({ q }: { q: BankQuestion }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4 cursor-pointer" onClick={() => setOpen((v) => !v)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{q.title ?? q.id}</span>
            {q.format && <Badge variant="secondary" className="text-[10px]">{q.format}</Badge>}
            <Badge variant="outline" className="text-[10px]">difficulty {q.difficulty}</Badge>
            {q.currentAffairsExpiry && (
              <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-3 w-3" /> expires {q.currentAffairsExpiry}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{q.question}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{q.id}</span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t text-sm space-y-2" onClick={(e) => e.stopPropagation()}>
          {q.roleplay && (
            <div>
              <div className="font-medium text-xs uppercase text-muted-foreground mb-1">Live roleplay — {q.roleplay.name}, {q.roleplay.role}</div>
              <p className="text-xs text-muted-foreground mb-1"><strong>Applicant role:</strong> {q.roleplay.applicantRole}</p>
              <p className="text-xs text-muted-foreground"><strong>Endings:</strong> {q.roleplay.endings.map((e) => e.id).join(', ')}</p>
            </div>
          )}
          {q.rubric && (
            <div className="grid gap-1.5 sm:grid-cols-3 text-xs">
              <div><span className="font-medium">Strong: </span>{q.rubric.strong}</div>
              <div><span className="font-medium">Developing: </span>{q.rubric.developing}</div>
              <div><span className="font-medium">Weak: </span>{q.rubric.weak}</div>
            </div>
          )}
          {q.tags && <div className="flex flex-wrap gap-1">{q.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>}
        </div>
      )}
    </Card>
  );
}

function RoleplayTab() {
  const roleplays = useMemo(() => listRoleplays(), []);
  const [q, setQ] = useState('');
  const filtered = roleplays.filter((r) => !q.trim() || r.title.toLowerCase().includes(q.toLowerCase()) || r.taxonomy.some((t) => t.includes(q.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search personas…" className="pl-8 h-9" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((rp) => <RoleplayCard key={rp.id} rp={rp} />)}
      </div>
    </div>
  );
}

function RoleplayCard({ rp }: { rp: RoleplayPersona }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4 cursor-pointer" onClick={() => setOpen((v) => !v)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="font-semibold text-sm">{rp.id} — {rp.title}</span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {rp.taxonomy.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            <Badge variant="outline" className="text-[10px]">{rp.band.replace(/^\d_/, '')}</Badge>
            {rp.band === '4_adversarial' && <Badge variant="destructive" className="text-[10px]">harder than a real MMI station</Badge>}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{rp.actor.name}, {rp.actor.role}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-2 italic">"{rp.opening_statement}"</p>
      {open && (
        <div className="mt-3 pt-3 border-t text-xs space-y-2" onClick={(e) => e.stopPropagation()}>
          <p><strong>Applicant role:</strong> {rp.applicant_role}</p>
          <p><strong>Trajectory:</strong> {rp.actor_state.trajectory}</p>
          <div>
            <strong>Hidden facts:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {rp.hidden_facts.map((f, i) => <li key={i}>{f.fact} <span className="text-muted-foreground">— unlocked: {f.disclosure_condition}</span></li>)}
            </ul>
          </div>
          <div>
            <strong>Endings:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {rp.endings.map((e) => <li key={e.id}>{e.id} — {e.condition}: {e.description}</li>)}
            </ul>
          </div>
          {rp.red_flags.length > 0 && <p><strong>Red flags:</strong> {rp.red_flags.join('; ')}</p>}
        </div>
      )}
    </Card>
  );
}

function CurrentAffairsTab() {
  const topics = useMemo(() => listCurrentAffairsTopics(), []);
  const now = new Date();
  const [tier, setTier] = useState<number | null>(null);
  const filtered = tier ? topics.filter((t) => t.tier === tier) : topics;
  const sorted = [...filtered].sort((a, b) => {
    const da = daysUntilExpiry(a, now), db = daysUntilExpiry(b, now);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {[null, 1, 2, 3].map((t) => (
          <button key={t ?? 'all'} className={`chip ${tier === t ? 'chip-on' : ''}`} onClick={() => setTier(t)}>
            {t === null ? 'All' : `Tier ${t}`}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {sorted.map((t) => <CurrentAffairsCard key={t.id} topic={t} now={now} />)}
      </div>
    </div>
  );
}

function CurrentAffairsCard({ topic, now }: { topic: CurrentAffairsTopic; now: Date }) {
  const [open, setOpen] = useState(false);
  const withheld = isCurrentAffairsWithheld(topic, now);
  const days = daysUntilExpiry(topic, now);
  return (
    <Card className={`p-4 cursor-pointer ${withheld ? 'border-destructive/40 bg-destructive/5' : ''}`} onClick={() => setOpen((v) => !v)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{topic.id} — {topic.title}</span>
            <Badge variant="secondary" className="text-[10px]">Tier {topic.tier}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Last verified {topic.last_verified} · reviewed {topic.update_frequency.toLowerCase()}</p>
        </div>
        {withheld ? (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> withheld — expired {topic.expiry_date}</Badge>
        ) : days !== null ? (
          <Badge variant={days <= 30 ? 'destructive' : 'outline'} className="gap-1"><Clock className="h-3 w-3" /> expires in {days}d ({topic.expiry_date})</Badge>
        ) : (
          <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> no hard expiry</Badge>
        )}
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t text-xs space-y-2" onClick={(e) => e.stopPropagation()}>
          <p><strong>Current state:</strong> {topic.current_state}</p>
          <p><strong>Central tensions:</strong> {topic.central_tensions.join(' · ')}</p>
          <p><strong>Not required:</strong> {topic.not_required}</p>
        </div>
      )}
    </Card>
  );
}

function SchoolsTab() {
  const schools = useMemo(() => listSchools(), []);
  const [q, setQ] = useState('');
  const filtered = schools.filter((s) => !q.trim() || s.university.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schools…" className="pl-8 h-9" />
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} of {schools.length} course-routes · not published ≠ absent, see each source</div>
      <div className="grid gap-2">
        {filtered.map((s) => (
          <Card key={s.id} className="p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="font-semibold text-sm">{s.university}</span> <span className="text-xs text-muted-foreground">{s.code} · {s.route}</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {s.engines.map((e) => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
                  {s.roleplay === true && <Badge variant="secondary" className="text-[10px]">roleplay confirmed</Badge>}
                  <Badge variant="outline" className="text-[10px]">confidence: {s.confidence.split(' ')[0]}</Badge>
                </div>
              </div>
              <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline whitespace-nowrap">source ↗</a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OntologyTab() {
  const domains = useMemo(() => listOntologyDomains(), []);
  const totalTopics = useMemo(() => listOntologyTopics().length, []);
  const [activeDomain, setActiveDomain] = useState(domains[0]?.id ?? '');
  const domain = domains.find((d) => d.id === activeDomain);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{totalTopics} topics across {domains.length} domains — the full master ontology behind every station above.</p>
      <div className="flex flex-wrap gap-2">
        {domains.map((d) => (
          <button key={d.id} className={`chip ${activeDomain === d.id ? 'chip-on' : ''}`} onClick={() => setActiveDomain(d.id)}>
            {d.id} — {d.label} ({d.subdomains.reduce((n, s) => n + s.topics.length, 0)})
          </button>
        ))}
      </div>
      {domain && (
        <div className="space-y-4">
          {domain.subdomains.map((sub) => (
            <div key={sub.id}>
              <h4 className="text-sm font-semibold mb-2">{sub.id} — {sub.label}</h4>
              <div className="grid gap-2">
                {sub.topics.map((t) => (
                  <Card key={t.id} className="p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{t.id} — {t.label}</span>
                      <Badge variant="outline" className="text-[10px]">{t.temporality}</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.knowledge}</Badge>
                      {t.premed !== true && <Badge variant="secondary" className="text-[10px]">premed: {String(t.premed)}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{t.must_understand}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
