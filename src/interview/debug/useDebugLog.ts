import { useEffect, useState } from 'react';
import { getDebugEntries, subscribeDebug, isDebugPaused, subscribeDebugPaused, type DebugEntry } from './debugBus';

export function useDebugLog(): DebugEntry[] {
  const [entries, setEntries] = useState<DebugEntry[]>(() => getDebugEntries());
  useEffect(() => subscribeDebug(setEntries), []);
  return entries;
}

export function useDebugPaused(): boolean {
  const [paused, setPaused] = useState<boolean>(() => isDebugPaused());
  useEffect(() => subscribeDebugPaused(setPaused), []);
  return paused;
}
