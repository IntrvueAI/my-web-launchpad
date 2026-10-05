import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StationTimePanel } from "./StationTimePanel";
import type { StationClockState } from "@/interview/engine/stationClock";
import { useStationAnnouncements } from "@/hooks/useStationAnnouncements";
import { useStationClock } from "@/hooks/useStationClock";

describe("Visible station time and announcements", () => {
  let root: Root, node: HTMLDivElement;
  const started = vi.fn(),
    stopped = vi.fn();
  class Audio {
    state = "running";
    currentTime = 0;
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    createOscillator = () => ({
      type: "",
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: started,
      stop: stopped,
    });
    createGain = () => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
  }
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    vi.stubGlobal("AudioContext", Audio);
    started.mockClear();
    stopped.mockClear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    node = document.createElement("div");
    document.body.append(node);
    root = createRoot(node);
  });
  afterEach(() => {
    act(() => root.unmount());
    node.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });
  function Harness({ id }: { id: string | null }) {
    const { clock, beginResponse } = useStationClock({
      stationKey: id,
      timing: { prep: 60, response: 300 },
      onTimeUp: () => {},
    });
    const sound = useStationAnnouncements(id, clock);
    return (
      <>
        <button onClick={sound.prepareSound}>Start sound</button>
        {clock && (
          <StationTimePanel
            clock={clock}
            progress="Station 1 of 6"
            onBeginResponse={beginResponse}
            soundEnabled={sound.soundEnabled}
            onToggleSound={sound.toggleSound}
          />
        )}
      </>
    );
  }
  const click = (label: string) =>
    act(() =>
      [...node.querySelectorAll("button")]
        .find((b) => b.textContent?.trim() === label)!
        .click(),
    );
  it("separates a full reading minute from five answer minutes and alerts only once", () => {
    act(() => root.render(<Harness id="a:1" />));
    click("Start sound");
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("1:00");
    expect(node.querySelector('[role="status"]')?.textContent).toContain(
      "Reading time",
    );
    act(() => vi.advanceTimersByTime(60_000));
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("5:00");
    expect(started).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(240_000));
    expect(node.textContent).toContain("Final minute");
    expect(started).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(15_000));
    act(() => root.render(<Harness id="a:1" />));
    expect(started).toHaveBeenCalledTimes(2);
    act(() => root.render(<Harness id="a:2" />));
    expect(started).toHaveBeenCalledTimes(2);
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("1:00");
    act(() => root.render(<Harness id={null} />));
    act(() => vi.advanceTimersByTime(400_000));
    expect(node.querySelector('[role="timer"]')).toBeNull();
    expect(started).toHaveBeenCalledTimes(2);
  });
  it("shows a warning after a delayed tick and keeps it visible when sound is muted", () => {
    act(() => root.render(<Harness id="a:1" />));
    click("Start sound");
    click("I’m ready");
    act(() =>
      (
        node.querySelector(
          '[aria-label="Mute timer sounds"]',
        ) as HTMLButtonElement
      ).click(),
    );
    vi.setSystemTime(new Date("2026-10-05T12:04:10Z"));
    act(() => vi.advanceTimersByTime(250));
    expect(node.querySelector('[role="timer"]')?.textContent).toBe("0:50");
    expect(node.textContent).toContain("Final minute");
    expect(started).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(50_000));
    expect(node.textContent).toContain("Station time is up");
  });
  it("does not announce the final minute during reading or after expiry", () => {
    const base: StationClockState = {
      phase: "prep",
      secondsRemaining: 45,
      totalSeconds: 60,
      expired: false,
    };
    const render = (clock: StationClockState) =>
      act(() =>
        root.render(
          <StationTimePanel
            clock={clock}
            progress="Station 2 of 6"
            onBeginResponse={() => {}}
            soundEnabled={false}
            onToggleSound={() => {}}
          />,
        ),
      );
    render(base);
    expect(node.textContent).not.toContain("Final minute");
    render({
      ...base,
      phase: "response",
      secondsRemaining: 0,
      totalSeconds: 300,
      expired: true,
    });
    expect(node.textContent).toContain("Time up");
    expect(node.textContent).not.toContain("Final minute");
  });
});
