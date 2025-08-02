
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';
import { AnamEvent } from "@anam-ai/js-sdk/dist/module/types";
import { supabase } from '@/integrations/supabase/client';
import systemPromptText from '/system_prompt.md?raw';

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
  startInterview: () => Promise<void>;
  stopInterview: () => Promise<string | null>;
}

/**
 * Custom hook to manage anam.ai interview session
 * Handles connection, streaming, and session management
 */
export const useInterviewSession = (
  videoRef: React.RefObject<HTMLVideoElement>
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

  /**
   * Get session token from secure Supabase Edge Function
   * API keys are stored securely in Supabase secrets
   */
  const getSessionToken = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-anam-session-token', {
        body: {
          personaConfig: {
            name: "Interview Assistant",
            // Using placeholder IDs - replace these with actual anam.ai persona IDs from your dashboard
            avatarId: "bb4f5306-ffdb-4437-a837-da6fdc23cbff",
            voiceId: "04965b9e-ff4c-4b54-a4dc-fba6e458c760", 
            brainType: "ANAM_GPT_4O_MINI_V1",
            maxSessionLengthSeconds: 1800,
            systemPrompt: systemPromptText
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
  const startInterview = useCallback(async () => {
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }

    try {
      setError(null);
      setSessionStatus('connecting');

      // Get session token from backend
      const sessionToken = await getSessionToken();

      // Create anam client
      const client = createClient(sessionToken);
      clientRef.current = client;

      // Add event listener for message history updates
      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages: any[]) => {
        console.log('MESSAGE_HISTORY_UPDATED received:', messages);
        messagesRef.current = messages;
        
        // Convert messages to chat history format
        const formattedMessages: ChatMessage[] = messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date()
        }));
        
        setChatHistory(formattedMessages);
      });

      // Start streaming to video element
      await client.streamToVideoElement('interview-video');

      setIsConnected(true);
      setIsStreaming(true);
      setSessionStatus('streaming');

      console.log('Interview session started successfully');
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setSessionStatus('error');
      setIsConnected(false);
      setIsStreaming(false);
    }
  }, [videoRef]);

  /**
   * Stop the interview session and get transcription
   */
  const stopInterview = useCallback(async (): Promise<string | null> => {
    try {
      let transcription = null;
      
      if (clientRef.current) {
        // Get transcription from stored messages (updated via MESSAGE_HISTORY_UPDATED event)
        try {
          console.log('Attempting to get transcription from stored messages...');
          console.log('Stored messages:', messagesRef.current);
          
          if (messagesRef.current && messagesRef.current.length > 0) {
            transcription = messagesRef.current.map((msg: any) => {
              const speaker = msg.role === 'user' ? 'Student' : 'Interviewer';
              return `${speaker}: ${msg.content}`;
            }).join('\n\n');
            console.log('Generated transcription:', transcription);
          } else {
            console.log('No messages available in stored messages');
          }
        } catch (transcriptionError) {
          console.warn('Could not get transcription:', transcriptionError);
        }
        
        await clientRef.current.stopStreaming();
        clientRef.current = null;
      }

      setIsConnected(false);
      setIsStreaming(false);
      setSessionStatus('idle');
      setError(null);
      setChatHistory([]);

      console.log('Interview session stopped, transcription:', transcription);
      return transcription;
    } catch (err) {
      console.error('Failed to stop interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop interview');
      return null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopStreaming().catch(console.error);
      }
    };
  }, []);

  return {
    isConnected,
    isStreaming,
    error,
    sessionStatus,
    chatHistory,
    startInterview,
    stopInterview,
  };
};
