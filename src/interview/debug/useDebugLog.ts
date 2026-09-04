import { useEffect, useState } from 'react';
import { getDebugEntries, subscribeDebug, type DebugEntry } from './debugBus';

export function useDebugLog(): DebugEntry[] {
  const [entries, setEntries] = useState<DebugEntry[]>(() => getDebugEntries());
  useEffect(() => subscribeDebug(setEntries), []);
  return entries;
}
