import { useEffect, useRef, useState } from "react";
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
}): StationClockState | null {
  const [clock, setClock] = useState<StationClockState | null>(null);
  const callback = useRef(onTimeUp);
  callback.current = onTimeUp;
  const prep = timing?.prep;
  const response = timing?.response;
  useEffect(() => {
    if (stationKey === null || prep === undefined || response === undefined) {
      setClock(null);
      return;
    }
    const startedAt = Date.now();
    const stationTiming = { prep, response };
    let fired = false;
    const tick = () => {
      const value = computeStationClock(Date.now() - startedAt, stationTiming);
      setClock(value);
      if (value.expired && !fired) {
        fired = true;
        clearInterval(interval);
        callback.current();
      }
    };
    setClock(computeStationClock(0, stationTiming));
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [stationKey, prep, response]);
  return clock;
}
