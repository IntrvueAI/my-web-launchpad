import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePrivateRecorder } from "../usePrivateRecorder";
import { usePracticeClock } from "../usePracticeClock";
import { usePracticeProfile } from "../usePracticeProfile";
import { emptyProfile } from "@/interview/studio/practice";

let root: Root;
let node: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});
describe("Practice clock", () => {
  let clock: ReturnType<typeof usePracticeClock>;
  it("finishes if pause is pressed after the deadline but before the next browser tick", () => {
    vi.useFakeTimers();
    const finished = vi.fn();
    function Harness() {
      clock = usePracticeClock(1, finished);
      return null;
    }
    act(() => root.render(<Harness />));
    act(() => clock.start());
    vi.setSystemTime(Date.now() + 1001);
    act(() => clock.pause());
    expect(finished).toHaveBeenCalledTimes(1);
    expect(clock.remaining).toBe(0);
  });
  it("preserves a paused budget and uses wall time after a background delay", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
    const finished = vi.fn();
    function Harness() {
      clock = usePracticeClock(60, finished);
      return null;
    }
    act(() => root.render(<Harness />));
    act(() => clock.start());
    act(() => vi.advanceTimersByTime(10000));
    expect(clock.remaining).toBe(50);
    act(() => clock.pause());
    act(() => vi.advanceTimersByTime(120000));
    expect(clock.remaining).toBe(50);
    act(() => clock.start());
    vi.setSystemTime(Date.now() + 60000);
    act(() => vi.advanceTimersByTime(200));
    expect(finished).toHaveBeenCalledTimes(1);
    expect(clock.remaining).toBe(0);
    act(() => vi.advanceTimersByTime(2000));
    expect(finished).toHaveBeenCalledTimes(1);
  });
  it("moves from a reading clock to a fresh response clock inside the expiry callback", () => {
    vi.useFakeTimers();
    const phases: string[] = [];
    function Harness() {
      clock = usePracticeClock(2, () => {
        phases.push("end");
        if (phases.length === 1) clock.reset(5, true);
      });
      return null;
    }
    act(() => root.render(<Harness />));
    act(() => clock.start());
    act(() => vi.advanceTimersByTime(2000));
    expect(clock.remaining).toBe(5);
    expect(clock.running).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(phases).toHaveLength(2);
    expect(clock.remaining).toBe(0);
  });
  it("uses the latest callback across rerenders without resetting the clock", () => {
    vi.useFakeTimers();
    const old = vi.fn();
    const latest = vi.fn();
    function Harness({ done }: { done: () => void }) {
      clock = usePracticeClock(3, done);
      return null;
    }
    act(() => root.render(<Harness done={old} />));
    act(() => clock.start());
    act(() => vi.advanceTimersByTime(2000));
    act(() => root.render(<Harness done={latest} />));
    act(() => vi.advanceTimersByTime(1000));
    expect(old).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });
});
describe("Private recording lifecycle", () => {
  let api: ReturnType<typeof usePrivateRecorder>;
  let getMedia: ReturnType<typeof vi.fn>;
  let stopTrack: ReturnType<typeof vi.fn>;
  let media: MediaStream;
  class Recorder {
    state = "inactive";
    mimeType = "audio/webm";
    ondataavailable?: (e: { data: Blob }) => void;
    onstop?: () => void;
    onerror?: () => void;
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["test-audio"]) });
      this.onstop?.();
    }
  }
  beforeEach(() => {
    stopTrack = vi.fn();
    media = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;
    getMedia = vi.fn().mockResolvedValue(media);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: getMedia },
    });
    vi.stubGlobal("MediaRecorder", Recorder);
    vi.stubGlobal(
      "URL",
      Object.assign(class {}, {
        createObjectURL: vi.fn(() => "blob:private"),
        revokeObjectURL: vi.fn(),
      }),
    );
    function Harness() {
      api = usePrivateRecorder();
      return null;
    }
    act(() => root.render(<Harness />));
  });
  it("records on demand, releases the microphone and revokes discarded audio", async () => {
    expect(getMedia).not.toHaveBeenCalled();
    await act(async () => api.start());
    expect(api.state).toBe("recording");
    act(() => api.stop());
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(api.url).toBe("blob:private");
    expect(api.state).toBe("ready");
    act(() => api.discard());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private");
    expect(api.url).toBe("");
  });
  it("cancels a pending microphone request even if permission arrives later", async () => {
    let resolve!: (m: MediaStream) => void;
    getMedia.mockReturnValue(
      new Promise<MediaStream>((r) => {
        resolve = r;
      }),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = api.start();
    });
    expect(api.state).toBe("requesting");
    act(() => api.stop());
    await act(async () => {
      resolve(media);
      await pending;
    });
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(api.state).toBe("idle");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("cleans up permission resolving after the room unmounts", async () => {
    let resolve!: (m: MediaStream) => void;
    getMedia.mockReturnValue(
      new Promise<MediaStream>((r) => {
        resolve = r;
      }),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = api.start();
    });
    act(() => root.render(null));
    await act(async () => {
      resolve(media);
      await pending;
    });
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("offers a written fallback when microphone access is denied", async () => {
    getMedia.mockRejectedValue(new Error("NotAllowedError"));
    await act(async () => api.start());
    expect(api.state).toBe("idle");
    expect(api.error).toContain("type or practise aloud");
  });
  it("stops at the recording limit and releases the device", async () => {
    vi.useFakeTimers();
    await act(async () => api.start());
    act(() => vi.advanceTimersByTime(600000));
    expect(api.state).toBe("ready");
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
});
describe("Local practice ownership and storage", () => {
  let api: ReturnType<typeof usePracticeProfile>;
  beforeEach(() => localStorage.clear());
  function Harness({ scope }: { scope: string }) {
    api = usePracticeProfile(scope);
    return null;
  }
  it("keeps signed-in and guest profiles separate", () => {
    act(() => root.render(<Harness scope="guest" key="guest" />));
    act(() => api.update((p) => ({ ...p, bookmarks: ["a"] })));
    act(() => root.render(<Harness scope="account-1" key="account-1" />));
    expect(api.profile.bookmarks).toEqual([]);
    act(() => api.update((p) => ({ ...p, bookmarks: ["b"] })));
    expect(
      JSON.parse(localStorage.getItem("intrvue:medicine-studio:v1:guest")!)
        .bookmarks,
    ).toEqual(["a"]);
  });
  it("reads another tab’s saved changes before applying a new update", () => {
    act(() => root.render(<Harness scope="guest" />));
    const remote = { ...emptyProfile(), bookmarks: ["from-other-tab"] };
    localStorage.setItem(
      "intrvue:medicine-studio:v1:guest",
      JSON.stringify(remote),
    );
    act(() => api.update((p) => ({ ...p, goal: { ...p.goal, minutes: 10 } })));
    expect(api.profile.bookmarks).toEqual(["from-other-tab"]);
    expect(api.profile.goal.minutes).toBe(10);
  });
  it("retains unsaved data in memory when storage is unavailable", () => {
    act(() => root.render(<Harness scope="guest" />));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    act(() => api.update((p) => ({ ...p, bookmarks: ["keep-me"] })));
    act(() => api.update((p) => ({ ...p, goal: { ...p.goal, days: 5 } })));
    expect(api.profile.bookmarks).toEqual(["keep-me"]);
    expect(api.error).toContain("could not save");
  });
});
