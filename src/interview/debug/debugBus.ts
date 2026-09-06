/**
 * Live interview debug log — a plain module-level pub/sub (not a React context) so any hook or
 * client (useInterviewSession, useInterviewSessionV2, useDeepgramMic's callers, etc.) can push an
 * entry without prop-drilling a logger through the whole call chain. <DebugConsole /> is just one
 * subscriber; entries also survive a console remount (e.g. opening it mid-interview) via the ring
 * buffer, so testers don't have to have it open from the start to catch an error.
 *
 * Entries also persist to sessionStorage so a reload mid-interview (or reopening the tab) doesn't
 * lose the trail — scoped to sessionStorage (not localStorage) since a debug log is only relevant
 * to the tab that produced it, not future browser sessions.
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
const STORAGE_KEY = 'intrvue-debug-log-v1';

let entries: DebugEntry[] = loadFromStorage();
let nextId = entries.length ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
let paused = false;
const listeners = new Set<(entries: DebugEntry[]) => void>();
const pauseListeners = new Set<(paused: boolean) => void>();

function loadFromStorage(): DebugEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // sessionStorage full/unavailable (private mode etc.) — live view still works, just won't persist
  }
}

function notify() {
  for (const listener of listeners) listener(entries);
}

export function logDebug(entry: Omit<DebugEntry, 'id' | 'timestamp'>): void {
  if (paused) return;
  entries = [...entries, { ...entry, id: nextId++, timestamp: Date.now() }];
  if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
  saveToStorage();
  notify();
}

export function getDebugEntries(): DebugEntry[] {
  return entries;
}

export function clearDebugLog(): void {
  entries = [];
  saveToStorage();
  notify();
}

export function subscribeDebug(listener: (entries: DebugEntry[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isDebugPaused(): boolean {
  return paused;
}

export function setDebugPaused(next: boolean): void {
  paused = next;
  for (const listener of pauseListeners) listener(paused);
}

export function subscribeDebugPaused(listener: (paused: boolean) => void): () => void {
  pauseListeners.add(listener);
  return () => pauseListeners.delete(listener);
}
