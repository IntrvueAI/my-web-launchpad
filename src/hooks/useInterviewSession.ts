
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient, type AnamClient } from '@anam-ai/js-sdk';
import { AnamEvent, type Message as AnamMessage } from "@anam-ai/js-sdk/dist/module/types";
import { loadSystemPrompt } from '@/utils/promptLoader';
import { InterviewType } from '@/config/interviewTypes';
import { useInterviewSessionLogger } from './useInterviewSessionLogger';
import { useConnectionHealthCheck } from './useConnectionHealthCheck';
import { useToast } from './use-toast';
import { brainTurn } from '@/api/interviewBrain';
import type { BrainResponse, Mode } from '@/interview/engine/types';
import type { StationClockState } from '@/interview/engine/stationClock';
import { useStationClock } from './useStationClock';
import { StationControlQueue } from '@/interview/engine/controlQueue';
import { logDebug } from '@/interview/debug/debugBus';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';

// Types for the interview session
type SessionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error';

// How long we wait after the student stops before sending their answer to the brain, so quick
// consecutive bursts get merged into one turn (feels less abrupt than reacting to each fragment).
const COALESCE_MS = 650;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/** Options the setup screen passes when starting an engine-driven interview. */
export interface StartOptions {
  mode?: Mode;
  topic?: string;
}

interface UseInterviewSessionReturn {
  isConnected: boolean;
  isStreaming: boolean;
  isThinking: boolean;
  repeatLastResponse: () => Promise<void>;
  error: string | null;
  sessionStatus: SessionStatus;
  chatHistory: ChatMessage[];
  sessionReference: string | null;
  /** The real interview_sessions.id (UUID) — for tagging app_logs rows from outside the hook. */
  sessionId: string | null;
  connectionHealth: 'good' | 'poor' | 'offline';
  startInterview: (userId: string, opts?: StartOptions) => Promise<void>;
  stopInterview: () => Promise<string | null>;
  setMicMuted: (muted: boolean) => void;
  /** While true, Deepgram's own turn-end (VAD) is ignored — only flushPushToTalkTurn() submits. */
  setPushToTalkMode: (active: boolean) => void;
  /** Called on push-to-talk release: submits whatever's been said as ONE turn. */
  flushPushToTalkTurn: () => void;
  /** Type-mode: submit a typed answer instead of speech (testing / accessibility). */
  sendTypedMessage: (text: string) => void;
  /** Engine-driven only: skip the current question (recorded in the evidence log). */
  skipQuestion: () => Promise<void>;
  /** Engine-driven only: switch the practice-mode topic mid-run. */
  switchTopic: (topic: string) => Promise<void>;
  /** Live engine UI state (mode/topic/difficulty/progress); null on the legacy path. */
  brainUiState: BrainResponse['uiState'] | null;
  /** True once the brain signals the run is complete (wrap-up spoken). */
  interviewComplete: boolean;
  /**
   * Real per-station countdown — only present for interview types that set `timingSeconds`
   * (currently the two Medicine MMI school modes). Null for every other interview type, so
   * existing UIs render nothing extra by default.
   */
  stationTimer: StationClockState | null;
}

/**
 * Custom hook to manage an Anam interview session.
 *
 * Two paths share the same connection/logging plumbing:
 * - **Legacy:** Anam's bundled LLM runs the whole conversation from a static system prompt.
 * - **Engine-driven (`interviewType.engineDriven`):** our interview-brain edge function drives the
 *   avatar one turn at a time via `client.talk()`, pulling questions from a server-held bank.
 */
