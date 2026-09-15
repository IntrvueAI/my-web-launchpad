import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { BrainResponse } from "@/interview/engine/types";

const mocks = vi.hoisted(() => ({
  brain: vi.fn(),
  talk: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  start: vi.fn(async () => "session-one"),
}));
vi.mock("@/api/interviewBrain", () => ({ brainTurn: mocks.brain }));
vi.mock("@/lib/invokeEdgeFunction", () => ({
  invokeEdgeFunction: async () => ({
    data: { sessionToken: "mock-token" },
    error: null,
  }),
}));
vi.mock("@anam-ai/js-sdk", () => ({
  createClient: () => ({
    talk: mocks.talk,
    stopStreaming: mocks.stop,
    addListener: vi.fn(),
    streamToVideoElement: async () => {},
    muteInputAudio: vi.fn(),
    unmuteInputAudio: vi.fn(),
  }),
}));
vi.mock("@anam-ai/js-sdk/dist/module/types", () => ({
  AnamEvent: { MESSAGE_HISTORY_UPDATED: "history", SESSION_READY: "ready" },
}));
vi.mock("../useInterviewSessionLogger", () => ({
  useInterviewSessionLogger: () => ({
    startSession: mocks.start,
    sessionId: "uuid",
    sessionReference: "session-one",
    logEvent: async () => {},
    logError: async () => {},
    endSession: async () => {},
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
vi.mock("../use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/interview/debug/debugBus", () => ({ logDebug: vi.fn() }));
import { useInterviewSession } from "../useInterviewSession";
import type { InterviewType } from "@/config/interviewTypes";
const type: InterviewType = {
  id: "medicine-mmi",
  name: "test",
  description: "",
  category: "medicine",
  promptFile: "",
  duration: 70,
  scoringSystem: "0-5",
  scoringCriteria: [],
  difficultyLevel: 2,
  tags: [],
  icon: "",
  engineDriven: true,
};
let session: ReturnType<typeof useInterviewSession>;
function Harness() {
  const video = useRef<HTMLVideoElement>(null);
  session = useInterviewSession(video, type);
  return <video id="interview-video" ref={video} />;
}
function response(index: number): BrainResponse {
  return {
    say: `Station ${index + 1}`,
    done: false,
    uiState: {
      mode: "mock",
      difficulty: 2,
      questionIndex: index,
      targetQuestions: 3,
      onQuestion: true,
      timingSeconds: { prep: 0, response: 2 },
    },
  };
}
describe("Live session control delivery", () => {
  let root: Root, node: HTMLDivElement;
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocks.brain.mockReset();
    mocks.talk.mockClear();
    mocks.start.mockResolvedValue("session-one");
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
  it("queues a timer bell behind an in-flight answer and delivers it once", async () => {
    let finishAnswer!: (r: BrainResponse) => void;
    mocks.brain
      .mockResolvedValueOnce(response(0))
      .mockImplementationOnce(
        () =>
          new Promise<BrainResponse>((resolve) => {
            finishAnswer = resolve;
          }),
      )
      .mockResolvedValueOnce(response(1));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("My first answer."));
    await act(async () => {
      vi.advanceTimersByTime(650);
    });
    expect(mocks.brain).toHaveBeenCalledTimes(2);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(mocks.brain).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishAnswer(response(0));
    });
    expect(mocks.brain).toHaveBeenCalledTimes(3);
    expect(mocks.brain.mock.calls[2][0]).toMatchObject({
      action: "time_up",
      expectedQuestionIndex: 0,
    });
    expect(session.brainUiState?.questionIndex).toBe(1);
  });
  it("discards the queued bell when the answer already advances the station", async () => {
    let finishAnswer!: (r: BrainResponse) => void;
    mocks.brain.mockResolvedValueOnce(response(0)).mockImplementationOnce(
      () =>
        new Promise<BrainResponse>((resolve) => {
          finishAnswer = resolve;
        }),
    );
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("A complete answer."));
    await act(async () => {
      vi.advanceTimersByTime(2650);
    });
    await act(async () => {
      finishAnswer(response(1));
    });
    expect(mocks.brain).toHaveBeenCalledTimes(2);
    expect(session.brainUiState?.questionIndex).toBe(1);
  });
  it("ignores a late model response after the session has stopped", async () => {
    let finishAnswer!: (r: BrainResponse) => void;
    mocks.brain.mockResolvedValueOnce(response(0)).mockImplementationOnce(
      () =>
        new Promise<BrainResponse>((resolve) => {
          finishAnswer = resolve;
        }),
    );
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("Preserve this answer."));
    await act(async () => {
      vi.advanceTimersByTime(650);
    });
    let transcript: string | null = null;
    await act(async () => {
      transcript = await session.stopInterview();
    });
    expect(transcript).toContain("Preserve this answer.");
    const spoken = mocks.talk.mock.calls.length;
    await act(async () => {
      finishAnswer(response(1));
    });
    expect(mocks.talk).toHaveBeenCalledTimes(spoken);
    expect(session.brainUiState).toBeNull();
    expect(session.isStreaming).toBe(false);
  });
  it("retries the same turn identifier without merging in a different answer", async () => {
    mocks.brain
      .mockResolvedValueOnce(response(0))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(response(0));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("Keep this exact answer."));
    await act(async () => {
      vi.advanceTimersByTime(650);
    });
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    const first = mocks.brain.mock.calls[1][0],
      retry = mocks.brain.mock.calls[2][0];
    expect(retry.turnId).toBe(first.turnId);
    expect(retry.studentText).toBe(first.studentText);
    expect(retry.expectedQuestionIndex).toBe(0);
  });
  it('retries a failed timer delivery with the same identifier',async()=>{
    mocks.brain.mockResolvedValueOnce(response(0)).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response(1));
    await act(async()=>{await session.startInterview('user');});
    await act(async()=>{vi.advanceTimersByTime(2000);});
    await act(async()=>{vi.advanceTimersByTime(1300);});
    const first=mocks.brain.mock.calls[1][0],retry=mocks.brain.mock.calls[2][0];
    expect(first.action).toBe('time_up');expect(retry.turnId).toBe(first.turnId);
    expect(session.brainUiState?.questionIndex).toBe(1);
  });
});
