import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { BrainResponse } from "@/interview/engine/types";
const mocks = vi.hoisted(() => ({
  brain: vi.fn(),
  talk: vi.fn(),
  stop: vi.fn(),
  stream: vi.fn(),
  token: vi.fn(),
  end: vi.fn(),
  log: vi.fn(),
  micStart: vi.fn(),
  micStop: vi.fn(),
}));
vi.mock("@/api/interviewBrain", () => ({ brainTurn: mocks.brain }));
vi.mock("@/lib/invokeEdgeFunction", () => ({
  invokeEdgeFunction: mocks.token,
}));
vi.mock("@anam-ai/js-sdk", () => ({
  createClient: () => ({
    talk: mocks.talk,
    stopStreaming: mocks.stop,
    streamToVideoElement: mocks.stream,
    addListener: vi.fn(),
    sendUserMessage: vi.fn(),
  }),
}));
vi.mock("@anam-ai/js-sdk/dist/module/types", () => ({
  AnamEvent: { MESSAGE_HISTORY_UPDATED: "history", SESSION_READY: "ready" },
}));
vi.mock("../useInterviewSessionLogger", () => ({
  useInterviewSessionLogger: () => ({
    startSession: async () => "session-one",
    sessionId: "uuid",
    sessionReference: "session-one",
    logEvent: mocks.log,
    logError: async () => {},
    endSession: mocks.end,
    updateActivity: async () => {},
  }),
}));
vi.mock("../useConnectionHealthCheck", () => ({
  useConnectionHealthCheck: () => ({
    connectionQuality: "good",
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
  }),
}));
vi.mock("../useDeepgramMic", () => ({
  useDeepgramMic: () => ({
    start: mocks.micStart,
    stop: mocks.micStop,
    setPeerActive: vi.fn(),
    setMuted: vi.fn(),
    finalize: vi.fn(),
  }),
}));
vi.mock("../use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/interview/debug/debugBus", () => ({ logDebug: vi.fn() }));
vi.mock("@/lib/appLogger", () => ({ logAppEvent: async () => {} }));
import { useInterviewSessionV2 } from "../useInterviewSessionV2";
import { INTERVIEW_TYPES } from "@/config/interviewTypes";
let session: ReturnType<typeof useInterviewSessionV2>;
function Harness() {
  const ref = useRef<HTMLVideoElement>(null);
  session = useInterviewSessionV2(ref, INTERVIEW_TYPES["11-plus-v2"]);
  return <video ref={ref} />;
}
const response = (index = 0): BrainResponse => ({
  say: "Tell me about your method.",
  done: false,
  uiState: {
    mode: "mock",
    difficulty: 2,
    questionIndex: index,
    targetQuestions: 6,
    onQuestion: true,
  },
});
describe("Alternative 11+ voice reliability", () => {
  let root: Root, node: HTMLDivElement;
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Object.values(mocks).forEach((mock) => mock.mockReset());
    for (const mock of [
      mocks.talk,
      mocks.stop,
      mocks.stream,
      mocks.end,
      mocks.log,
      mocks.micStart,
    ])
      mock.mockResolvedValue(undefined);
    mocks.token.mockResolvedValue({
      data: { sessionToken: "test-token" },
      error: null,
    });
    node = document.createElement("div");
    document.body.append(node);
    root = createRoot(node);
    act(() => root.render(<Harness />));
  });
  afterEach(() => {
    act(() => root.unmount());
    node.remove();
    vi.useRealTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });
  it("retries the identical operation without merging a later answer", async () => {
    mocks.brain
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(response());
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("My first reasoning."));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    act(() => session.sendTypedMessage("Another detail."));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(mocks.brain.mock.calls[2][0]).toEqual(mocks.brain.mock.calls[1][0]);
    expect(mocks.brain.mock.calls[2][0].turnId).toBeTruthy();
    expect(mocks.brain.mock.calls[2][0].studentText).toBe(
      "My first reasoning.",
    );
  });
  it("stops after two retries instead of repeatedly billing failed calls", async () => {
    mocks.brain
      .mockResolvedValueOnce(response())
      .mockRejectedValue(new Error("unavailable"));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("Please keep this."));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(mocks.brain).toHaveBeenCalledTimes(4);
    expect(session.chatHistory.filter((m) => m.role === "user")).toHaveLength(
      1,
    );
  });
  it("queues a skip behind an answer and cancels stale replies after ending", async () => {
    let resolve!: (value: BrainResponse) => void;
    mocks.brain
      .mockResolvedValueOnce(response())
      .mockImplementationOnce(
        () =>
          new Promise<BrainResponse>((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValue(response(1));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("My answer."));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await act(async () => {
      await session.skipQuestion();
    });
    expect(mocks.brain).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolve(response());
    });
    expect(mocks.brain.mock.calls[2][0]).toMatchObject({
      action: "skip",
      expectedQuestionIndex: 0,
    });
    mocks.brain.mockImplementationOnce(
      () =>
        new Promise<BrainResponse>((r) => {
          resolve = r;
        }),
    );
    act(() => session.sendTypedMessage("Final answer."));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    let transcript: string | null = null;
    await act(async () => {
      transcript = await session.stopInterview();
    });
    const spoken = mocks.talk.mock.calls.length;
    await act(async () => {
      resolve(response(2));
    });
    expect(mocks.talk).toHaveBeenCalledTimes(spoken);
    expect(transcript).toContain("Final answer.");
    expect(session.brainUiState).toBeNull();
  });
  it("returns the transcript when avatar shutdown fails", async () => {
    mocks.brain.mockResolvedValue(response());
    mocks.stop.mockRejectedValue(new Error("already disconnected"));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("My saved answer."));
    let transcript: string | null = null;
    await act(async () => {
      transcript = await session.stopInterview();
    });
    expect(transcript).toContain("My saved answer.");
    expect(mocks.micStop).toHaveBeenCalled();
    expect(session.isStreaming).toBe(false);
  });
});
