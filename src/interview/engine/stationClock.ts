/**
 * Pure per-station countdown math — deliberately deadline-based, not tick-decrementing. A naive
 * `secondsRemaining -= 1` on every `setInterval` firing drifts: browsers throttle `setInterval` in
 * backgrounded/inactive tabs (often to once a minute or slower), and even in the foreground, ticks
 * are not guaranteed to land exactly 1000ms apart. Recomputing from `elapsedMs` (wall-clock time
 * since the station started) against the fixed `timing` config means a delayed or skipped tick
 * still yields the CORRECT remaining time the moment it does fire — the display catches up instead
 * of drifting further behind every station.
 */
export interface StationTiming {
  prep: number;     // seconds
  response: number; // seconds
}

export interface StationClockState {
  phase: 'prep' | 'response';
  secondsRemaining: number;
  totalSeconds: number;
  /** True once the response clock has reached zero — the caller should fire time_up exactly once. */
  expired: boolean;
}

export function computeStationClock(elapsedMs: number, timing: StationTiming): StationClockState {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  if (timing.prep > 0 && elapsedSeconds < timing.prep) {
    return { phase: 'prep', secondsRemaining: timing.prep - elapsedSeconds, totalSeconds: timing.prep, expired: false };
  }
  const intoResponse = elapsedSeconds - Math.max(0, timing.prep);
  const remaining = timing.response - intoResponse;
  if (remaining > 0) {
    return { phase: 'response', secondsRemaining: remaining, totalSeconds: timing.response, expired: false };
  }
  return { phase: 'response', secondsRemaining: 0, totalSeconds: timing.response, expired: true };
}
