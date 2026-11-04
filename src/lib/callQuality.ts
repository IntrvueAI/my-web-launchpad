/**
 * Live interview quality: how the connection to Clara is holding up, and whether the student's
 * microphone is coming through clearly. Pure rules, so they can be tested without a call; the
 * measuring happens in useCallQuality. Everything is measured on the student's device.
 */

export type ConnectionLevel = "strong" | "ok" | "weak" | "offline" | "unknown";

export interface ConnectionSample {
  /** Round trip to the avatar service, in milliseconds. */
  rttMs: number | null;
  /** Share of video and audio packets lost since the last sample, 0-100. */
  lossPercent: number | null;
  /** Clara's video frames per second. */
  fps: number | null;
  /** The video froze since the last sample. */
  froze: boolean;
  online: boolean;
}

/** One sample's grade. Missing measurements don't count against the connection. */
export function gradeSample(s: ConnectionSample): ConnectionLevel {
  if (!s.online) return "offline";
  if (s.rttMs === null && s.lossPercent === null && s.fps === null) return "unknown";
  const weak = (s.rttMs ?? 0) > 400 || (s.lossPercent ?? 0) > 5 || (s.fps !== null && s.fps < 10) || s.froze;
  if (weak) return "weak";
  const ok = (s.rttMs ?? 0) > 180 || (s.lossPercent ?? 0) > 1.5 || (s.fps !== null && s.fps < 20);
  return ok ? "ok" : "strong";
}

const RANK: Record<ConnectionLevel, number> = { offline: 0, weak: 1, ok: 2, strong: 3, unknown: 4 };

/**
 * The level to show: offline at once, otherwise the better of the last two samples, so one
 * slow moment doesn't flash a warning but a sustained problem shows within a few seconds.
 */
export function connectionLevel(recent: ConnectionLevel[]): ConnectionLevel {
  const last = recent.slice(-2);
  if (!last.length) return "unknown";
  if (last[last.length - 1] === "offline") return "offline";
  const known = last.filter((l) => l !== "unknown");
  if (!known.length) return "unknown";
  return known.reduce((best, l) => (RANK[l] > RANK[best] ? l : best), known[0]);
}

export const LEVEL_LABEL: Record<ConnectionLevel, string> = {
  strong: "Strong connection",
  ok: "OK connection",
  weak: "Weak connection",
  offline: "Offline",
  unknown: "Checking connection",
};

/** Microphone level in dBFS from time-domain samples (-100 for silence). */
export function levelDb(samples: Float32Array): { rmsDb: number; peak: number } {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return { rmsDb: rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100, peak };
}

export const MIC = {
  /** No room noise at all: a muted or disconnected microphone. */
  deadDb: -70,
  /** Below this the room is effectively silent. */
  silentDb: -58,
  /** Speech this quiet is hard to transcribe. */
  quietDb: -42,
  /** Peaks at or above this are clipping. */
  clipPeak: 0.98,
};

const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);

/** Clara's own line came back as the student's answer: her voice is reaching the microphone. */
export function looksLikeEcho(studentText: string, lastClaraLine: string): boolean {
  const said = words(studentText);
  const clara = new Set(words(lastClaraLine));
  if (said.length < 6 || clara.size < 6) return false;
  const overlap = said.filter((w) => clara.has(w)).length / said.length;
  return overlap >= 0.6;
}

/** Several answers in a row came through as a word or two: Clara is probably mishearing. */
export function looksLikeMishearing(recentStudentTurns: string[]): boolean {
  const last = recentStudentTurns.slice(-3);
  return last.length === 3 && last.every((t) => words(t).length <= 2);
}

export type TipKind = "weak_connection" | "lag_spike" | "slow_reply" | "offline" | "no_audio" | "quiet" | "loud" | "echo" | "mishearing";

export const TIPS: Record<TipKind, { title: string; text: string; action?: "type" }> = {
  weak_connection: {
    title: "Your connection is weak",
    text: "Clara may lag a little. Moving closer to your Wi-Fi router, or pausing downloads and video on other devices, usually helps.",
  },
  lag_spike: {
    title: "Clara's video froze for a moment",
    text: "If it keeps happening, move closer to your Wi-Fi or switch to a stronger connection. Your answers are still being saved.",
  },
  slow_reply: {
    title: "Replies are slower than usual",
    text: "Clara is taking longer to respond, often because of the connection. Keep going; she'll catch up.",
  },
  offline: {
    title: "You're offline",
    text: "Check your Wi-Fi. If the call drops, you can rejoin from where you left off.",
  },
  no_audio: {
    title: "We can't hear you",
    text: "Check your microphone isn't muted and is the one selected in your browser's settings. You can also type your answers.",
    action: "type",
  },
  quiet: {
    title: "You sound quiet",
    text: "Move a little closer to your microphone, or speak up slightly, so Clara catches every word.",
  },
  loud: {
    title: "Your microphone is very loud",
    text: "It may distort what Clara hears. Move back a little from the microphone.",
  },
  echo: {
    title: "Clara can hear herself",
    text: "Her voice is reaching your microphone through your speakers. Headphones will help her hear just you.",
  },
  mishearing: {
    title: "Clara might be mishearing you",
    text: "Try speaking a little slower and closer to the microphone, or type your answers instead.",
    action: "type",
  },
};

/** Which tip to show next: one at a time, each at most once per interview, with a gap between. */
export function nextTip(
  candidates: TipKind[],
  shown: Set<TipKind>,
  lastShownAt: number | null,
  now: number,
  gapMs = 45_000,
): TipKind | null {
  if (lastShownAt !== null && now - lastShownAt < gapMs) return null;
  const order: TipKind[] = ["offline", "no_audio", "echo", "weak_connection", "lag_spike", "mishearing", "quiet", "loud", "slow_reply"];
  return order.find((k) => candidates.includes(k) && !shown.has(k)) ?? null;
}
