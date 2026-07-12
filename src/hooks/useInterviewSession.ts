
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';
import { AnamEvent } from "@anam-ai/js-sdk/dist/module/types";
import { supabase } from '@/integrations/supabase/client';
import { loadSystemPrompt } from '@/utils/promptLoader';
import { InterviewType } from '@/config/interviewTypes';
import { useInterviewSessionLogger } from './useInterviewSessionLogger';
import { useConnectionHealthCheck } from './useConnectionHealthCheck';
import { brainTurn } from '@/api/interviewBrain';
import type { BrainResponse, Mode } from '@/interview/engine/types';

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
  error: string | null;
  sessionStatus: SessionStatus;
  chatHistory: ChatMessage[];
  sessionReference: string | null;
  connectionHealth: 'good' | 'poor' | 'offline';
  startInterview: (userId: string, opts?: StartOptions) => Promise<void>;
  stopInterview: () => Promise<string | null>;
  setMicMuted: (muted: boolean) => void;
  /** Engine-driven only: skip the current question (recorded in the evidence log). */
  skipQuestion: () => Promise<void>;
  /** Engine-driven only: switch the practice-mode topic mid-run. */
  switchTopic: (topic: string) => Promise<void>;
  /** Live engine UI state (mode/topic/difficulty/progress); null on the legacy path. */
  brainUiState: BrainResponse['uiState'] | null;
  /** True once the brain signals the run is complete (wrap-up spoken). */
  interviewComplete: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [brainUiState, setBrainUiState] = useState<BrainResponse['uiState'] | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);

  // Ref to store the anam client instance and messages
  const clientRef = useRef<any>(null);
  const messagesRef = useRef<any[]>([]);
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

  // Session logging and health monitoring
  const sessionLogger = useInterviewSessionLogger();
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
    if (!client || !say?.trim()) return;
    try {
      await client.talk(say);
    } catch (err) {
      console.error('Failed to talk:', err);
    }
    pushTranscript('assistant', say);
  }, [pushTranscript]);

  /** Run one brain turn and speak the result. Serialised via brainBusyRef. */
  const runBrainTurn = useCallback(async (
    action: 'start' | 'answer' | 'skip' | 'switch_topic',
    payload: { studentText?: string; mode?: Mode; topic?: string } = {},
  ) => {
    const sessionId = sessionRefRef.current;
    if (!sessionId || brainBusyRef.current) return;
    brainBusyRef.current = true;
    try {
      const res = await brainTurn({ sessionId, action, ...payload });
      setBrainUiState(res.uiState);
      await speak(res.say);
      if (res.done) setInterviewComplete(true);
      lastMessageTimeRef.current = Date.now();
    } catch (err) {
      console.error('Brain turn failed:', err);
      sessionLogger.logError(`Brain turn (${action}) failed: ${(err as Error)?.message || err}`)
        .catch(() => {});
    } finally {
      brainBusyRef.current = false;
      // Anything the student said while we were busy is queued — handle it now (coalesced).
      if (pendingStudentRef.current.length > 0) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS);
      }
    }
  }, [speak, sessionLogger]);

  /**
   * Send the buffered student utterance(s) to the brain as one answer. Coalescing means two quick
   * bursts ("um… three" then "the middle one") become a single turn, so Clara answers the whole
   * thought instead of reacting to a half-sentence.
   */
  const flushStudentBuffer = useCallback(() => {
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    if (brainBusyRef.current) return; // still talking — the turn's `finally` will re-schedule this
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

      const { data, error } = await supabase.functions.invoke('get-anam-session-token', {
        body: { personaConfig, engineDriven },
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
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS);
  }, [pushTranscript]);

  /**
   * Start the interview session.
   */
  const startInterview = useCallback(async (userId: string, opts: StartOptions = {}) => {
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }

    try {
      setError(null);
      setSessionStatus('connecting');
      setInterviewComplete(false);
      transcriptRef.current = [];
      processedUserIdsRef.current.clear();
      pendingStudentRef.current = [];
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      startedRef.current = false;
      startOptsRef.current = opts;
      console.log('🚀 Starting interview session...', { engineDriven, opts });

      // Start session logging — for the engine path we MUST have the session_reference before the
      // first brain call, so await it here (it's still resilient: it falls back to a local ref).
      const sessionRef = await sessionLogger.startSession(interviewType, userId);
      sessionRefRef.current = sessionRef;
      sessionLogger.logEvent('session_start', 'Interview session initialization started').catch(() => {});

      connectionHealth.startMonitoring();

      console.log('🔑 Getting session token...');
      const sessionToken = await getSessionToken();

      sessionLogger.logEvent('anam_token', 'Successfully obtained Anam session token').catch(() => {});

      console.log('🤖 Creating Anam client...');
      // endOfSpeechSensitivity (0–1): lower = waits longer before deciding the student has finished,
      // so a thinking pause or a breath doesn't get cut off. Default is 0.5; kids pause a lot, so we
      // run it more patient. Lower further if she still interrupts; raise if replies feel laggy.
      const client = createClient(sessionToken, {
        // Higher = decides the student has finished sooner, so Clara replies faster. 0.1 felt very
        // laggy; 0.45 is snappier while still giving a short pause for thinking. Lower if she cuts in.
        voiceDetection: { endOfSpeechSensitivity: 0.45 },
      });
      clientRef.current = client;

      // Anam fires MESSAGE_HISTORY_UPDATED when the student finishes speaking, with the full history
      // including the new user message (the documented signal for "bring your own LLM" mode).
      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages: any[]) => {
        messagesRef.current = messages;
        lastMessageTimeRef.current = Date.now();
        if (!engineDriven) {
          const formatted: ChatMessage[] = messages.map((msg: any) => ({
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
          if (startedRef.current) return;
          startedRef.current = true;
          runBrainTurn('start', { mode: opts.mode ?? 'mock', topic: opts.topic });
        });
      }

      console.log('📹 Starting video stream...');
      if (!videoRef.current) throw new Error('Video element lost during initialization');
      await client.streamToVideoElement('interview-video');

      setIsConnected(true);
      setIsStreaming(true);
      setSessionStatus('streaming');
      sessionLogger.logEvent('streaming_start', 'Video streaming started successfully').catch(() => {});

      // Fallback for engine path if SESSION_READY didn't fire before streaming resolved.
      if (engineDriven && !startedRef.current) {
        startedRef.current = true;
        runBrainTurn('start', { mode: opts.mode ?? 'mock', topic: opts.topic });
      }

      console.log('🎉 Interview session started successfully');
    } catch (err) {
      console.error('❌ Failed to start interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start interview';
      sessionLogger.logError(`Failed to start interview: ${errorMessage}`).catch(() => {});
      setError(errorMessage);
      setSessionStatus('error');
      setIsConnected(false);
      setIsStreaming(false);
    }
  }, [videoRef, sessionLogger, connectionHealth, interviewType, engineDriven, runBrainTurn, handleStudentTurn]);

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
    const extractText = (msg: any): string => {
      const c = msg?.content;
      if (!c) return '';
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        return c.map((item: any) => (typeof item === 'string' ? item : item?.text || item?.content || item?.value || '')).filter(Boolean).join(' ');
      }
      if (typeof c === 'object') return c.text || c.content || c.value || '';
      return '';
    };
    const lines = messagesRef.current
      .map((msg: any) => {
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
    try {
      let transcription: string | null = null;
      await sessionLogger.logEvent('stop_interview', 'Interview stop initiated');

      if (clientRef.current) {
        try {
          transcription = buildTranscription();
          const hasStudent = (transcription || '').includes('Student:');
          if (!hasStudent) {
            console.warn('No student responses detected in transcription.');
            await sessionLogger.logError('No student responses detected in transcription');
          }
          await sessionLogger.logEvent('transcription_generated', `Transcription built`, 'info', {
            has_student_responses: hasStudent,
            engine_driven: engineDriven,
          });
        } catch (transcriptionError) {
          console.warn('Could not build transcription:', transcriptionError);
          await sessionLogger.logError(`Transcription error: ${transcriptionError}`);
        }

        await clientRef.current.stopStreaming();
        clientRef.current = null;
      }

      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
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
    return () => {
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

  return {
    isConnected,
    isStreaming,
    error,
    sessionStatus,
    chatHistory,
    sessionReference: sessionLogger.sessionReference,
    connectionHealth: connectionHealth.connectionQuality,
    startInterview,
    stopInterview,
    setMicMuted,
    skipQuestion,
    switchTopic,
    brainUiState,
    interviewComplete,
  };
};
