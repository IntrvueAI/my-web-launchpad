import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DeepgramMicCallbacks {
  /** Fires repeatedly with the current best guess for the in-progress bit of speech. */
  onInterim: (text: string) => void;
  /** Fires when Deepgram commits a segment as finalized (may fire several times per turn). */
  onSegmentFinal: (text: string) => void;
  /** Fires when Deepgram's own turn-detection (endpointing / utterance-end) decides the child has
   *  actually stopped talking — this is the real "their turn is over" signal. */
  onTurnEnd: () => void;
  onError: (message: string) => void;
}

const PAUSE_MS = 1200; // tuned via the STT bake-off's Test 2 — good balance for kids thinking mid-answer

/** Captures the mic, streams it to our Deepgram relay (supabase/functions/deepgram-relay), and
 *  reports back interim text, finalized segments, and turn-end — replacing Anam's own STT +
 *  endOfSpeechSensitivity turn-detection for 11-plus-v2. Anam's input audio must be disabled
 *  (`disableInputAudio: true`) wherever this is used, or both would be listening at once. */
export function useDeepgramMic() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Two independent reasons the mic can be gated: the user's own choice (push-to-talk, type mode,
  // manual toggle) and — new — Clara currently being audibly mid-speech (see setPeerActive). Anam's
  // own built-in STT apparently never suffered from hearing itself; ours has no such awareness on
  // its own, since we're capturing the raw mic directly, so we replicate that half-duplex behavior.
  const mutedRef = useRef(false);
  const peerActiveRef = useRef(false);

  const start = useCallback(async (callbacks: DeepgramMicCallbacks) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    // Explicit (rather than relying on browser defaults) as a second line of defense alongside the
    // peer-audio gating above — echoCancellation is what actually filters Clara's voice picked back
    // up acoustically through the speakers before it ever reaches Deepgram.
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    mediaStreamRef.current = mediaStream;

    // Same project ref used by every other edge function call in this app (src/integrations/supabase/client.ts).
    const relayUrl = new URL('https://fjkuuzfuysemrofcmnvd.supabase.co/functions/v1/deepgram-relay');
    relayUrl.protocol = 'wss:';
    relayUrl.searchParams.set('token', accessToken);
    relayUrl.searchParams.set('pauseMs', String(PAUSE_MS));

    const ws = new WebSocket(relayUrl.toString());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.error) { callbacks.onError(msg.error); return; }
        if (msg.type === 'UtteranceEnd') { callbacks.onTurnEnd(); return; }
        const alt = msg?.channel?.alternatives?.[0];
        if (!alt?.transcript) return;
        if (msg.is_final) {
          if (alt.transcript.trim()) callbacks.onSegmentFinal(alt.transcript);
          if (msg.speech_final) callbacks.onTurnEnd();
        } else {
          callbacks.onInterim(alt.transcript);
        }
      } catch (e) {
        console.error('Deepgram relay message parse error:', e);
      }
    };
    ws.onerror = () => callbacks.onError('Lost connection to the speech recognition service.');

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.addEventListener('error', () => reject(new Error('Failed to connect to speech relay')), { once: true });
    });

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    // Some browsers (notably Safari) can leave a freshly-created context 'suspended' once enough
    // async work has happened since the user gesture that triggered start() — resume is a no-op
    // if it's already running, so this is a safe, cheap guard against silent, unrecorded audio.
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    await audioCtx.audioWorklet.addModule('/audio/pcm-downsampler-worklet.js');

    const sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    sourceNodeRef.current = sourceNode;
    const workletNode = new AudioWorkletNode(audioCtx, 'pcm-downsampler');
    workletNodeRef.current = workletNode;

    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (mutedRef.current || peerActiveRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(event.data);
    };

    sourceNode.connect(workletNode);
    // Not connected to audioCtx.destination — we never want to play the mic back out loud.
  }, []);

  const stop = useCallback(() => {
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

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
  }, []);

  /** Called by the peer-audio watcher (useInterviewSessionV2) while Clara is audibly speaking. */
  const setPeerActive = useCallback((active: boolean) => {
    peerActiveRef.current = active;
  }, []);

  return { start, stop, setMuted, setPeerActive };
}
