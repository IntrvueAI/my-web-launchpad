import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCallQuality, type CallQuality } from "../useCallQuality";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Messages = { role: "user" | "assistant"; content: string }[];
let quality: CallQuality;
let rtt = 0.06;
const pc = { getStats: vi.fn(async () => new Map([["p", { type: "candidate-pair", nominated: true, currentRoundTripTime: rtt }]])) } as unknown as RTCPeerConnection;

function Harness({ messages, lastReplyMs = null }: { messages: Messages; lastReplyMs?: number | null }) {
  const video = useRef<HTMLVideoElement>(null);
  quality = useCallQuality({
    active: true, videoRef: video, getPeerConnection: () => pc, micStream: null, thinking: false, quietExpected: false,
    micListening: true, messages, lastReplyMs, typing: false,
  });
  return <video ref={video} />;
}
const node = document.createElement("div");
let root = createRoot(node);
async function render(messages: Messages, lastReplyMs: number | null = null) {
  await act(async () => root.render(<Harness messages={messages} lastReplyMs={lastReplyMs} />));
}
afterEach(() => { act(() => root.unmount()); root = createRoot(node); rtt = 0.06; vi.useRealTimers(); });

describe("Live quality checks", () => {
  it("reads the connection from the avatar's WebRTC stats", async () => {
    vi.useFakeTimers();
    await render([]);
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(quality.level).toBe("strong");
    expect(quality.details.rttMs).toBe(60);
  });
  it("suggests moving closer to the Wi-Fi only after the connection stays weak", async () => {
    vi.useFakeTimers();
    rtt = 0.9;
    await render([]);
    expect(quality.tip).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(quality.tip).toBe("weak_connection");
    expect(quality.level).toBe("weak");
    act(() => quality.dismissTip());
    expect(quality.tip).toBeNull();
  });
  it("suggests headphones when Clara's own words come back as the answer", async () => {
    const clara = "Tell me about a time you worked in a team and it didn't go well.";
    await render([{ role: "assistant", content: clara }]);
    await render([{ role: "assistant", content: clara }, { role: "user", content: "tell me about a time you worked in a team" }]);
    expect(quality.tip).toBe("echo");
  });
  it("mentions slow replies when Clara takes a long time to answer", async () => {
    await render([], 12_000);
    expect(quality.tip).toBe("slow_reply");
  });
});
