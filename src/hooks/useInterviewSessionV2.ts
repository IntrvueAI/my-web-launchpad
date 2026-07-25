import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';
import { AnamEvent } from "@anam-ai/js-sdk/dist/module/types";
import { supabase } from '@/integrations/supabase/client';
import { InterviewType } from '@/config/interviewTypes';
import { useInterviewSessionLogger } from './useInterviewSessionLogger';
import { useConnectionHealthCheck } from './useConnectionHealthCheck';
import { useDeepgramMic } from './useDeepgramMic';
import { brainTurn } from '@/api/interviewBrain';
import type { BrainResponse, Mode } from '@/interview/engine/types';

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error';

// Coalesce window is longer than V1's (650ms): Deepgram's own turn-end already absorbs most
// natural thinking pauses (that's its job), so this only needs to catch a genuinely separate
// follow-on burst arriving right after a turn was already closed out.
const COALESCE_MS = 400;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface StartOptions {
  mode?: Mode;
  topic?: string;
}

interface UseInterviewSessionV2Return {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  sessionStatus: SessionStatus;
  chatHistory: ChatMessage[];
  liveCaption: string;
  sessionReference: string | null;
  connectionHealth: 'good' | 'poor' | 'offline';
  startInterview: (userId: string, opts?: StartOptions) => Promise<void>;
  stopInterview: () => Promise<string | null>;
  setMicMuted: (muted: boolean) => void;
  sendTypedMessage: (text: string) => void;
  skipQuestion: () => Promise<void>;
  switchTopic: (topic: string) => Promise<void>;
  brainUiState: BrainResponse['uiState'] | null;
  interviewComplete: boolean;
}

/**
 * 11-plus-v2: same engine-driven brain loop as useInterviewSession, but STT + turn-detection come
 * from Deepgram (useDeepgramMic) instead of Anam's own listening — Anam's input audio is disabled
 * entirely (`disableInputAudio: true`), so it never processes the mic itself. Anam is used purely
 * for avatar rendering + TTS here: we tell it what to say (`client.talk()`) and, for its own
 * internal bookkeeping, what the student said (`client.sendUserMessage()`) — but WE decide when a
 * student turn is complete (Deepgram's turn-end signal), not Anam's endOfSpeechSensitivity.
 */
