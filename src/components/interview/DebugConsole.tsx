import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Terminal, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useDebugLog } from '@/interview/debug/useDebugLog';
import { clearDebugLog, type DebugEntry } from '@/interview/debug/debugBus';

const SOURCE_COLOR: Record<DebugEntry['source'], string> = {
  brain: '#7DD3FC', // sky — the ChatGPT/edge-function call
  anam: '#C4B5FD', // violet — the avatar (client.talk())
  deepgram: '#86EFAC', // green — mic / transcription
  session: '#FCD34D', // amber — connection/lifecycle
};
const KIND_COLOR: Record<DebugEntry['kind'], string> = {
  request: '#7DD3FC',
  response: '#86EFAC',
  error: '#FCA5A5',
  info: '#94A3B8',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function DetailLine({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.detail !== undefined;
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '4px 8px' }}>
      <div
        style={{ display: 'flex', gap: 8, alignItems: 'baseline', cursor: hasDetail ? 'pointer' : 'default' }}
        onClick={() => hasDetail && setOpen((o) => !o)}
      >
        <span style={{ color: '#64748B', flexShrink: 0 }}>{formatTime(entry.timestamp)}</span>
        <span style={{ color: SOURCE_COLOR[entry.source], flexShrink: 0, fontWeight: 700 }}>
          [{entry.source}]
        </span>
        <span style={{ color: KIND_COLOR[entry.kind], flexShrink: 0 }}>{entry.kind}</span>
        <span style={{ color: '#E2E8F0', overflowWrap: 'anywhere' }}>{entry.label}</span>
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

/**
 * Live debug terminal for interview testing — shows every request/response to the interview-brain
 * (the "ChatGPT" calls), every line handed to Anam via client.talk(), and Deepgram mic/turn-detection
 * events + errors, as they happen. Admin/tester tool only — never mounted for a real student session
 * (gated by isAdmin at the call site in InterviewPlatform/InterviewPlatformV2).
 */
export function DebugConsole() {
  const entries = useDebugLog();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const errorCount = entries.filter((e) => e.kind === 'error').length;

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
  }, [entries, open, minimized]);

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
      </Button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col shadow-2xl"
      style={{
        width: 'min(560px, calc(100vw - 32px))',
        height: minimized ? 'auto' : 'min(420px, 60vh)',
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
        <span style={{ color: '#475569' }}>· {entries.length} events</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
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
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          {entries.length === 0 ? (
            <div style={{ color: '#475569', padding: 12 }}>Waiting for interview activity…</div>
          ) : (
            entries.map((e) => <DetailLine key={e.id} entry={e} />)
          )}
        </div>
      )}
    </div>
  );
}