export const useInterviewSession = (
  videoRef: React.RefObject<HTMLVideoElement>,
  interviewType: InterviewType
): UseInterviewSessionReturn => {
  const engineDriven = Boolean(interviewType.engineDriven);

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const latestResponseRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [brainUiState, setBrainUiState] = useState<BrainResponse['uiState'] | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const uiStateRef = useRef<BrainResponse['uiState'] | null>(null);
  const controlsRef = useRef(new StationControlQueue());
  const answerRetriesRef = useRef(0);
  type TurnPayload = { studentText?: string; mode?: Mode; topic?: string; expectedQuestionIndex?: number; turnId?: string };
  type TurnAction = 'start' | 'answer' | 'skip' | 'switch_topic' | 'time_up';
  const turnRef = useRef<(action: TurnAction, payload?: TurnPayload) => Promise<void>>(async () => {});
  const retryTurnRef = useRef<{action:TurnAction;payload:TurnPayload}|null>(null);

  // Ref to store the anam client instance and messages
  const clientRef = useRef<AnamClient | null>(null);
  const messagesRef = useRef<AnamMessage[]>([]);
  const lastMessageTimeRef = useRef<number>(Date.now());

  // Engine-driven turn loop refs
  const sessionRefRef = useRef<string | null>(null);
  const startOptsRef = useRef<StartOptions>({});
  const transcriptRef = useRef<string[]>([]);          // "Interviewer: …" / "Student: …" lines
  const processedUserIdsRef = useRef<Set<string>>(new Set()); // user message ids already sent to the brain
  const brainBusyRef = useRef<boolean>(false);
  const startedRef = useRef<boolean>(false);
  // Buffer of student utterances waiting to go to the brain. If the child speaks while Clara is still
  // talking or the brain is mid-turn, we DON'T drop it (that felt like she "gave up") — we queue it
  // and coalesce close-together bursts into one answer so a mid-thought pause doesn't fragment the turn.
  const pendingStudentRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});
  // While push-to-talk is the active input mode, the button is the turn boundary — a mid-answer
  // pause must NOT auto-flush to the brain (that's Clara "cutting in" before they're done). See
  // setPushToTalkMode / flushPushToTalkTurn, called from the component on hold-start/release.
  const pushToTalkModeRef = useRef(false);

  // Session logging and health monitoring
  const sessionLogger = useInterviewSessionLogger();
  const { toast } = useToast();
  const connectionHealth = useConnectionHealthCheck(15000);

  // Keep a ref to chatHistory updates so transcript + UI stay in sync.
  const pushTranscript = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!content?.trim()) return;
    transcriptRef.current.push(`${role === 'user' ? 'Student' : 'Interviewer'}: ${content.trim()}`);
    setChatHistory((prev) => [...prev, { role, content: content.trim(), timestamp: new Date() }]);
  }, []);

  /** Speak a brain line through the avatar and record it. */
  const speak = useCallback(async (say: string) => {
    const client = clientRef.current;
    const speakingSession = sessionRefRef.current;
    if (!client || !say?.trim()) return;
    latestResponseRef.current = say;
    logDebug({ source: 'anam', kind: 'request', label: 'client.talk()', detail: say });
    try {
      await client.talk(say);
    } catch (err) {
      console.error('Failed to talk:', err);
      if (speakingSession === sessionRefRef.current && mountedRef.current) {
        setError('The spoken reply could not be delivered. You can read it in the transcript or repeat the last response.');
      }
      logDebug({ source: 'anam', kind: 'error', label: 'client.talk() failed', detail: (err as Error)?.message || String(err) });
    }
    if (speakingSession === sessionRefRef.current && client === clientRef.current) pushTranscript('assistant', say);
  }, [pushTranscript]);

  /** Run one brain turn and speak the result. Serialised via brainBusyRef. */
  const runBrainTurn = useCallback(async (
    action: TurnAction,
    payload: TurnPayload = {},
  ) => {
    const sessionId = sessionRefRef.current;
    if (!sessionId) return;
    payload = { ...payload, turnId: payload.turnId ?? crypto.randomUUID() };
    if (action === 'answer') payload.expectedQuestionIndex ??= uiStateRef.current?.questionIndex;
    const isControl = action === 'skip' || action === 'time_up' || action === 'switch_topic';
    if (isControl) {
      payload = { ...payload, expectedQuestionIndex: payload.expectedQuestionIndex ?? uiStateRef.current?.questionIndex };
      // Preserve speech that arrived before the bell with the station it belongs to.
      if (pendingStudentRef.current.length) {
        payload.studentText = [payload.studentText, ...pendingStudentRef.current].filter(Boolean).join(' ');
        pendingStudentRef.current = [];
      }
    }
    if (brainBusyRef.current) {
      if (isControl) controlsRef.current.enqueue({ action, stationIndex: payload.expectedQuestionIndex, topic: payload.topic, studentText: payload.studentText });
      return;
    }
    if (payload.expectedQuestionIndex !== undefined && payload.expectedQuestionIndex !== uiStateRef.current?.questionIndex) return;
    brainBusyRef.current = true;
    setIsThinking(true);
    const requestBody = { sessionId, action, ...payload, interviewSessionId: sessionLogger.sessionId };
    logDebug({ source: 'brain', kind: 'request', label: `interview-brain: ${action}`, detail: requestBody });
    try {
      const res = await brainTurn(requestBody);
      logDebug({ source: 'brain', kind: 'response', label: `interview-brain: ${action} → "${res.say.slice(0, 60)}${res.say.length > 60 ? '…' : ''}"`, detail: res });
      if (sessionRefRef.current !== sessionId) return;
      // A first greeting assigns the initial index; it is not a station change.
      // Preserve answers submitted while that first request is still running.
      const changedStation = uiStateRef.current !== null && uiStateRef.current.questionIndex !== res.uiState.questionIndex;
      uiStateRef.current = res.uiState;
      setBrainUiState(res.uiState);
      answerRetriesRef.current = 0;
      // Buffered speech was captured under the previous station. Never apply it to a fresh one.
      if (changedStation || res.done) pendingStudentRef.current = [];
      await speak(res.say);
      if (sessionRefRef.current !== sessionId) return;
      if (res.done) setInterviewComplete(true);
      lastMessageTimeRef.current = Date.now();
    } catch (err) {
      if (sessionRefRef.current !== sessionId) return;
      console.error('Brain turn failed:', err);
      logDebug({ source: 'brain', kind: 'error', label: `interview-brain: ${action} failed`, detail: (err as Error)?.message || String(err) });
      sessionLogger.logError(`Brain turn (${action}) failed: ${(err as Error)?.message || err}`)
        .catch(() => {});
      // Retry transient answer/control failures with the same identifier. A timer bell has no
      // second natural firing, so it needs the same bounded delivery guarantee as an answer.
      if ((action === 'start' || (action === 'answer' && payload.studentText) || isControl) && answerRetriesRef.current < 2) {
        answerRetriesRef.current += 1;
        retryTurnRef.current = {action,payload};
      }
      toast({
        title: "Didn't quite catch that",
        description: retryTurnRef.current ? 'Retrying your last message…' : 'Your transcript is saved locally. Please try your last action again.',
      });
    } finally {
      if (sessionRefRef.current !== sessionId) return;
      brainBusyRef.current = false;
      setIsThinking(false);
      if (retryTurnRef.current) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS * (answerRetriesRef.current + 1));
        return;
      }
      const queued = controlsRef.current.take(uiStateRef.current?.questionIndex);
      if (queued && !uiStateRef.current?.onQuestion) controlsRef.current.clear();
      else if (queued) {
        void turnRef.current(queued.action, { topic: queued.topic, studentText: queued.studentText, expectedQuestionIndex: queued.stationIndex });
        return;
      }
      // Anything the student said while we were busy is queued — handle it now (coalesced), unless
      // push-to-talk is being held, in which case it waits for the explicit release flush too.
      if (pendingStudentRef.current.length > 0 && !pushToTalkModeRef.current) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS);
      }
    }
  }, [speak, sessionLogger, toast]);

  turnRef.current = runBrainTurn;
  const stationTimer = useStationClock({
    stationKey: isStreaming && brainUiState?.onQuestion ? `${sessionRefRef.current}:${brainUiState.questionIndex}` : null,
    timing: brainUiState?.timingSeconds,
    onTimeUp: () => { void runBrainTurn('time_up', { expectedQuestionIndex: brainUiState?.questionIndex }); },
  });

  /**
   * Send the buffered student utterance(s) to the brain as one answer. Coalescing means two quick
   * bursts ("um… three" then "the middle one") become a single turn, so Clara answers the whole
   * thought instead of reacting to a half-sentence.
   */
  const flushStudentBuffer = useCallback(() => {
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    if (brainBusyRef.current) return; // still talking — the turn's `finally` will re-schedule this
    if (retryTurnRef.current) {
      const retry = retryTurnRef.current;
      retryTurnRef.current = null;
      void runBrainTurn(retry.action,retry.payload);
      return;
    }
    const buffered = pendingStudentRef.current.join(' ').replace(/\s+/g, ' ').trim();
    if (!buffered) return;
    pendingStudentRef.current = [];
    runBrainTurn('answer', { studentText: buffered });
  }, [runBrainTurn]);

  // Keep flushRef pointing at the latest flush fn so runBrainTurn's `finally` can call it without a
  // circular useCallback dependency.
  useEffect(() => { flushRef.current = flushStudentBuffer; }, [flushStudentBuffer]);

  /**
   * Get session token from the secure edge function. For engine-driven interviews we request a
   * puppet persona (no Anam brain); otherwise we send the composed static system prompt.
   */
  const getSessionToken = async (): Promise<string> => {
    try {
      const personaConfig: Record<string, unknown> = {
        name: `${interviewType.name} Assistant`,
        avatarId: "bb4f5306-ffdb-4437-a837-da6fdc23cbff",
        // Cara 4: current-gen avatar model (higher-res video, better lip sync/expressivity than
        // Cara 3, the implicit default). Same per-minute pricing — model choice doesn't affect it.
        avatarModel: "cara-4",
        voiceId: "04965b9e-ff4c-4b54-a4dc-fba6e458c760",
        maxSessionLengthSeconds: interviewType.duration * 60,
      };

      if (engineDriven) {
        // Anam's "bring your own LLM" mode: disables Anam's built-in AI so the avatar only speaks
        // the lines our interview-brain sends via talk(). No systemPrompt needed.
        personaConfig.llmId = 'CUSTOMER_CLIENT_V1';
      } else {
        personaConfig.brainType = "ANAM_GPT_4O_MINI_V1";
        personaConfig.systemPrompt = await loadSystemPrompt(interviewType.id);
      }

      const { data, error } = await invokeEdgeFunction<{ sessionToken: string }>('get-anam-session-token', {
        body: { personaConfig, engineDriven, sessionReference: sessionRefRef.current },
        interviewSessionId: sessionLogger.sessionId ?? undefined,
      });

      if (error) throw new Error(`Edge function error: ${error.message}`);
      if (!data?.sessionToken) throw new Error('No session token received from server');
      return data.sessionToken;
    } catch (err) {
      console.error('Error getting session token:', err);
      if (err instanceof Error) throw new Error(`Unable to connect to interview service: ${err.message}`);
      throw new Error('Unable to connect to interview service. Please try again.');
    }
  };

  /**
   * Handle the student finishing a turn (engine-driven only). Anam emits a USER
   * MESSAGE_STREAM_EVENT_RECEIVED with endOfSpeech=true; we forward the utterance to the brain.
   */
  const handleStudentTurn = useCallback((text: string) => {
    if (!text?.trim() || !startedRef.current) return;
    pushTranscript('user', text);
    // Queue it rather than firing immediately: if Clara/the brain is mid-turn this is picked up when
    // she finishes (never dropped); otherwise we wait a beat to coalesce any follow-on burst.
    pendingStudentRef.current.push(text.trim());
    if (brainBusyRef.current) return;
    // In push-to-talk mode, don't auto-flush on a pause — wait for the explicit release flush.
    if (pushToTalkModeRef.current) return;
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS);
  }, [pushTranscript]);

  /**
   * Start the interview session.
   */
  const startInterview = useCallback(async (userId: string, opts: StartOptions = {}) => {
    if (startingRef.current || clientRef.current) return;
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }

    startingRef.current = true;
    const generation = ++generationRef.current;
    const current = () => mountedRef.current && generation === generationRef.current;
    let connectingClient: AnamClient | null = null;
    try {
      setError(null);
      setSessionStatus('connecting');
      setInterviewComplete(false);
      transcriptRef.current = [];
      messagesRef.current = [];
      latestResponseRef.current = '';
      setChatHistory([]);
      setIsThinking(false);
      lastMessageTimeRef.current = Date.now();
      processedUserIdsRef.current.clear();
      pendingStudentRef.current = [];
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      controlsRef.current.clear();
      uiStateRef.current = null;
      setBrainUiState(null);
      brainBusyRef.current = false;
      answerRetriesRef.current = 0;
      retryTurnRef.current = null;
      startedRef.current = false;
      startOptsRef.current = opts;

      // Start session logging — for the engine path we MUST have the session_reference before the
      // first brain call. Stop here if the database cannot create an owned session.
      const sessionRef = await sessionLogger.startSession(interviewType, userId);
      if (!current()) { await sessionLogger.endSession('error'); return; }
      sessionRefRef.current = sessionRef;
      sessionLogger.logEvent('session_start', 'Interview session initialization started').catch(() => {});

      connectionHealth.startMonitoring();

      const sessionToken = await getSessionToken();
      if (!current()) return;

      sessionLogger.logEvent('anam_token', 'Successfully obtained Anam session token').catch(() => {});

      // endOfSpeechSensitivity (0–1): lower = waits longer before deciding the student has finished,
      // so a thinking pause or a breath doesn't get cut off. Default is 0.5; kids pause a lot, so we
      // run it more patient. Lower further if she still interrupts; raise if replies feel laggy.
      const client = createClient(sessionToken, {
        // Higher = decides the student has finished sooner, so Clara replies faster. 0.1 felt very
        // laggy; 0.45 is snappier while still giving a short pause for thinking. Lower if she cuts in.
        voiceDetection: { endOfSpeechSensitivity: 0.45 },
      });
      connectingClient = client;
      clientRef.current = client;

      // Anam fires MESSAGE_HISTORY_UPDATED when the student finishes speaking, with the full history
      // including the new user message (the documented signal for "bring your own LLM" mode).
      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages: AnamMessage[]) => {
        if (!current() || clientRef.current !== client) return;
        messagesRef.current = messages;
        lastMessageTimeRef.current = Date.now();
        if (!engineDriven) {
          const formatted: ChatMessage[] = messages.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(),
          }));
          setChatHistory(formatted);
        } else {
          // Engine path: forward any not-yet-seen user message to the brain to drive the next turn.
          for (const msg of messages) {
            const role = (msg?.role || '').toLowerCase();
            const id = msg?.id;
            if (role === 'user' && id && !processedUserIdsRef.current.has(id)) {
              processedUserIdsRef.current.add(id);
              if (startedRef.current) handleStudentTurn((msg.content || '').trim());
            }
          }
        }
        sessionLogger.updateActivity().catch(() => {});
      });

      // Engine path: kick off the interview (greeting + unmarked opener) once the session is ready.
      if (engineDriven) {
        client.addListener(AnamEvent.SESSION_READY, () => {
          if (!current() || clientRef.current !== client || startedRef.current) return;
          startedRef.current = true;
          runBrainTurn('start', { mode: opts.mode ?? 'mock', topic: opts.topic });
        });
      }

      client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
        if (!current() || clientRef.current !== client) return;
        generationRef.current += 1;
        sessionRefRef.current = null;
        clientRef.current = null;
        startedRef.current = false;
        retryTurnRef.current = null;
        pendingStudentRef.current = [];
        controlsRef.current.clear();
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        setIsConnected(false);
        setIsStreaming(false);
        setIsThinking(false);
        setSessionStatus('error');
        setError('The interview connection ended. Your transcript is still available below.');
        connectionHealth.stopMonitoring();
        void client.stopStreaming().catch(() => {});
        void sessionLogger.endSession('error');
      });
      if (!videoRef.current) throw new Error('Video element lost during initialization');
      let connectionTimer: ReturnType<typeof setTimeout> | undefined;
      const stream = client.streamToVideoElement('interview-video');
      // A provider resolving after cancellation must not reopen microphone/video resources.
      void stream.then(() => { if (!current()) void client.stopStreaming().catch(() => {}); }, () => {});
      try {
        await Promise.race([stream, new Promise<never>((_, reject) => {
          connectionTimer = setTimeout(() => reject(new Error('Connection timed out. Check microphone permission and your connection, then try again.')), 45000);
        })]);
      } finally { if (connectionTimer) clearTimeout(connectionTimer); }
      if (!current()) return;

      setIsConnected(true);
      setIsStreaming(true);
      setSessionStatus('streaming');
      sessionLogger.logEvent('streaming_start', 'Video streaming started successfully').catch(() => {});

      // Fallback for engine path if SESSION_READY didn't fire before streaming resolved.
      if (engineDriven && !startedRef.current) {
        startedRef.current = true;
        runBrainTurn('start', { mode: opts.mode ?? 'mock', topic: opts.topic });
      }

    } catch (err) {
      if (!current()) return;
      generationRef.current += 1;
      sessionRefRef.current = null;
      clientRef.current = null;
      startedRef.current = false;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (connectingClient) void connectingClient.stopStreaming().catch(() => {});
      connectionHealth.stopMonitoring();
      await sessionLogger.endSession('error');
      if (!mountedRef.current) return;
      setIsThinking(false);
      console.error('❌ Failed to start interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start interview';
      sessionLogger.logError(`Failed to start interview: ${errorMessage}`).catch(() => {});
      setError(errorMessage);
      setSessionStatus('error');
      setIsConnected(false);
      setIsStreaming(false);
    } finally {
      startingRef.current = false;
    }
  }, [videoRef, sessionLogger, connectionHealth, interviewType, engineDriven, runBrainTurn, handleStudentTurn]);

  /**
   * Submit a TYPED answer (type-mode). Engine path feeds it straight into the same turn pipeline
   * as speech (transcript + coalesced brain turn); legacy path hands it to Anam's own brain via
   * the data channel.
   */
  const sendTypedMessage = useCallback((text: string) => {
    const t = (text || '').trim();
    if (!t) return;
    if (engineDriven) {
      handleStudentTurn(t);
    } else {
      try {
        clientRef.current?.sendUserMessage(t);
      } catch (err) {
        console.error('Failed to send typed message:', err);
      }
    }
  }, [engineDriven, handleStudentTurn]);

  /** Engine-driven: skip the current question. No-op once the interview is complete. */
  const skipQuestion = useCallback(async () => {
    if (!engineDriven || interviewComplete) return;
    await runBrainTurn('skip');
  }, [engineDriven, runBrainTurn, interviewComplete]);

  /** Engine-driven: switch the practice topic mid-run. */
  const switchTopic = useCallback(async (topic: string) => {
    if (!engineDriven) return;
    await runBrainTurn('switch_topic', { topic });
  }, [engineDriven, runBrainTurn]);

  /**
   * Build the transcript for feedback. Engine path uses the locally-recorded lines (reliable, since
   * talk() output isn't guaranteed in Anam's message history); legacy path extracts from messages.
   */
  const buildTranscription = (): string | null => {
    if (engineDriven) {
      const t = transcriptRef.current.join('\n\n');
      return t.trim().length > 0 ? t : null;
    }

    if (!messagesRef.current || messagesRef.current.length === 0) return null;
    const normalizeRole = (role: string) => {
      const r = (role || '').toLowerCase();
      return ['user', 'human', 'student'].includes(r) ? 'Student' : 'Interviewer';
    };
    // Pulls a named string field off an unknown-shaped part (Anam's declared Message.content is a
    // plain string, but defensively handles the richer part shapes some payloads actually send).
    const pickString = (part: unknown, key: string): string => {
      if (part && typeof part === 'object' && key in part) {
        const value = (part as Record<string, unknown>)[key];
        return typeof value === 'string' ? value : '';
      }
      return '';
    };
    const extractText = (msg: { content?: unknown }): string => {
      const c = msg?.content;
      if (!c) return '';
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        return c
          .map((item) => (typeof item === 'string' ? item : pickString(item, 'text') || pickString(item, 'content') || pickString(item, 'value')))
          .filter(Boolean)
          .join(' ');
      }
      if (typeof c === 'object') return pickString(c, 'text') || pickString(c, 'content') || pickString(c, 'value');
      return '';
    };
    const lines = messagesRef.current
      .map((msg) => {
        const text = extractText(msg).trim();
        return text ? `${normalizeRole(msg.role)}: ${text}` : null;
      })
      .filter(Boolean) as string[];
    return lines.length ? lines.join('\n\n') : null;
  };

  /**
   * Stop the interview session and get transcription.
   */
  const stopInterview = useCallback(async (): Promise<string | null> => {
    generationRef.current += 1;
    sessionRefRef.current = null;
    setIsThinking(false);
    retryTurnRef.current = null;
    startedRef.current = false;
    setIsStreaming(false);
    controlsRef.current.clear();
    try {
      let transcription: string | null = buildTranscription();
      // Diagnostic writes must never delay releasing the microphone or block saved work.
      void sessionLogger.logEvent('stop_interview', 'Interview stop initiated').catch(() => {});

      if (clientRef.current) {
        try {
          transcription = buildTranscription();
          const hasStudent = (transcription || '').includes('Student:');
          if (!hasStudent) {
            console.warn('No student responses detected in transcription.');
            void sessionLogger.logError('No student responses detected in transcription').catch(() => {});
          }
          void sessionLogger.logEvent('transcription_generated', `Transcription built`, 'info', {
            has_student_responses: hasStudent,
            engine_driven: engineDriven,
          }).catch(() => {});
        } catch (transcriptionError) {
          console.warn('Could not build transcription:', transcriptionError);
          void sessionLogger.logError(`Transcription error: ${transcriptionError}`).catch(() => {});
        }

        const stoppingClient = clientRef.current;
        clientRef.current = null;
        try { await stoppingClient.stopStreaming(); }
        catch (err) { console.warn('Avatar shutdown failed; preserving transcript:', err); }
      }

      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      controlsRef.current.clear();
      uiStateRef.current = null;
      setBrainUiState(null);
      brainBusyRef.current = false;
      answerRetriesRef.current = 0;
      pendingStudentRef.current = [];

      connectionHealth.stopMonitoring();
      await sessionLogger.endSession(transcription ? 'completed' : 'error');

      setIsConnected(false);
      setIsStreaming(false);
      setSessionStatus('idle');
      setError(null);
      setChatHistory([]);
      startedRef.current = false;

      return transcription;
    } catch (err) {
      console.error('Failed to stop interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop interview';
      await sessionLogger.logError(`Stop interview error: ${errorMessage}`);
      setError(errorMessage);
      return null;
    }
  }, [sessionLogger, connectionHealth, engineDriven]);

  // Monitor for potential timeouts or unresponsive sessions
  useEffect(() => {
    if (!isStreaming) return;
    const timeoutCheck = setInterval(() => {
      void sessionLogger.updateActivity().catch(() => {});
      const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
      if (timeSinceLastMessage > 120000) {
        sessionLogger.logError(`Session timeout detected - no activity for ${Math.round(timeSinceLastMessage / 1000)} seconds`, {
          connection_quality: connectionHealth.connectionQuality,
        });
      }
    }, 30000);
    return () => clearInterval(timeoutCheck);
  }, [isStreaming, sessionLogger, connectionHealth.connectionQuality]);

  /**
   * Cleanup on unmount only
   */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      sessionRefRef.current = null;
      startedRef.current = false;
      controlsRef.current.clear();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (clientRef.current) {
        clientRef.current.stopStreaming().catch(console.error);
      }
      connectionHealth.stopMonitoring();
      sessionLogger.endSession('error').catch(console.error);
    };
  }, []); // Empty dependency array - only run on unmount

  /**
   * Mute or unmute the student's microphone on the live Anam session.
   */
  const setMicMuted = useCallback((muted: boolean) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      if (muted) client.muteInputAudio();
      else client.unmuteInputAudio();
    } catch (err) {
      console.error('Failed to toggle microphone:', err);
    }
  }, []);

  const setPushToTalkMode = useCallback((active: boolean) => {
    pushToTalkModeRef.current = active;
  }, []);

  const flushPushToTalkTurn = useCallback(() => {
    flushStudentBuffer();
  }, [flushStudentBuffer]);

  const repeatLastResponse = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !latestResponseRef.current) return;
    const generation = generationRef.current;
    const current = () => mountedRef.current && generation === generationRef.current && client === clientRef.current;
    try {
      await client.talk(latestResponseRef.current);
      if (current()) setError(null);
    } catch {
      if (current()) setError('Audio is unavailable. Your latest response is visible in the transcript.');
    }
  }, []);

  return {
    isThinking,
    repeatLastResponse,
    isConnected,
    isStreaming,
    error,
    sessionStatus,
    chatHistory,
    sessionReference: sessionLogger.sessionReference,
    sessionId: sessionLogger.sessionId,
    connectionHealth: connectionHealth.connectionQuality,
    startInterview,
    stopInterview,
    setMicMuted,
    setPushToTalkMode,
    flushPushToTalkTurn,
    sendTypedMessage,
    skipQuestion,
    switchTopic,
    brainUiState,
    interviewComplete,
    stationTimer,
  };
};
