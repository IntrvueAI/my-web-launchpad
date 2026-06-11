
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';
import { AnamEvent } from "@anam-ai/js-sdk/dist/module/types";
import { supabase } from '@/integrations/supabase/client';
import { loadSystemPrompt } from '@/utils/promptLoader';
import { InterviewType } from '@/config/interviewTypes';
import { useInterviewSessionLogger } from './useInterviewSessionLogger';
import { useConnectionHealthCheck } from './useConnectionHealthCheck';

// Types for the interview session
type SessionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface UseInterviewSessionReturn {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  sessionStatus: SessionStatus;
  chatHistory: ChatMessage[];
  sessionReference: string | null;
  connectionHealth: 'good' | 'poor' | 'offline';
  startInterview: (userId: string) => Promise<void>;
  stopInterview: () => Promise<string | null>;
  setMicMuted: (muted: boolean) => void;
}

/**
 * Custom hook to manage anam.ai interview session
 * Handles connection, streaming, and session management
 */
export const useInterviewSession = (
  videoRef: React.RefObject<HTMLVideoElement>,
  interviewType: InterviewType
): UseInterviewSessionReturn => {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Ref to store the anam client instance and messages
  const clientRef = useRef<any>(null);
  const messagesRef = useRef<any[]>([]);
  const lastMessageTimeRef = useRef<number>(Date.now());

  // Session logging and health monitoring
  const sessionLogger = useInterviewSessionLogger();
  const connectionHealth = useConnectionHealthCheck(15000); // Check every 15 seconds during interview

  /**
   * Get session token from secure Supabase Edge Function
   * API keys are stored securely in Supabase secrets
   */
  const getSessionToken = async (): Promise<string> => {
    try {
      // Load the system prompt for the selected interview type
      const systemPrompt = await loadSystemPrompt(interviewType.id);
      
      const { data, error } = await supabase.functions.invoke('get-anam-session-token', {
        body: {
          personaConfig: {
            name: `${interviewType.name} Assistant`,
            // Using placeholder IDs - replace these with actual anam.ai persona IDs from your dashboard
            avatarId: "bb4f5306-ffdb-4437-a837-da6fdc23cbff",
            voiceId: "04965b9e-ff4c-4b54-a4dc-fba6e458c760", 
            brainType: "ANAM_GPT_4O_MINI_V1",
            maxSessionLengthSeconds: interviewType.duration * 60, // Convert minutes to seconds
            systemPrompt: systemPrompt
          },
        },
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data?.sessionToken) {
        throw new Error('No session token received from server');
      }

      return data.sessionToken;
    } catch (err) {
      console.error('Error getting session token:', err);
      if (err instanceof Error) {
        throw new Error(`Unable to connect to interview service: ${err.message}`);
      }
      throw new Error('Unable to connect to interview service. Please try again.');
    }
  };

  /**
   * Start the interview session
   */
  const startInterview = useCallback(async (userId: string) => {
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }

    try {
      setError(null);
      setSessionStatus('connecting');

      console.log('🚀 Starting interview session...');

      // Start session logging (non-blocking)
      sessionLogger.startSession(interviewType, userId)
        .then((sessionRef) => {
          console.log('✅ Session logging started:', sessionRef);
          sessionLogger.logEvent('session_start', 'Interview session initialization started');
        })
        .catch((err) => {
          console.warn('⚠️ Session logging failed (continuing anyway):', err);
        });

      // Start connection health monitoring
      connectionHealth.startMonitoring();

      // Get session token from backend
      console.log('🔑 Getting session token...');
      const sessionToken = await getSessionToken();
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Session token obtained');
      }

      // Log token success (non-blocking)
      sessionLogger.logEvent('anam_token', 'Successfully obtained Anam session token')
        .catch(err => console.warn('Failed to log token event:', err));

      // Create anam client
      console.log('🤖 Creating Anam client...');
      const client = createClient(sessionToken);
      clientRef.current = client;

      // Add event listener for message history updates
      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages: any[]) => {
        console.log('MESSAGE_HISTORY_UPDATED received:', messages);
        messagesRef.current = messages;
        lastMessageTimeRef.current = Date.now();
        
        // Convert messages to chat history format
        const formattedMessages: ChatMessage[] = messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date()
        }));
        
        setChatHistory(formattedMessages);
        
        // Update activity and log conversation progress (non-blocking)
        sessionLogger.updateActivity().catch(err => console.warn('Failed to update activity:', err));
        sessionLogger.logEvent('message_update', `Received ${messages.length} messages in conversation`)
          .catch(err => console.warn('Failed to log message update:', err));
      });

      // Ensure video element is ready and start streaming
      console.log('📹 Starting video stream to element:', videoRef.current?.id);
      if (!videoRef.current) {
        throw new Error('Video element lost during initialization');
      }
      
      await client.streamToVideoElement('interview-video');
      console.log('✅ Video streaming started');

      setIsConnected(true);
      setIsStreaming(true);
      setSessionStatus('streaming');

      // Log streaming success (non-blocking)
      sessionLogger.logEvent('streaming_start', 'Video streaming started successfully')
        .catch(err => console.warn('Failed to log streaming start:', err));
      
      console.log('🎉 Interview session started successfully');
    } catch (err) {
      console.error('❌ Failed to start interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start interview';
      
      // Log error (non-blocking)
      sessionLogger.logError(`Failed to start interview: ${errorMessage}`)
        .catch(logErr => console.warn('Failed to log error:', logErr));
      
      setError(errorMessage);
      setSessionStatus('error');
      setIsConnected(false);
      setIsStreaming(false);
    }
  }, [videoRef, sessionLogger, connectionHealth, interviewType]);

  /**
   * Stop the interview session and get transcription
   */
  const stopInterview = useCallback(async (): Promise<string | null> => {
    try {
      let transcription = null;
      
      await sessionLogger.logEvent('stop_interview', 'Interview stop initiated');

      if (clientRef.current) {
        // Get transcription from stored messages (updated via MESSAGE_HISTORY_UPDATED event)
        try {
          console.log('Attempting to get transcription from stored messages...');
          console.log('Stored messages:', messagesRef.current);
          
            if (messagesRef.current && messagesRef.current.length > 0) {
              // Normalize roles and robustly extract text content from various message shapes
              const normalizeRole = (role: string) => {
                const r = (role || '').toLowerCase();
                if (['user', 'human', 'student'].includes(r)) return 'Student';
                return 'Interviewer';
              };

              const extractText = (msg: any): string => {
                const c = msg?.content;
                if (!c) return '';
                if (typeof c === 'string') return c;
                if (Array.isArray(c)) {
                  return c.map((item: any) => {
                    if (!item) return '';
                    if (typeof item === 'string') return item;
                    if (typeof item.text === 'string') return item.text;
                    if (typeof item.content === 'string') return item.content;
                    if (typeof item.value === 'string') return item.value;
                    return '';
                  }).filter(Boolean).join(' ');
                }
                if (typeof c === 'object') {
                  if (typeof c.text === 'string') return c.text;
                  if (typeof c.content === 'string') return c.content;
                  if (typeof c.value === 'string') return c.value;
                }
                return '';
              };

              const lines = messagesRef.current
                .map((msg: any) => {
                  const text = extractText(msg).trim();
                  if (!text) return null;
                  const speaker = normalizeRole(msg.role);
                  return `${speaker}: ${text}`;
                })
                .filter(Boolean) as string[];

              // Join lines and warn if we detected no student responses
              const hasStudent = lines.some((line: string) => line.startsWith('Student:'));
              transcription = lines.join('\n\n');
              if (!hasStudent) {
                console.warn('No student responses detected in messages; transcription may be incomplete.');
                await sessionLogger.logError('No student responses detected in transcription');
              }
              
              await sessionLogger.logEvent('transcription_generated', `Transcription built with ${lines.length} lines`, 'info', {
                total_lines: lines.length,
                has_student_responses: hasStudent,
                last_message_time: lastMessageTimeRef.current
              });
              
              console.log('Transcription built with', lines.length, 'lines');
            } else {
              console.log('No messages available in stored messages');
              await sessionLogger.logError('No messages available for transcription');
            }
        } catch (transcriptionError) {
          console.warn('Could not get transcription:', transcriptionError);
          await sessionLogger.logError(`Transcription error: ${transcriptionError}`);
        }
        
        await clientRef.current.stopStreaming();
        clientRef.current = null;
      }

      // Stop health monitoring
      connectionHealth.stopMonitoring();

      // End session logging
      await sessionLogger.endSession(transcription ? 'completed' : 'error');

      setIsConnected(false);
      setIsStreaming(false);
      setSessionStatus('idle');
      setError(null);
      setChatHistory([]);

      console.log('Interview session stopped, transcription:', transcription);
      return transcription;
    } catch (err) {
      console.error('Failed to stop interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop interview';
      await sessionLogger.logError(`Stop interview error: ${errorMessage}`);
      setError(errorMessage);
      return null;
    }
  }, [sessionLogger, connectionHealth]);

  // Monitor for potential timeouts or unresponsive sessions
  useEffect(() => {
    if (!isStreaming) return;

    const timeoutCheck = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
      const TIMEOUT_THRESHOLD = 120000; // 2 minutes of no activity

      if (timeSinceLastMessage > TIMEOUT_THRESHOLD) {
        console.warn('Session appears unresponsive - no messages for', timeSinceLastMessage / 1000, 'seconds');
        sessionLogger.logError(`Session timeout detected - no activity for ${Math.round(timeSinceLastMessage / 1000)} seconds`, {
          last_message_time: lastMessageTimeRef.current,
          current_time: Date.now(),
          connection_quality: connectionHealth.connectionQuality
        });
      }
    }, 30000); // Check every 30 seconds

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
   * No-op if there is no active client (e.g. before the interview starts).
   */
  const setMicMuted = useCallback((muted: boolean) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      if (muted) {
        client.muteInputAudio();
      } else {
        client.unmuteInputAudio();
      }
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
  };
};
