import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import {
  Terminal, X, Trash2, ChevronDown, ChevronUp, Pause, Play, Download,
  CircleAlert, TriangleAlert, Info, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { useDebugLog, useDebugPaused } from '@/interview/debug/useDebugLog';
import { clearDebugLog, setDebugPaused, type DebugEntry, type DebugSource } from '@/interview/debug/debugBus';

const SOURCES: DebugSource[] = ['brain', 'anam', 'deepgram', 'session'];

const SOURCE_COLOR: Record<DebugSource, string> = {
  brain: '#7DD3FC',
  anam: '#C4B5FD',
  deepgram: '#86EFAC',
  session: '#FCD34D',
};
const KIND_META: Record<DebugEntry['kind'], { color: string; icon: typeof CircleAlert }> = {
  request: { color: '#7DD3FC', icon: ArrowRight },
  response: { color: '#86EFAC', icon: ArrowLeft },
  error: { color: '#FCA5A5', icon: CircleAlert },
  info: { color: '#94A3B8', icon: Info },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function durationOf(entry: DebugEntry): number | null {
  const d = entry.detail as any;
  return typeof d?.durationMs === 'number' ? d.durationMs : null;
}

function DetailLine({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.detail !== undefined;
  const kindMeta = KIND_META[entry.kind];
  const KindIcon = kindMeta.icon;
  const ms = durationOf(entry);

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '5px 8px' }}>
      <div
        style={{ display: 'flex', gap: 8, alignItems: 'baseline', cursor: hasDetail ? 'pointer' : 'default' }}
        onClick={() => hasDetail && setOpen((o) => !o)}
      >
        <span style={{ color: '#64748B', flexShrink: 0 }}>{formatTime(entry.timestamp)}</span>
        <span style={{ color: SOURCE_COLOR[entry.source], flexShrink: 0, fontWeight: 700 }}>
          [{entry.source}]
        </span>
        <span style={{ color: kindMeta.color, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <KindIcon size={11} /> {entry.kind}
        </span>
        <span style={{ color: '#E2E8F0', overflowWrap: 'anywhere' }}>{entry.label}</span>
        {ms !== null && (
          <span style={{ color: ms > 2000 ? '#FCA5A5' : '#64748B', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {ms}ms
          </span>
        )}
        {hasDetail && (
          <span style={{ color: '#475569', marginLeft: 'auto', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
        )}
      </div>
      {open && hasDetail && (
        <pre
          style={{
            margin: '6px 0 2px 0',
            padding: 8,
            background: 'rgba(255,255,255,.04)',
            borderRadius: 6,
            color: '#CBD5E1',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            maxHeight: 260,
            overflow: 'auto',
          }}
        >
          {typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail, null, 2)}
        </pre>
      )}
    </div>
  );
}

function chipStyle(active: boolean, color: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 9px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? color : 'rgba(255,255,255,.12)'}`,
    color: active ? color : '#64748B',
    background: active ? `${color}1A` : 'transparent',
    whiteSpace: 'nowrap',
  };
}

/**
 * Live debug terminal for interview testing — shows every request/response to the interview-brain
 * (the "ChatGPT" calls), every line handed to Anam via client.talk(), and Deepgram mic/turn-detection
 * events + errors, as they happen. Admin/tester tool only — never mounted for a real student session
 * (gated by isAdmin at the call site in InterviewPlatform/InterviewPlatformV2).
 */
export function DebugConsole() {
  const entries = useDebugLog();
  const paused = useDebugPaused();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeSources, setActiveSources] = useState<Set<DebugSource>>(new Set(SOURCES));
  const [errorsOnly, setErrorsOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const errorCount = entries.filter((e) => e.kind === 'error').length;

  const filtered = useMemo(
    () => entries.filter((e) => activeSources.has(e.source) && (!errorsOnly || e.kind === 'error')),
    [entries, activeSources, errorsOnly],
  );

  const toggleSource = (s: DebugSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next.size === 0 ? new Set(SOURCES) : next; // never let it go fully empty
    });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-debug-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open || minimized) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [filtered, open, minimized]);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[60] gap-2 shadow-lg"
        title="Open debug console (Ctrl/Cmd + `)"
      >
        <Terminal className="w-4 h-4" />
        Debug
        {errorCount > 0 && (
          <span style={{ background: '#EF4444', color: 'white', borderRadius: 999, fontSize: 11, padding: '0 6px' }}>
            {errorCount}
          </span>
        )}
        {paused && <Pause className="w-3 h-3" style={{ color: '#FCD34D' }} />}
      </Button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col shadow-2xl"
      style={{
        width: 'min(620px, calc(100vw - 32px))',
        height: minimized ? 'auto' : 'min(480px, 65vh)',
        background: '#0B1120',
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        fontSize: 12.5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          background: '#111827',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <Terminal className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
        <span style={{ color: '#E2E8F0', fontWeight: 600 }}>Interview debug console</span>
        <span style={{ color: '#475569' }}>· {filtered.length}/{entries.length} events</span>
        {paused && <span style={{ color: '#FCD34D', fontWeight: 600 }}>· PAUSED</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => setDebugPaused(!paused)}
            title={paused ? 'Resume capture' : 'Pause capture'}
            style={{ background: 'none', border: 'none', color: paused ? '#FCD34D' : '#94A3B8', cursor: 'pointer', padding: 4 }}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleExport}
            title="Export filtered events as JSON"
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => clearDebugLog()}
            title="Clear"
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? 'Expand' : 'Minimize'}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
          >
            {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close"
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!minimized && (
        <>
          <div style={{ display: 'flex', gap: 6, padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,.06)', flexWrap: 'wrap' }}>
            {SOURCES.map((s) => (
              <span key={s} style={chipStyle(activeSources.has(s), SOURCE_COLOR[s])} onClick={() => toggleSource(s)}>
                {s}
              </span>
            ))}
            <span
              style={{ ...chipStyle(errorsOnly, '#FCA5A5'), marginLeft: 'auto' }}
              onClick={() => setErrorsOnly((v) => !v)}
            >
              <TriangleAlert size={11} /> errors only
            </span>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ color: '#475569', padding: 12 }}>
                {entries.length === 0 ? 'Waiting for interview activity…' : 'No events match these filters.'}
              </div>
            ) : (
              filtered.map((e) => <DetailLine key={e.id} entry={e} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
