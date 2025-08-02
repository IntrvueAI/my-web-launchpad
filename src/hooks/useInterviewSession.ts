
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';
import { supabase } from '@/integrations/supabase/client';
import systemPromptText from '/system_prompt.md?raw';

// Types for the interview session
type SessionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error';

interface UseInterviewSessionReturn {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  sessionStatus: SessionStatus;
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
  
  // Ref to store the anam client instance
  const clientRef = useRef<any>(null);

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
            avatarId: "30fa96d0-26c4-4e55-94a0-517025942e18",
            voiceId: "6bfbe25a-979d-40f3-a92b-5394170af54b", 
            llmId: "0934d97d-0c3a-4f33-91b0-5e136a0ef466",
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
        // Get transcription before stopping - check what methods are available
        try {
          console.log('Attempting to get transcription...');
          console.log('Client object keys:', Object.keys(clientRef.current));
          console.log('Client object methods:', Object.getOwnPropertyNames(clientRef.current));
          
          // Check if client has a messages property or method
          if (clientRef.current.messages) {
            console.log('Found messages property:', clientRef.current.messages);
            transcription = clientRef.current.messages.map((msg: any) => {
              const speaker = msg.role === 'user' ? 'Student' : 'Interviewer';
              return `${speaker}: ${msg.content}`;
            }).join('\n\n');
          } else if (typeof clientRef.current.getMessages === 'function') {
            const messages = await clientRef.current.getMessages();
            console.log('Got messages from getMessages:', messages);
            if (messages && messages.length > 0) {
              transcription = messages.map((msg: any) => {
                const speaker = msg.role === 'user' ? 'Student' : 'Interviewer';
                return `${speaker}: ${msg.content}`;
              }).join('\n\n');
            }
          } else if (clientRef.current.messageHistoryClient) {
            console.log('messageHistoryClient found:', clientRef.current.messageHistoryClient);
            console.log('messageHistoryClient methods:', Object.getOwnPropertyNames(clientRef.current.messageHistoryClient));
            
            if (typeof clientRef.current.messageHistoryClient.getMessages === 'function') {
              const messages = await clientRef.current.messageHistoryClient.getMessages();
              console.log('Got messages from messageHistoryClient:', messages);
              if (messages && messages.length > 0) {
                transcription = messages.map((msg: any) => {
                  const speaker = msg.role === 'user' ? 'Student' : 'Interviewer';
                  return `${speaker}: ${msg.content}`;
                }).join('\n\n');
              }
            }
          } else {
            console.log('No message methods found on client');
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
    startInterview,
    stopInterview,
  };
};
