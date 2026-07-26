import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Admin-only STT bake-off: one mic feed, three vendors (Deepgram / AssemblyAI / Speechmatics) side
 * by side, so accuracy and turn-taking behavior can be compared directly. Ported from a local-only
 * Node prototype (same wire protocol) onto supabase/functions/stt-bakeoff-relay so it lives on the
 * admin page instead of needing `node server.js` on someone's laptop. Not linked anywhere public —
 * reached via /admin/stt-bakeoff.
 */

const VENDORS = ['deepgram', 'assemblyai', 'speechmatics'] as const;
type Vendor = (typeof VENDORS)[number];
const VENDOR_LABEL: Record<Vendor, string> = {
  deepgram: 'Deepgram',
  assemblyai: 'AssemblyAI',
  speechmatics: 'Speechmatics',
};

interface AccuracyState {
  committed: string[];
  interim: string;
  badge: string;
  ok: boolean;
  error: string;
}
const emptyAccuracy = (): AccuracyState => ({ committed: [], interim: '', badge: '—', ok: false, error: '' });

interface Bubble { text: string; done: boolean }
interface TurnsState {
  bubbles: Bubble[];
  committed: string;
  live: string;
  badge: string;
  ok: boolean;
  error: string;
}
const emptyTurns = (): TurnsState => ({ bubbles: [], committed: '', live: '', badge: '—', ok: false, error: '' });

function useBakeoffAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const start = useCallback(async (
    startMsg: Record<string, unknown>,
    onMessage: (msg: { vendor: Vendor; [k: string]: unknown }) => void,
    onConnError: () => void,
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    const relayUrl = new URL('https://fjkuuzfuysemrofcmnvd.supabase.co/functions/v1/stt-bakeoff-relay');
    relayUrl.protocol = 'wss:';
    relayUrl.searchParams.set('token', accessToken);

    const ws = new WebSocket(relayUrl.toString());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try { onMessage(JSON.parse(event.data)); } catch { /* ignore malformed frame */ }
    };
    ws.onerror = onConnError;

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.addEventListener('error', () => reject(new Error('Failed to connect to bake-off relay')), { once: true });
    });
    ws.send(JSON.stringify(startMsg));

    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = mediaStream;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    await audioCtx.audioWorklet.addModule('/audio/pcm-downsampler-worklet.js');

    const sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    sourceNodeRef.current = sourceNode;
    const workletNode = new AudioWorkletNode(audioCtx, 'pcm-downsampler');
    workletNodeRef.current = workletNode;
    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(event.data);
    };
    sourceNode.connect(workletNode);
  }, []);

  const stop = useCallback(() => {
    try { wsRef.current?.send(JSON.stringify({ type: 'stop' })); } catch { /* already closed */ }
    wsRef.current?.close();
    wsRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { start, stop };
}

function AccuracyTest() {
  const audio = useBakeoffAudio();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [data, setData] = useState<Record<Vendor, AccuracyState>>({
    deepgram: emptyAccuracy(), assemblyai: emptyAccuracy(), speechmatics: emptyAccuracy(),
  });

  const start = async () => {
    setData({ deepgram: emptyAccuracy(), assemblyai: emptyAccuracy(), speechmatics: emptyAccuracy() });
    setStatus('Requesting mic…');
    try {
      await audio.start({ type: 'start' }, (msg) => {
        const vendor = msg.vendor as Vendor;
        setData((prev) => {
          const s = { ...prev[vendor] };
          if (msg.error) { s.error = String(msg.error); s.badge = 'error'; s.ok = false; return { ...prev, [vendor]: s }; }
          s.ok = true;
          if (msg.isFinal) {
            s.committed = [...s.committed, String(msg.text)];
            s.interim = '';
            s.badge = 'final';
          } else {
            s.interim = String(msg.text);
            s.badge = 'live';
          }
          return { ...prev, [vendor]: s };
        });
      }, () => setStatus('Relay connection error'));
      setStatus('Listening — talk normally');
      setRunning(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const stop = () => { audio.stop(); setRunning(false); setStatus('Stopped'); };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Same mic feed, three vendors, side by side. Pick whichever reads back what you actually said most accurately.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={start} disabled={running}>Start talking</Button>
        <Button variant="destructive" onClick={stop} disabled={!running}>Stop</Button>
        <span className="text-sm text-muted-foreground">{status}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VENDORS.map((v) => (
          <Card key={v} className="p-4 min-h-[280px] bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{VENDOR_LABEL[v]}</h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${data[v].ok ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                {data[v].badge}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{data[v].committed.join(' ')}</p>
            <p className="text-sm text-muted-foreground">{data[v].interim}</p>
            {data[v].error && <p className="text-xs text-destructive mt-2">{data[v].error}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function TurnsTest() {
  const audio = useBakeoffAudio();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [pauseMs, setPauseMs] = useState(1000);
  const [data, setData] = useState<Record<Vendor, TurnsState>>({
    deepgram: emptyTurns(), assemblyai: emptyTurns(), speechmatics: emptyTurns(),
  });

  const start = async () => {
    setData({ deepgram: emptyTurns(), assemblyai: emptyTurns(), speechmatics: emptyTurns() });
    setStatus('Requesting mic…');
    try {
      await audio.start({ type: 'start', mode: 'turntaking', pauseMs }, (msg) => {
        const vendor = msg.vendor as Vendor;
        setData((prev) => {
          const s = { ...prev[vendor] };
          if (msg.error) { s.error = String(msg.error); s.badge = 'error'; s.ok = false; return { ...prev, [vendor]: s }; }
          s.ok = true;
          const kind = msg.kind as string;
          const text = String(msg.text ?? '');
          if (kind === 'live') { s.live = text; s.badge = 'listening'; }
          else if (kind === 'commit') { s.committed = (s.committed + ' ' + text).trim(); s.live = ''; s.badge = 'listening'; }
          else if (kind === 'turnEnd') {
            if (s.committed || s.live) {
              s.bubbles = [...s.bubbles, { text: (s.committed + ' ' + s.live).trim(), done: true }];
            }
            s.committed = ''; s.live = ''; s.badge = 'turn ended';
          }
          return { ...prev, [vendor]: s };
        });
      }, () => setStatus('Relay connection error'));
      setStatus('Listening continuously — talk with pauses, like thinking out loud');
      setRunning(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const stop = () => { audio.stop(); setRunning(false); setStatus('Stopped'); };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Mic stays on continuously. Talk like a kid working through an answer: pause mid-sentence, say "umm", think out
        loud. Each vendor decides for itself when it thinks you're done — that becomes a solid bubble. The dashed
        preview is what it currently thinks you're still saying. Watch for one that splits a single thought into
        several bubbles (cut you off) vs. one that correctly waits through your pauses.
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <Button onClick={start} disabled={running}>Start (continuous)</Button>
        <Button variant="destructive" onClick={stop} disabled={!running}>Stop</Button>
        <span className="text-sm text-muted-foreground">{status}</span>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Pause threshold: <b className="text-foreground">{pauseMs}ms</b>
          <input
            type="range" min={200} max={3000} step={100} value={pauseMs} disabled={running}
            onChange={(e) => setPauseMs(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VENDORS.map((v) => (
          <Card key={v} className="p-4 min-h-[380px] bg-muted/30 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{VENDOR_LABEL[v]}</h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${data[v].ok ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                {data[v].badge}
              </span>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {data[v].bubbles.map((b, i) => (
                <div key={i} className="rounded-lg border bg-background px-3 py-2 text-sm">{b.text}</div>
              ))}
              {(data[v].committed || data[v].live) && (
                <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  {(data[v].committed + ' ' + data[v].live).trim()}
                </div>
              )}
            </div>
            {data[v].error && <p className="text-xs text-destructive mt-2">{data[v].error}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminSttBakeoff() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [tab, setTab] = useState<'accuracy' | 'turns'>('accuracy');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-muted-foreground mb-3">Admin access required.</p>
          <Link to="/admin" className="text-primary underline">Go to /admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">STT bake-off</h1>
            <p className="text-sm text-muted-foreground">Deepgram vs AssemblyAI vs Speechmatics, same mic feed, side by side.</p>
          </div>
          <Link to="/admin" className="text-sm text-primary underline">← Back to admin</Link>
        </div>
        <div className="flex gap-2 mb-6">
          <Button variant={tab === 'accuracy' ? 'default' : 'outline'} size="sm" onClick={() => setTab('accuracy')}>Test 1: Accuracy</Button>
          <Button variant={tab === 'turns' ? 'default' : 'outline'} size="sm" onClick={() => setTab('turns')}>Test 2: Turn-taking</Button>
        </div>
        {tab === 'accuracy' ? <AccuracyTest /> : <TurnsTest />}
      </div>
    </div>
  );
}