export const useInterviewSessionV2 = (
  videoRef: React.RefObject<HTMLVideoElement>,
  interviewType: InterviewType
): UseInterviewSessionV2Return => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [liveCaption, setLiveCaption] = useState('');
  const [brainUiState, setBrainUiState] = useState<BrainResponse['uiState'] | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);

  const clientRef = useRef<any>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());

  const sessionRefRef = useRef<string | null>(null);
  const startOptsRef = useRef<StartOptions>({});
  const transcriptRef = useRef<string[]>([]);
  const brainBusyRef = useRef<boolean>(false);
  const startedRef = useRef<boolean>(false);
  const pendingStudentRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});
  // Accumulates finalized Deepgram segments for the CURRENT (not-yet-ended) turn.
  const utteranceBufferRef = useRef<string>('');
  const peerAudioRef = useRef<{ ctx: AudioContext; raf: number } | null>(null);

  const sessionLogger = useInterviewSessionLogger();
  const connectionHealth = useConnectionHealthCheck(15000);
  const deepgramMic = useDeepgramMic();

  const pushTranscript = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!content?.trim()) return;
    transcriptRef.current.push(`${role === 'user' ? 'Student' : 'Interviewer'}: ${content.trim()}`);
    setChatHistory((prev) => [...prev, { role, content: content.trim(), timestamp: new Date() }]);
  }, []);

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
      if (pendingStudentRef.current.length > 0) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS);
      }
    }
  }, [speak, sessionLogger]);

  const flushStudentBuffer = useCallback(() => {
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    if (brainBusyRef.current) return;
    const buffered = pendingStudentRef.current.join(' ').replace(/\s+/g, ' ').trim();
    if (!buffered) return;
    pendingStudentRef.current = [];
    runBrainTurn('answer', { studentText: buffered });
  }, [runBrainTurn]);

  useEffect(() => { flushRef.current = flushStudentBuffer; }, [flushStudentBuffer]);

  const getSessionToken = async (): Promise<string> => {
    try {
      const personaConfig: Record<string, unknown> = {
        name: `${interviewType.name} Assistant`,
        avatarId: "bb4f5306-ffdb-4437-a837-da6fdc23cbff",
        avatarModel: "cara-4",
        voiceId: "04965b9e-ff4c-4b54-a4dc-fba6e458c760",
        maxSessionLengthSeconds: interviewType.duration * 60,
        llmId: 'CUSTOMER_CLIENT_V1',
      };

      const { data, error } = await supabase.functions.invoke('get-anam-session-token', {
        body: { personaConfig, engineDriven: true },
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

  /** A real turn just ended (Deepgram's own endpointing/utterance-end decided so) — flush it. */
  const handleStudentTurn = useCallback((text: string) => {
    if (!text?.trim() || !startedRef.current) return;
    pushTranscript('user', text);
    try { clientRef.current?.sendUserMessage(text); } catch { /* purely informational to Anam */ }
    pendingStudentRef.current.push(text.trim());
    if (brainBusyRef.current) return;
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => flushRef.current(), COALESCE_MS);
  }, [pushTranscript]);

  /** Watches Clara's own output audio level (from the video element's stream) and gates the
   *  Deepgram mic while she's audibly speaking. Retries briefly if the stream isn't attached to
   *  the video element yet (streamToVideoElement's promise resolving doesn't strictly guarantee
   *  srcObject is already populated by the time we check). */
  const startPeerAudioWatch = useCallback((attempt = 0) => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream || stream.getAudioTracks().length === 0) {
      if (attempt < 8) setTimeout(() => startPeerAudioWatch(attempt + 1), 250);
      return;
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    // Empirical thresholds, not measured against real hardware — may need tuning after live testing.
    const LOUD_RMS = 6;
    const QUIET_HOLD_MS = 350; // small tail so reverb/echo right as she stops doesn't leak through

    let speaking = false;
    let quietSince = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] - 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      if (rms > LOUD_RMS) {
        quietSince = 0;
        if (!speaking) { speaking = true; deepgramMic.setPeerActive(true); }
      } else if (speaking) {
        if (!quietSince) quietSince = performance.now();
        else if (performance.now() - quietSince > QUIET_HOLD_MS) {
          speaking = false;
          deepgramMic.setPeerActive(false);
        }
      }
      if (peerAudioRef.current) peerAudioRef.current.raf = requestAnimationFrame(tick);
    };
    peerAudioRef.current = { ctx, raf: requestAnimationFrame(tick) };
  }, [videoRef, deepgramMic]);

  const stopPeerAudioWatch = useCallback(() => {
    if (peerAudioRef.current) {
      cancelAnimationFrame(peerAudioRef.current.raf);
      peerAudioRef.current.ctx.close().catch(() => {});
      peerAudioRef.current = null;
    }
    deepgramMic.setPeerActive(false);
  }, [deepgramMic]);

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
      pendingStudentRef.current = [];
      utteranceBufferRef.current = '';
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      startedRef.current = false;
      startOptsRef.current = opts;

      const sessionRef = await sessionLogger.startSession(interviewType, userId);
      sessionRefRef.current = sessionRef;
      sessionLogger.logEvent('session_start', 'Interview session initialization started').catch(() => {});

      connectionHealth.startMonitoring();

      const sessionToken = await getSessionToken();
      sessionLogger.logEvent('anam_token', 'Successfully obtained Anam session token').catch(() => {});

      // Anam never touches the mic here — Deepgram (useDeepgramMic) does the listening instead.
      const client = createClient(sessionToken, { disableInputAudio: true });
      clientRef.current = client;

      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, () => {
        lastMessageTimeRef.current = Date.now();
        sessionLogger.updateActivity().catch(() => {});
      });

      const kickOff = () => {
        if (startedRef.current) return;
        startedRef.current = true;
        runBrainTurn('start', { mode: opts.mode ?? 'mock', topic: opts.topic });
      };
      client.addListener(AnamEvent.SESSION_READY, kickOff);

      if (!videoRef.current) throw new Error('Video element lost during initialization');
      await client.streamToVideoElement('interview-video');
      startPeerAudioWatch();

      // Deepgram is our mic now — start it alongside the avatar stream.
      await deepgramMic.start({
        onInterim: (text) => setLiveCaption(text),
        onSegmentFinal: (text) => {
          utteranceBufferRef.current = (utteranceBufferRef.current + ' ' + text).trim();
          setLiveCaption('');
        },
        onTurnEnd: () => {
          const text = utteranceBufferRef.current.trim();
          utteranceBufferRef.current = '';
          setLiveCaption('');
          if (text) handleStudentTurn(text);
        },
        onError: (message) => {
          console.error('Deepgram mic error:', message);
          sessionLogger.logError(`Deepgram error: ${message}`).catch(() => {});
        },
      });

      setIsConnected(true);
      setIsStreaming(true);
      setSessionStatus('streaming');
      sessionLogger.logEvent('streaming_start', 'Video streaming started successfully').catch(() => {});

      if (!startedRef.current) kickOff();
    } catch (err) {
      console.error('❌ Failed to start interview (v2):', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start interview';
      sessionLogger.logError(`Failed to start interview: ${errorMessage}`).catch(() => {});
      setError(errorMessage);
      setSessionStatus('error');
      setIsConnected(false);
      setIsStreaming(false);
    }
  }, [videoRef, sessionLogger, connectionHealth, interviewType, runBrainTurn, handleStudentTurn, deepgramMic, startPeerAudioWatch]);

  const sendTypedMessage = useCallback((text: string) => {
    const t = (text || '').trim();
    if (!t) return;
    handleStudentTurn(t);
  }, [handleStudentTurn]);

  const skipQuestion = useCallback(async () => {
    if (interviewComplete) return;
    await runBrainTurn('skip');
  }, [runBrainTurn, interviewComplete]);

  const switchTopic = useCallback(async (topic: string) => {
    await runBrainTurn('switch_topic', { topic });
  }, [runBrainTurn]);

  const buildTranscription = (): string | null => {
    const t = transcriptRef.current.join('\n\n');
    return t.trim().length > 0 ? t : null;
  };

  const stopInterview = useCallback(async (): Promise<string | null> => {
    try {
      let transcription: string | null = null;
      await sessionLogger.logEvent('stop_interview', 'Interview stop initiated');

      deepgramMic.stop();
      stopPeerAudioWatch();

      if (clientRef.current) {
        try {
          transcription = buildTranscription();
          const hasStudent = (transcription || '').includes('Student:');
          if (!hasStudent) {
            console.warn('No student responses detected in transcription.');
            await sessionLogger.logError('No student responses detected in transcription');
          }
          await sessionLogger.logEvent('transcription_generated', 'Transcription built', 'info', {
            has_student_responses: hasStudent,
            engine_driven: true,
            stt_provider: 'deepgram',
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
      setLiveCaption('');
      startedRef.current = false;

      return transcription;
    } catch (err) {
      console.error('Failed to stop interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop interview';
      await sessionLogger.logError(`Stop interview error: ${errorMessage}`);
      setError(errorMessage);
      return null;
    }
  }, [sessionLogger, connectionHealth, deepgramMic, stopPeerAudioWatch]);

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

  useEffect(() => {
    return () => {
      deepgramMic.stop();
      if (peerAudioRef.current) {
        cancelAnimationFrame(peerAudioRef.current.raf);
        peerAudioRef.current.ctx.close().catch(() => {});
        peerAudioRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.stopStreaming().catch(console.error);
      }
      connectionHealth.stopMonitoring();
      sessionLogger.endSession('error').catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMicMuted = useCallback((muted: boolean) => {
    deepgramMic.setMuted(muted);
  }, [deepgramMic]);

  return {
    isConnected,
    isStreaming,
    error,
    sessionStatus,
    chatHistory,
    liveCaption,
    sessionReference: sessionLogger.sessionReference,
    connectionHealth: connectionHealth.connectionQuality,
    startInterview,
    stopInterview,
    setMicMuted,
    sendTypedMessage,
    skipQuestion,
    switchTopic,
    brainUiState,
    interviewComplete,
  };
};
