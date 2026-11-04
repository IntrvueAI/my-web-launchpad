import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  MIC, connectionLevel, gradeSample, levelDb, looksLikeEcho, looksLikeMishearing, nextTip,
  type ConnectionLevel, type ConnectionSample, type TipKind,
} from "@/lib/callQuality";

const SAMPLE_MS = 3000;
const MIC_SAMPLE_MS = 200;

interface Inputs {
  active: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  /** The avatar's WebRTC connection, when the SDK exposes it. */
  getPeerConnection: () => RTCPeerConnection | null;
  micStream: MediaStream | null;
  /** Clara is working on a reply. */
  thinking: boolean;
  /** Silence is expected right now (reading time, a roleplay brief being read). */
  quietExpected: boolean;
  /** The microphone is meant to be listening (not muted, not typing, not push-to-talk). */
  micListening: boolean;
  /** The conversation so far, oldest first. */
  messages: { role: "user" | "assistant"; content: string }[];
  /** How long Clara's last reply took to arrive, in ms. */
  lastReplyMs: number | null;
  typing: boolean;
}

export interface CallQuality {
  level: ConnectionLevel;
  details: { rttMs: number | null; lossPercent: number | null; fps: number | null };
  tip: TipKind | null;
  dismissTip: () => void;
}

/** Measures the live interview on the student's device and suggests one fix at a time. */
export function useCallQuality(inputs: Inputs): CallQuality {
  const { active, videoRef, getPeerConnection, micStream, thinking, quietExpected, micListening, messages, lastReplyMs, typing } = inputs;
  const [level, setLevel] = useState<ConnectionLevel>("unknown");
  const [details, setDetails] = useState<CallQuality["details"]>({ rttMs: null, lossPercent: null, fps: null });
  const [tip, setTip] = useState<TipKind | null>(null);
  const candidates = useRef(new Set<TipKind>());
  const shown = useRef(new Set<TipKind>());
  const lastShownAt = useRef<number | null>(null);
  const grades = useRef<ConnectionLevel[]>([]);

  const offer = useCallback((kind: TipKind) => {
    candidates.current.add(kind);
    const next = nextTip([...candidates.current], shown.current, lastShownAt.current, Date.now());
    if (!next) return;
    shown.current.add(next);
    candidates.current.delete(next);
    lastShownAt.current = Date.now();
    setTip(next);
  }, []);
  const dismissTip = useCallback(() => setTip(null), []);
  // Read through refs so the sampling loop never restarts because a caller passed a new function.
  const peerConnection = useRef(getPeerConnection);
  peerConnection.current = getPeerConnection;

  // A new interview starts with a clean slate.
  useEffect(() => {
    if (!active) return;
    candidates.current.clear();
    shown.current.clear();
    lastShownAt.current = null;
    grades.current = [];
    setTip(null);
    setLevel("unknown");
  }, [active]);

  // Connection: WebRTC stats when available, otherwise video frames and the browser's estimate.
  useEffect(() => {
    if (!active) return;
    let previous: { lost: number; received: number; frames: number; freezes: number; at: number } | null = null;
    let weakStreak = 0;
    const sample = async () => {
      const online = navigator.onLine;
      let rttMs: number | null = null;
      let lost = 0, received = 0, frames: number | null = null, freezes = 0, fps: number | null = null;
      const pc = peerConnection.current();
      if (pc) {
        try {
          const stats = await pc.getStats();
          stats.forEach((r: any) => {
            if (r.type === "candidate-pair" && (r.nominated || r.state === "succeeded") && typeof r.currentRoundTripTime === "number")
              rttMs = Math.round(r.currentRoundTripTime * 1000);
            if (r.type === "inbound-rtp") {
              lost += r.packetsLost ?? 0;
              received += r.packetsReceived ?? 0;
              if (r.kind === "video") {
                if (typeof r.framesPerSecond === "number") fps = r.framesPerSecond;
                if (typeof r.framesDecoded === "number") frames = r.framesDecoded;
                freezes += r.freezeCount ?? 0;
              }
            }
          });
        } catch { /* Stats are optional. */ }
      }
      const video = videoRef.current;
      if (frames === null && video?.getVideoPlaybackQuality) frames = video.getVideoPlaybackQuality().totalVideoFrames;
      const connection = (navigator as Navigator & { connection?: { rtt?: number } }).connection;
      if (rttMs === null && typeof connection?.rtt === "number" && connection.rtt > 0) rttMs = connection.rtt;
      const now = performance.now();
      let lossPercent: number | null = null;
      let froze = false;
      if (previous) {
        const dLost = lost - previous.lost, dReceived = received - previous.received;
        if (dLost + dReceived > 0) lossPercent = Math.max(0, Math.round((dLost / (dLost + dReceived)) * 1000) / 10);
        if (fps === null && frames !== null) fps = Math.round(((frames - previous.frames) / ((now - previous.at) / 1000)) * 10) / 10;
        froze = freezes > previous.freezes;
      }
      previous = { lost, received, frames: frames ?? 0, freezes, at: now };
      const s: ConnectionSample = { rttMs, lossPercent, fps, froze, online };
      const grade = gradeSample(s);
      grades.current = [...grades.current.slice(-5), grade];
      setLevel(connectionLevel(grades.current));
      setDetails({ rttMs, lossPercent, fps });
      if (!online) offer("offline");
      if (froze) offer("lag_spike");
      weakStreak = grade === "weak" ? weakStreak + 1 : 0;
      if (weakStreak >= 2) offer("weak_connection");
    };
    const timer = window.setInterval(() => void sample(), SAMPLE_MS);
    void sample();
    const offline = () => offer("offline");
    window.addEventListener("offline", offline);
    return () => { window.clearInterval(timer); window.removeEventListener("offline", offline); };
  }, [active, videoRef, offer]);

  // Microphone: a dead or muted mic while it's the student's turn, quiet speech and clipping.
  // It's the student's turn once Clara has had time to finish speaking (about 2.5 words a second).
  const claraDoneAt = useRef(0);
  const lastClaraSeen = useRef<string | null>(null);
  const lastClaraLine = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;
  if (lastClaraLine !== lastClaraSeen.current) {
    lastClaraSeen.current = lastClaraLine;
    if (lastClaraLine) claraDoneAt.current = Date.now() + (lastClaraLine.split(/\s+/).length / 2.5) * 1000 + 3000;
  }
  const studentTurnRef = useRef(false);
  const micListeningRef = useRef(micListening);
  studentTurnRef.current = !thinking && !quietExpected;
  micListeningRef.current = micListening;
  const recentLevels = useRef<number[]>([]);
  useEffect(() => {
    if (!active || !micStream || !micStream.getAudioTracks().length) return;
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      void context.resume().catch(() => {});
    } catch {
      return;
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const source = context.createMediaStreamSource(micStream);
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let silentFor = 0;
    let clipped: number[] = [];
    const track = micStream.getAudioTracks()[0];
    let deadFor = 0;
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      const { rmsDb, peak } = levelDb(buffer);
      recentLevels.current = [...recentLevels.current.slice(-49), rmsDb];
      const listening = micListeningRef.current && studentTurnRef.current && Date.now() > claraDoneAt.current;
      // A muted or ended track is certain; digital silence (no room noise at all) for 40s is a muted
      // or wrong microphone. Ordinary thinking pauses still carry room noise above this level.
      const trackDead = track.readyState === "ended" || track.muted || !track.enabled;
      deadFor = listening && trackDead ? deadFor + MIC_SAMPLE_MS : 0;
      silentFor = listening && rmsDb < MIC.deadDb ? silentFor + MIC_SAMPLE_MS : 0;
      if (deadFor >= 5_000 || silentFor >= 40_000) { offer("no_audio"); silentFor = 0; deadFor = 0; }
      const now = Date.now();
      if (peak >= MIC.clipPeak) clipped.push(now);
      clipped = clipped.filter((t) => now - t < 10_000);
      if (clipped.length >= 6) { offer("loud"); clipped = []; }
    }, MIC_SAMPLE_MS);
    return () => {
      window.clearInterval(timer);
      try { source.disconnect(); } catch { /* Already disconnected. */ }
      void context?.close().catch(() => {});
    };
  }, [active, micStream, offer]);

  // What Clara heard: echo of her own line, answers coming through as a word or two, quiet speech.
  const seen = useRef(0);
  useEffect(() => {
    if (!active) { seen.current = 0; return; }
    if (messages.length <= seen.current) { seen.current = messages.length; return; }
    const added = messages.slice(seen.current);
    seen.current = messages.length;
    if (!added.some((m) => m.role === "user") || typing) return;
    const lastClara = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
    const lastStudent = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (looksLikeEcho(lastStudent, lastClara)) offer("echo");
    if (looksLikeMishearing(messages.filter((m) => m.role === "user").map((m) => m.content))) offer("mishearing");
    // Speech level while they were talking: the loudest moments of the last ten seconds.
    const levels = [...recentLevels.current].sort((a, b) => b - a).slice(0, 10);
    if (levels.length >= 5 && levels.every((l) => l < MIC.quietDb && l > MIC.silentDb)) offer("quiet");
  }, [active, messages, typing, offer]);

  useEffect(() => {
    if (active && lastReplyMs !== null && lastReplyMs > 9000) offer("slow_reply");
  }, [active, lastReplyMs, offer]);

  return { level, details, tip, dismissTip };
}
