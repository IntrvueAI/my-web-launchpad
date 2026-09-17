import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { BrainResponse } from "@/interview/engine/types";

const mocks = vi.hoisted(() => ({
  brain: vi.fn(),
  talk: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  start: vi.fn(async () => "session-one"),
  token: vi.fn(async () => ({
    data: { sessionToken: "mock-token" },
    error: null,
  })),
  stream: vi.fn(async () => {}),
  end: vi.fn(async () => {}),
  logEvent: vi.fn(async () => {}),
  listeners: new Map<string, (...args: any[]) => void>(),
  create: vi.fn(),
}));
vi.mock("@/api/interviewBrain", () => ({ brainTurn: mocks.brain }));
vi.mock("@/lib/invokeEdgeFunction", () => ({
  invokeEdgeFunction: mocks.token,
}));
vi.mock("@anam-ai/js-sdk", () => ({
  createClient: () => {
    mocks.create();
    return {
      talk: mocks.talk,
      stopStreaming: mocks.stop,
      addListener: (name: string, callback: (...args: any[]) => void) =>
        mocks.listeners.set(name, callback),
      streamToVideoElement: mocks.stream,
      muteInputAudio: vi.fn(),
      unmuteInputAudio: vi.fn(),
    };
  },
}));
vi.mock("@anam-ai/js-sdk/dist/module/types", () => ({
  AnamEvent: {
    MESSAGE_HISTORY_UPDATED: "history",
    SESSION_READY: "ready",
    CONNECTION_CLOSED: "closed",
  },
}));
vi.mock("../useInterviewSessionLogger", () => ({
  useInterviewSessionLogger: () => ({
    startSession: mocks.start,
    sessionId: "uuid",
    sessionReference: "session-one",
    logEvent: mocks.logEvent,
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
    mocks.talk.mockReset().mockResolvedValue(undefined);
    mocks.stop.mockReset().mockResolvedValue(undefined);
    mocks.stream.mockReset().mockResolvedValue(undefined);
    mocks.token
      .mockReset()
      .mockResolvedValue({ data: { sessionToken: "mock-token" }, error: null });
    mocks.end.mockClear();
    mocks.logEvent.mockReset().mockResolvedValue(undefined);
    mocks.create.mockClear();
    mocks.listeners.clear();
    mocks.start.mockReset().mockResolvedValue("session-one");
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
  it("retries a failed timer delivery with the same identifier", async () => {
    mocks.brain
      .mockResolvedValueOnce(response(0))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(response(1));
    await act(async () => {
      await session.startInterview("user");
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    const first = mocks.brain.mock.calls[1][0],
      retry = mocks.brain.mock.calls[2][0];
    expect(first.action).toBe("time_up");
    expect(retry.turnId).toBe(first.turnId);
    expect(session.brainUiState?.questionIndex).toBe(1);
  });
  it("keeps an answer entered while the opening greeting is still loading", async () => {
    let finish!: (r: BrainResponse) => void;
    mocks.brain
      .mockImplementationOnce(
        () =>
          new Promise<BrainResponse>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(response(0));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() =>
      session.sendTypedMessage("I want to test a scientific explanation."),
    );
    await act(async () => {
      finish({
        ...response(0),
        uiState: { ...response(0).uiState, onQuestion: false },
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(650);
    });
    expect(mocks.brain).toHaveBeenCalledTimes(2);
    expect(mocks.brain.mock.calls[1][0].studentText).toBe(
      "I want to test a scientific explanation.",
    );
  });
  it("does not open a late avatar connection after stopping during token creation", async () => {
    let finish!: (r: any) => void;
    mocks.token.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let connecting!: Promise<void>;
    await act(async () => {
      connecting = session.startInterview("user");
    });
    await act(async () => {
      await session.stopInterview();
    });
    await act(async () => {
      finish({ data: { sessionToken: "late" }, error: null });
      await connecting;
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(session.isStreaming).toBe(false);
  });
  it("cleans up a rejected stream and closes the database session", async () => {
    mocks.stream.mockRejectedValueOnce(new Error("Microphone denied"));
    await act(async () => {
      await session.startInterview("user");
    });
    expect(mocks.stop).toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledWith("error");
    expect(session.sessionStatus).toBe("error");
    expect(session.isStreaming).toBe(false);
  });
  it("preserves the transcript when the provider disconnects", async () => {
    mocks.brain.mockResolvedValueOnce(response(0));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() => session.sendTypedMessage("My reasoning is worth keeping."));
    await act(async () => {
      mocks.listeners.get("closed")?.("network");
    });
    expect(session.isStreaming).toBe(false);
    expect(session.error).toContain("connection ended");
    let transcript: string | null = null;
    await act(async () => {
      transcript = await session.stopInterview();
    });
    expect(transcript).toContain("My reasoning is worth keeping.");
  });
  it("repeats a reply without advancing or duplicating the transcript", async () => {
    mocks.brain.mockResolvedValueOnce(response(0));
    await act(async () => {
      await session.startInterview("user");
    });
    const messages = session.chatHistory.length;
    await act(async () => {
      await session.repeatLastResponse();
    });
    expect(mocks.brain).toHaveBeenCalledTimes(1);
    expect(mocks.talk).toHaveBeenCalledTimes(2);
    expect(session.chatHistory).toHaveLength(messages);
  });
  it("times out a stalled connection and closes a stream that resolves late", async () => {
    let resolveStream!: () => void;
    mocks.stream.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStream = resolve;
        }),
    );
    let connecting!: Promise<void>;
    await act(async () => {
      connecting = session.startInterview("user");
    });
    await act(async () => {
      vi.advanceTimersByTime(45000);
      await connecting;
    });
    expect(session.error).toContain("Connection timed out");
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveStream();
    });
    expect(mocks.stop).toHaveBeenCalledTimes(2);
    expect(session.isStreaming).toBe(false);
    expect(mocks.brain).not.toHaveBeenCalled();
  });
  it("coalesces repeated starts into one saved session and avatar connection", async () => {
    let resolveToken!: (result: any) => void;
    mocks.token.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
    );
    mocks.brain.mockResolvedValueOnce(response(0));
    let first!: Promise<void>;
    await act(async () => {
      first = session.startInterview("user");
    });
    await act(async () => {
      await session.startInterview("user");
    });
    await act(async () => {
      resolveToken({ data: { sessionToken: "token" }, error: null });
      await first;
    });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("closes the microphone and returns the transcript even if diagnostic writes stall", async () => {
    mocks.brain.mockResolvedValueOnce(response(0));
    await act(async () => {
      await session.startInterview("user");
    });
    act(() =>
      session.sendTypedMessage("Keep my work when logging is unavailable."),
    );
    mocks.logEvent.mockImplementation(() => new Promise<void>(() => {}));
    let transcript: string | null = null;
    await act(async () => {
      transcript = await session.stopInterview();
    });
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(transcript).toContain("Keep my work when logging is unavailable.");
    expect(session.isStreaming).toBe(false);
  });
  it("does not consume a provider session when saving the interview fails", async () => {
    mocks.start.mockRejectedValueOnce(
      new Error("Your interview could not be saved."),
    );
    await act(async () => {
      await session.startInterview("user");
    });
    expect(mocks.token).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(session.error).toContain("could not be saved");
  });
});
