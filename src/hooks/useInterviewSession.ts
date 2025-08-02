import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@anam-ai/js-sdk';
import { supabase } from '@/integrations/supabase/client';

// Types for the interview session
type SessionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error';

interface UseInterviewSessionReturn {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  sessionStatus: SessionStatus;
  startInterview: () => Promise<void>;
  stopInterview: () => Promise<void>;
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
            systemPrompt: `You are a professional interview assistant specializing in 11+ school entrance interviews in the UK. 
            
            Your role is to:
            - Conduct realistic practice interviews for 11+ school admissions
            - Ask age-appropriate questions that UK independent schools commonly use
            - Create a supportive but formal interview environment
            - Focus on academic interests, hobbies, and general knowledge
            - Encourage thoughtful responses and critical thinking
            
            Interview style:
            - Be warm but professional
            - Ask follow-up questions to encourage deeper thinking
            - Cover topics like: favorite subjects, reading habits, problem-solving, current events (age-appropriate), aspirations
            - Keep questions engaging but appropriate for 10-11 year olds
            - Provide gentle encouragement
            
            Sample questions you might ask:
            - "Tell me about your favorite subject at school and why you enjoy it"
            - "What book have you read recently? What did you think of it?"
            - "If you could learn about anything in the world, what would it be?"
            - "Describe a time when you solved a difficult problem"
            - "What do you think makes a good friend?"
            
            Begin by introducing yourself and making the student feel comfortable, then proceed with interview questions.`
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
   * Stop the interview session
   */
  const stopInterview = useCallback(async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.stopStreaming();
        clientRef.current = null;
      }

      setIsConnected(false);
      setIsStreaming(false);
      setSessionStatus('idle');
      setError(null);

      console.log('Interview session stopped');
    } catch (err) {
      console.error('Failed to stop interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop interview');
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