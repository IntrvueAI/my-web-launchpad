/**
 * Live interview debug log — a plain module-level pub/sub (not a React context) so any hook or
 * client (useInterviewSession, useInterviewSessionV2, useDeepgramMic's callers, etc.) can push an
 * entry without prop-drilling a logger through the whole call chain. <DebugConsole /> is just one
 * subscriber; entries also survive a console remount (e.g. opening it mid-interview) via the ring
 * buffer, so testers don't have to have it open from the start to catch an error.
 */

export type DebugSource = 'brain' | 'anam' | 'deepgram' | 'session';
export type DebugKind = 'request' | 'response' | 'error' | 'info';

export interface DebugEntry {
  id: number;
  timestamp: number;
  source: DebugSource;
  kind: DebugKind;
  label: string;
  /** Arbitrary JSON-serialisable payload — the exact request/response body, error message, etc. */
  detail?: unknown;
}

const MAX_ENTRIES = 300;
let entries: DebugEntry[] = [];
let nextId = 1;
const listeners = new Set<(entries: DebugEntry[]) => void>();

function notify() {
  for (const listener of listeners) listener(entries);
}

export function logDebug(entry: Omit<DebugEntry, 'id' | 'timestamp'>): void {
  entries = [...entries, { ...entry, id: nextId++, timestamp: Date.now() }];
  if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
  notify();
}

export function getDebugEntries(): DebugEntry[] {
  return entries;
}

export function clearDebugLog(): void {
  entries = [];
  notify();
}

export function subscribeDebug(listener: (entries: DebugEntry[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
