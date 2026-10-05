import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeStationClock,
  type StationClockState,
  type StationTiming,
} from "@/interview/engine/stationClock";

/** A station identity owns one deadline; follow-up response objects never restart or stop it. */
export function useStationClock({
  stationKey,
  timing,
  onTimeUp,
}: {
  stationKey: string | null;
  timing?: StationTiming;
  onTimeUp: () => void;
}): { clock: StationClockState | null; beginResponse: () => void } {
  const [snapshot, setSnapshot] = useState<{
    key: string;
    clock: StationClockState;
  } | null>(null);
  const beginRef = useRef<(() => void) | null>(null);
  const beginResponse = useCallback(() => beginRef.current?.(), []);
  const callback = useRef(onTimeUp);
  callback.current = onTimeUp;
  const prep = timing?.prep;
  const response = timing?.response;
  useEffect(() => {
    if (stationKey === null || prep === undefined || response === undefined) {
      setSnapshot(null);
      return;
    }
    let startedAt = Date.now();
    const stationTiming = { prep, response };
    let fired = false;
    const tick = () => {
      const value = computeStationClock(Date.now() - startedAt, stationTiming);
      setSnapshot({ key: stationKey, clock: value });
      if (value.expired && !fired) {
        fired = true;
        clearInterval(interval);
        callback.current();
      }
    };
    setSnapshot({
      key: stationKey,
      clock: computeStationClock(0, stationTiming),
    });
    const interval = setInterval(tick, 250);
    beginRef.current = () => {
      // Starting early uses the full answer budget. Repeated clicks and later answers
      // cannot reset or extend an already-running response clock.
      if (
        computeStationClock(Date.now() - startedAt, stationTiming).phase !==
        "prep"
      )
        return;
      startedAt = Date.now() - prep * 1000;
      tick();
    };
    return () => {
      clearInterval(interval);
      beginRef.current = null;
    };
  }, [stationKey, prep, response]);
  return {
    clock: snapshot?.key === stationKey ? snapshot.clock : null,
    beginResponse,
  };
}
