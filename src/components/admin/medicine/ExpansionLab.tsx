import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronRight, Circle, Clock3, FlaskConical, Pause, Play, Radio, RotateCcw, Search, Terminal } from 'lucide-react';
import research from '@/interview/medicine-content/expansion/research.json';
import rawDrafts from '@/data/interview-staging/medicine-expansion.json';
import './expansion-lab.css';
import { MedicineTheme } from '@/components/medicine-dashboard/MedicineTheme';
import CircuitWorkbench from './CircuitWorkbench';
import SchoolEvidenceExplorer from './SchoolEvidenceExplorer';
import './expansion-workbench.css';

export interface MedicineDraft {
  id: string; title: string; subject: string; topic: string; difficulty: number; tags: string[];
  tracks: string[]; status: 'draft'; question: string; answer: string; dateAdded: string;
  liveProbes: { probe: string; goodResponse: string }[];
  rubric: { strong: string; developing: string; weak: string };
  reviewRequired: string[]; originality: string;
}
interface CheckState {
  state: string; check: string | null; startedAt: string | null; finishedAt: string | null;
  exitCode: number | null;
  logs: { at: string; text: string; stream: string }[];
  runs: { check: string; state: string; finishedAt: string; exitCode: number | null }[];
}
const drafts = rawDrafts as MedicineDraft[];
const emptyChecks: CheckState = { state: 'idle', check: null, startedAt: null, finishedAt: null, exitCode: null, logs: [], runs: [] };
const sourceById = new Map(research.sources.map((s) => [s.id, s]));
const REVIEW_KEY = 'intrvue:medicine-expansion-review:v1';
type ReviewNotes = Record<string, { note: string; decision: string; updatedAt: string }>;
function loadNotes(): ReviewNotes {
  try {
    const value = JSON.parse(localStorage.getItem(REVIEW_KEY) ?? '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter(([id, note]) => drafts.some((q) => q.id === id) && note && typeof note === 'object' && typeof (note as ReviewNotes[string]).note === 'string')) as ReviewNotes;
  } catch { return {}; }
}
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function expansionInfographicSvg() {
  const schoolRows = research.schools.map((s, i) => `<g transform="translate(60 ${310 + i * 117})"><text fill="#faf5ed" font-size="29" font-weight="700">${s.name}</text><text y="33" fill="#c2c8cf" font-size="18">${s.format}</text><text x="570" fill="#f8a885" font-size="29" font-weight="700">${s.metric.display}</text><text x="570" y="28" fill="#c2c8cf" font-size="14">${s.metric.label}</text><text x="570" y="49" fill="#8995a5" font-size="12">${s.metric.cycle.replace('→', 'to')}</text><path d="M0 77H800" stroke="#344354"/></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="930" viewBox="0 0 920 930"><rect width="920" height="930" fill="#142538"/><g font-family="Arial, sans-serif"><text x="60" y="62" fill="#f8a885" font-size="14" letter-spacing="3">INTRVUE.AI / MEDICINE RESEARCH / 15 SEP 2026</text><text x="60" y="125" fill="#faf5ed" font-size="48" font-weight="700">Three schools. A sharper start.</text><text x="60" y="162" fill="#c2c8cf" font-size="19">Founder priorities · shared original practice bank · review before release</text><rect x="60" y="199" width="800" height="65" rx="12" fill="#23384c"/><text x="80" y="239" fill="#faf5ed" font-size="21">122 existing stations  /  ${drafts.length} new drafts  /  3 priority schools</text>${schoolRows}<text x="60" y="704" fill="#f8a885" font-size="16" font-weight="700">FORMAT FACTS</text><text x="60" y="738" fill="#e7e9ed" font-size="17">Oxford: two colleges. Cambridge: college-specific arrangements.</text><text x="60" y="768" fill="#e7e9ed" font-size="17">Imperial: 5-minute answers; 6 content / 4 communication marks.</text><text x="60" y="811" fill="#c2c8cf" font-size="14">This is a priority map, not a UK selectivity ranking. Cycles and metrics differ.</text><text x="60" y="840" fill="#c2c8cf" font-size="13">Sources: Oxford A100 admissions statistics; Cambridge 2025 report, Table 1.1;</text><text x="60" y="860" fill="#c2c8cf" font-size="13">Imperial Medicine admissions and course pages. Full links in the lab's source ledger.</text><text x="60" y="895" fill="#8995a5" font-size="12">Oxford evidence: official indexed text; direct page revalidation pending. Drafts await human review.</text></g></svg>`;
}

export default function ExpansionLab({ standalone = false }: { standalone?: boolean }) {
  const [checks, setChecks] = useState<CheckState>(emptyChecks);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [school, setSchool] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [reveal, setReveal] = useState(false);
  const [notes, setNotes] = useState<ReviewNotes>(loadNotes);
  const [saveError, setSaveError] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(300);
  const deadline = useRef(0);
  const terminal = useRef<HTMLPreElement>(null);
  const isDev = import.meta.env.DEV;
  const filtered = useMemo(() => drafts.filter((q) => (school === 'all' || q.tracks.includes(school === 'imperial' ? 'mmi' : 'academic')) && `${q.title} ${q.topic} ${q.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [school, query]);
  const selected = filtered.find((q) => q.id === selectedId) ?? filtered[0];
  const duration = school === 'imperial' ? 300 : 480;
  useEffect(() => { setRunning(false); setSeconds(duration); setReveal(false); }, [selected?.id, duration]);
  useEffect(() => {
    if (!running) return;
    const tick = () => { const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setSeconds(left); if (!left) setRunning(false); };
    const id = window.setInterval(tick, 250); return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!isDev) return;
    let cancelled = false; const abort = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch('/__medicine-lab/status', { cache: 'no-store', signal: abort.signal });
        if (!response.ok) throw new Error('Local check service unavailable');
        const value: CheckState = await response.json();
        if (!Array.isArray(value.logs)) throw new Error('Local check service unavailable');
        if (!cancelled) { setChecks(value); setConnected(true); }
      } catch { if (!cancelled) setConnected(false); }
    };
    void poll(); const id = window.setInterval(poll, 1500);
    return () => { cancelled = true; abort.abort(); clearInterval(id); };
  }, [isDev]);
  useEffect(() => { if (terminal.current) terminal.current.scrollTop = terminal.current.scrollHeight; }, [checks.logs.length]);
  async function runCheck(check: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/__medicine-lab/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Could not start check');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start check'); }
    finally { setBusy(false); }
  }
  function updateNote(patch: Partial<ReviewNotes[string]>) {
    if (!selected) return;
    const next = { ...notes, [selected.id]: { note: '', decision: 'unreviewed', ...notes[selected.id], ...patch, updatedAt: new Date().toISOString() } };
    setNotes(next);
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(next)); setSaveError(''); } catch { setSaveError('Notes could not be saved in this browser. Export your review to keep them.'); }
  }
  const reviewed = Object.values(notes).filter((n) => n.decision && n.decision !== 'unreviewed').length;
  return (
    <MedicineTheme><div className={`med-lab ${standalone ? 'med-lab-standalone' : ''}`}>
      <div className="lab-masthead"><a href="/admin/medicine-portal" className="lab-brand">intrvue<span>.</span><small>MEDICINE / RESEARCH DESK</small></a><div className={`lab-connection ${connected ? 'is-connected' : ''}`}><i />{connected ? 'LOCAL FEED CONNECTED' : isDev ? 'CONNECTING TO LOCAL FEED' : 'SAVED RESEARCH EDITION'}</div></div>
      <div className="lab-edition"><span>EDITION {research.edition} / 15 SEPTEMBER 2026</span><span>RESEARCH → DRAFT → REVIEW → RELEASE</span></div>
      <header className="lab-hero">
        <div><div className="lab-eyebrow"><Radio size={15} /> THE EXPANSION JOURNAL</div><h1>Better preparation.<br /><em>Built in the open.</em></h1><p>Oxford, Cambridge and Imperial first. Follow the research, explore original stations and watch the checks as they happen.</p><div className="lab-hero-actions"><a className="lab-primary" href="#rehearsal">Open the rehearsal desk <ArrowUpRight size={17} /></a><button className="lab-text-button" onClick={() => download('medicine-research-infographic.svg', expansionInfographicSvg(), 'image/svg+xml')}>Infographic <ArrowDownToLine size={16} /></button></div></div>
        <div className="lab-map" aria-label="Content expansion infographic"><div className="lab-map-heading">ONE SHARED BANK. TWO PRACTICE TRACKS.<FlaskConical size={18}/></div><div className="lab-map-bank"><span>{research.baseline.stations}</span><div>existing stations<small>repository count</small></div><b>+ {drafts.length} drafts</b></div><div className="lab-map-fork"><span>ACADEMIC CONVERSATION</span><span>TIMED MMI</span></div><div className="lab-map-schools"><div><b>Oxford</b><small>Explore & reason</small></div><div><b>Cambridge</b><small>Apply & adapt</small></div><div><b>Imperial</b><small>Explain & reflect</small></div></div><div className="lab-map-foot"><Circle size={12}/> Every new station stays in review until released</div></div>
      </header>
      <div className="lab-stat-strip">{[[research.baseline.institutions, 'institution labels mapped'], [research.sources.filter((s) => s.access.startsWith('Full') || s.access.startsWith('Official PDF')).length, 'full sources retrieved'], [drafts.length, 'original draft stations'], [reviewed, 'your review decisions']].map(([n,l]) => <div key={l}><strong>{n}</strong><span>{l}</span></div>)}</div>
      <nav className="lab-jump-nav" aria-label="Research desk sections"><a href="#build-updates">Latest updates</a><a href="#circuit-builder">Circuit builder</a><a href="#rehearsal">Draft review</a><a href="#school-evidence">School evidence</a></nav>
      <section className="lab-section"><div className="lab-section-title"><h2>The first three</h2><span>FOUNDER PRIORITY ORDER</span></div><div className="lab-school-grid">{research.schools.map((s) => <article className="lab-school-card" key={s.id}><div className="lab-school-number">0{s.priority}<ArrowUpRight size={19}/></div><h3>{s.name}</h3><div className="lab-school-format">{s.format}</div><p>{s.summary}</p><dl>{s.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd><a href={sourceById.get(f.source)?.url} target="_blank" rel="noreferrer">{f.value} ↗</a></dd></div>)}</dl><div className="lab-metric"><strong>{s.metric.display}</strong><div>{s.metric.label}<small>{s.metric.cycle}</small></div></div><details><summary>Evidence & open questions</summary><p>{s.unknowns}</p><p>{s.metric.note}</p><p>{s.metric.population}</p>{s.sourceIds.map((id) => { const source = sourceById.get(id)!; return <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗<small>{source.access}</small></a>; })}</details></article>)}</div><p className="lab-comparison-note">{research.comparisonNote}</p></section>
      <div className="lab-live-grid" id="build-updates">
        <section className="lab-section"><div className="lab-section-title"><h2>From the desk</h2><span>RESEARCH & BUILD UPDATES</span></div><div className="lab-news">{checks.runs.slice(-2).reverse().map((run,i) => <article key={`${run.finishedAt}-${i}`}><div className="lab-news-meta">CHECK {run.state.toUpperCase()} · {new Date(run.finishedAt).toLocaleTimeString('en-GB')}</div><h3>{run.check === 'content' ? 'Content integrity' : run.check === 'types' ? 'TypeScript validation' : 'Regression tests'} {run.state}</h3><p>Actual local process finished with exit code {run.exitCode ?? 'unavailable'}. Full output appears in the run log.</p></article>)}{research.updates.map((item) => <article key={item.id}><div className="lab-news-meta">{item.category} · {item.date}</div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
        <section className="lab-terminal-card"><div className="lab-terminal-heading"><span><Terminal size={17}/> Live run log</span><b className={`lab-run-${checks.state}`}>{checks.state === 'running' ? 'RUNNING' : checks.state.toUpperCase()}</b></div><div className="lab-check-buttons">{[['content','Content checks'],['types','Typecheck'],['tests','Tests']].map(([id,label]) => <button key={id} onClick={() => void runCheck(id)} disabled={!connected || busy || checks.state === 'running'}><Play size={12}/>{label}</button>)}</div><pre ref={terminal} className="lab-terminal" aria-label="Check output">{checks.logs.length ? checks.logs.map((line,i) => <span key={i} className={line.stream === 'stderr' ? 'lab-log-error' : ''}>{`[${new Date(line.at).toLocaleTimeString('en-GB')}] ${line.text.trimEnd()}\n`}</span>) : <span>{isDev ? 'Ready for a run. Choose a check above.\nOnly output from real local processes appears here.' : 'Live checks run in the local development lab.\nThis published page displays the research edition.'}</span>}</pre><div className="lab-terminal-footer" role="status">{error || (connected ? 'Connected to this computer · refreshes every 1.5 seconds' : 'Local check service is not connected')}</div></section>
      </div>
      <CircuitWorkbench />
      <section className="lab-section lab-rehearsal" id="rehearsal"><div className="lab-section-title"><div><h2>The rehearsal desk</h2><p>Original drafts for manual testing. Feedback criteria are authored guidance; this preview does not generate an AI assessment.</p></div><span>{filtered.length} DRAFTS</span></div><div className="lab-filters"><div className="lab-school-filter">{['all','oxford','cambridge','imperial'].map((s) => <button key={s} aria-pressed={school === s} className={school === s ? 'active' : ''} onClick={() => setSchool(s)}>{s === 'all' ? 'All drafts' : s}</button>)}</div><label className="lab-search"><Search size={16}/><input aria-label="Search draft stations" placeholder="Search skill or station…" value={query} onChange={(e) => setQuery(e.target.value)}/></label></div>
        {selected ? <div className="lab-desk-grid"><div className="lab-draft-list" aria-label="Draft stations">{filtered.map((q) => <button key={q.id} className={q.id === selected.id ? 'selected' : ''} onClick={() => setSelectedId(q.id)}><span>{q.topic.replace(/-/g,' ')} · {q.difficulty === 3 ? 'stretch' : 'standard'}</span><b>{q.title}</b><small>{notes[q.id]?.decision === 'needs-revision' ? 'Revision requested' : notes[q.id]?.decision === 'ready-for-review' ? 'Ready for editorial review' : 'Awaiting review'} <ChevronRight size={14}/></small></button>)}</div><article className="lab-draft-detail"><div className="lab-draft-top"><span className="lab-draft-badge">ORIGINAL · DRAFT</span><span>{selected.id}</span></div><h3>{selected.title}</h3><p className="lab-candidate-prompt">{selected.question}</p><div className="lab-timer"><div><Clock3 size={18}/><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong><small>{school === 'imperial' ? 'Published Imperial answer time' : '8-minute practice budget · editorial choice'}</small></div><button aria-label={running ? 'Pause timer' : 'Start timer'} disabled={!seconds && !running} onClick={() => { if (!running) deadline.current = Date.now() + seconds * 1000; setRunning(!running); }}>{running ? <Pause size={17}/> : <Play size={17}/>}</button><button aria-label="Reset timer" onClick={() => { setRunning(false); setSeconds(duration); }}><RotateCcw size={16}/></button></div><button className="lab-reveal" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide' : 'Reveal'} assessor notes & follow-ups <ChevronRight size={16}/></button>{reveal && <div className="lab-assessor"><h4>Reasoning to look for</h4><p>{selected.answer}</p><h4>Follow-up ladder</h4><ol>{selected.liveProbes.map((p) => <li key={p.probe}><b>{p.probe}</b><p>{p.goodResponse}</p></li>)}</ol>{Object.entries(selected.rubric).map(([band,text]) => <p key={band}><b>{band}: </b>{text}</p>)}<p><b>Review needed: </b>{selected.reviewRequired.join(', ')}.</p></div>}<label className="lab-review-label" htmlFor="review-note">Reviewer notes <small>Saved in this browser</small></label><textarea id="review-note" rows={3} value={notes[selected.id]?.note ?? ''} placeholder="Does the prompt work aloud? Is the reasoning fair? What needs changing?" onChange={(e) => updateNote({ note: e.target.value })}/><div className="lab-review-actions"><select aria-label="Draft review decision" value={notes[selected.id]?.decision ?? 'unreviewed'} onChange={(e) => updateNote({ decision: e.target.value })}><option value="unreviewed">Not yet reviewed</option><option value="needs-revision">Needs revision</option><option value="ready-for-review">Ready for editorial review</option></select><button onClick={() => download('medicine-draft-review.json', JSON.stringify({ exportedAt: new Date().toISOString(), status: 'review-notes-only', notes },null,2),'application/json')}><ArrowDownToLine size={15}/> Export notes</button></div><p className="lab-save-note" role="status">{saveError || 'Review notes do not publish a station. Release uses the existing staged-content review process.'}</p></article></div> : <div className="lab-empty">No draft stations match this filter.</div>}
      </section>
      <SchoolEvidenceExplorer />
      <section className="lab-next"><div><span className="lab-eyebrow">THE NEXT RESEARCH QUEUE</span><h2>Follow the evidence.</h2><p>Before ranking further schools, collect comparable applications and offers by course, cycle and fee status.</p></div>{research.queue.map((s) => <article key={s.name}><span>{s.status}</span><h3>{s.name}</h3><p>{s.reason}</p><a href={s.sourceUrl} target="_blank" rel="noreferrer">Official source <ArrowUpRight size={15}/></a></article>)}</section>
      <section className="lab-section lab-sources"><div className="lab-section-title"><h2>Source ledger</h2><span>CHECKED {research.updatedAt}</span></div>{research.sources.map((s) => <details key={s.id}><summary><span>{s.title}</span><ArrowUpRight size={15}/></summary><p>{s.supports}</p><p>{s.access} · checked {s.checked}</p><a href={s.url} target="_blank" rel="noreferrer">Open official source ↗</a></details>)}</section>
      <footer className="lab-footer"><span>intrvue.ai / Medicine expansion</span><span>Research is versioned. Draft content awaits review.</span></footer>
    </div></MedicineTheme>
  );
}
