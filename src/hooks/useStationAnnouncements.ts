import { useCallback, useEffect, useRef, useState } from "react";
import type { StationClockState } from "@/interview/engine/stationClock";

/** Announcements never enter Anam's conversation or reset the station deadline. */
export function useStationAnnouncements(
  stationKey: string | null,
  clock: StationClockState | null,
) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<{
    key: string | null;
    phase: string | null;
    minute: boolean;
  }>({ key: null, phase: null, minute: false });
  const prepareSound = useCallback(() => {
    try {
      const Audio =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Audio) return;
      audio.current ??= new Audio();
      void audio.current.resume().catch(() => {});
    } catch {
      /* The visible and screen-reader warning still works without audio. */
    }
  }, []);
  const toggleSound = useCallback(() => {
    if (!soundEnabled) prepareSound();
    setSoundEnabled((value) => !value);
  }, [soundEnabled, prepareSound]);
  useEffect(() => {
    if (seen.current.key !== stationKey)
      seen.current = { key: stationKey, phase: null, minute: false };
    if (!stationKey || !clock) return;
    const readingEnded =
      seen.current.phase === "prep" &&
      clock.phase === "response" &&
      !clock.expired;
    const minute =
      clock.phase === "response" &&
      clock.totalSeconds > 60 &&
      clock.secondsRemaining <= 60 &&
      clock.secondsRemaining > 0 &&
      !seen.current.minute;
    seen.current.phase = clock.phase;
    if (minute) seen.current.minute = true;
    if (
      (!readingEnded && !minute) ||
      !soundEnabled ||
      audio.current?.state !== "running"
    )
      return;
    const context = audio.current;
    try {
      const tone = context.createOscillator(),
        gain = context.createGain();
      tone.type = "sine";
      tone.frequency.value = minute ? 660 : 880;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
      tone.start();
      tone.stop(context.currentTime + 0.4);
    } catch {
      /* Audio must never interrupt answering. */
    }
  }, [stationKey, clock, soundEnabled]);
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
      audio.current = null;
    },
    [],
  );
  return { soundEnabled, toggleSound, prepareSound };
}
