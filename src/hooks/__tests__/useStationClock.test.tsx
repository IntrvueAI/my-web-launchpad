import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStationClock } from "../useStationClock";
function Clock({ id, done }: { id: string | null; done: () => void }) {
  const value = useStationClock({
    stationKey: id,
    timing: { prep: 1, response: 2 },
    onTimeUp: done,
  });
  return (
    <span>{value ? `${value.phase}:${value.secondsRemaining}` : "off"}</span>
  );
}
describe("Station clock lifecycle", () => {
  let node: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    node = document.createElement("div");
    document.body.append(node);
    root = createRoot(node);
  });
  afterEach(() => {
    act(() => root.unmount());
    node.remove();
    vi.useRealTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });
  it("keeps running when every follow-up returns a fresh timing object", () => {
    const first = vi.fn(),
      latest = vi.fn();
    act(() => root.render(<Clock id="s1:0" done={first} />));
    act(() => vi.advanceTimersByTime(1000));
    expect(node.textContent).toBe("response:2");
    act(() => root.render(<Clock id="s1:0" done={latest} />));
    act(() => vi.advanceTimersByTime(2000));
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(10000));
    expect(latest).toHaveBeenCalledTimes(1);
  });
  it("resets for a new station and cancels immediately when stopped", () => {
    const done = vi.fn();
    act(() => root.render(<Clock id="s1:0" done={done} />));
    act(() => vi.advanceTimersByTime(2000));
    act(() => root.render(<Clock id="s1:1" done={done} />));
    expect(node.textContent).toBe("prep:1");
    act(() => root.render(<Clock id={null} done={done} />));
    act(() => vi.advanceTimersByTime(10000));
    expect(node.textContent).toBe("off");
    expect(done).not.toHaveBeenCalled();
  });
  it("catches up after the tab is suspended", () => {
    const done = vi.fn();
    act(() => root.render(<Clock id="s1:0" done={done} />));
    vi.setSystemTime(new Date("2026-09-15T12:05:00Z"));
    act(() => vi.advanceTimersByTime(250));
    expect(done).toHaveBeenCalledTimes(1);
  });
});
