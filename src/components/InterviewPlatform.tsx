import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InterviewControls } from './InterviewControls';
import { InterviewStatus } from './InterviewStatus';
import { InterviewFeedback } from './InterviewFeedback';
import { ChatHistory } from './ChatHistory';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Mic, MicOff, RotateCcw } from 'lucide-react';
import { InterviewTimer } from './InterviewTimer';
import { InterviewType, getDefaultInterviewType } from '@/config/interviewTypes';

interface InterviewPlatformProps {
  selectedInterviewType?: InterviewType | null;
}

/**
 * Main Interview Platform Component
 * Handles the complete interview preparation experience
 */
export const InterviewPlatform: React.FC<InterviewPlatformProps> = ({ 
  selectedInterviewType 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use selected interview type or default to 11-plus
  const interviewType = selectedInterviewType || getDefaultInterviewType();
  
  // Custom hook to manage anam.ai interview session
  const {
    isConnected,
    isStreaming,
    error,
    chatHistory,
    startInterview,
    stopInterview,
    sessionStatus
  } = useInterviewSession(videoRef, interviewType);

  // Handle starting the interview session
  const handleStartInterview = useCallback(async () => {
    try {
      await startInterview();
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  }, [startInterview]);

  // Handle stopping the interview session and generate feedback
  const handleStopInterview = useCallback(async () => {
    try {
      setIsGeneratingFeedback(true);
      
      // Stop the interview and get transcription
      const transcription = await stopInterview();
      
      if (transcription && user) {
        // Generate feedback using the edge function
        const { data, error } = await supabase.functions.invoke('generate-interview-feedback', {
          body: {
            transcription: transcription,
            sessionId: Date.now().toString(), // Simple session ID
            userId: user.id,
            interviewType: interviewType.id,
            interviewCategory: interviewType.category,
            scoringSystem: interviewType.scoringSystem,
          },
        });

        if (error) {
          console.error('Failed to generate feedback:', error);
          toast({
            title: "Feedback Generation Failed",
            description: "We couldn't generate feedback for your interview. Please try again.",
            variant: "destructive",
          });
        } else {
          setFeedback(data);
          console.log('Feedback received:', { totalScore: (data as any)?.total_score, annotations: (data as any)?.annotations?.length, hasTranscript: Boolean((data as any)?.transcription) });
          toast({
            title: "Feedback Generated",
            description: "Your interview has been analyzed and feedback is ready!",
          });
        }
      } else if (!transcription) {
        toast({
          title: "No Transcription Available",
          description: "Unable to generate feedback without interview transcription.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to stop interview:', err);
      toast({
        title: "Interview Stop Failed",
        description: "There was an error stopping the interview.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [stopInterview, user, toast]);

  // Regenerate feedback from existing transcript
  const handleRegenerateFeedback = useCallback(async () => {
    try {
      const t = (feedback as any)?.transcription;
      if (!t || !user) {
        toast({
          title: 'Cannot Regenerate',
          description: 'Missing transcript or user session.',
          variant: 'destructive',
        });
        return;
      }
      setIsGeneratingFeedback(true);
      const { data, error } = await supabase.functions.invoke('generate-interview-feedback', {
        body: {
          transcription: t,
          sessionId: Date.now().toString(),
          userId: user.id,
          interviewType: interviewType.id,
          interviewCategory: interviewType.category,
          scoringSystem: interviewType.scoringSystem,
        },
      });
      if (error) {
        console.error('Failed to regenerate feedback:', error);
        toast({
          title: 'Regeneration Failed',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      } else {
        setFeedback(data);
        toast({
          title: 'Feedback Regenerated',
          description: 'We re-analyzed your interview and updated the feedback.',
        });
      }
    } catch (err) {
      console.error('Error during regeneration:', err);
      toast({ title: 'Error', description: 'Unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [feedback, user, interviewType, toast]);

  // Toggle audio input (microphone)
  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
    // TODO: Implement actual audio control via anam SDK
  }, []);

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="interview-title mb-3">
            {interviewType.name} Practice
          </h1>
          <p className="interview-subtitle mb-2">
            {interviewType.description}
          </p>
          <p className="interview-instruction max-w-2xl mx-auto">
            {interviewType.id === 'ielts' 
              ? 'Practice your IELTS Speaking test with our AI examiner. Get Band Score feedback (0-9) on all four assessment criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.'
              : 'Prepare for your 11+ school interview with realistic practice sessions. Our AI interviewer will ask questions commonly used in entrance interviews and provide instant feedback to help you improve.'
            }
          </p>
        </div>

        {/* Main Interview Interface */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Video Interview Area */}
          <div className="lg:col-span-2">
            <Card className="p-6 shadow-medium">
              <div className="space-y-4">
                
                {/* Interview Status */}
                <InterviewStatus 
                  isConnected={isConnected}
                  isStreaming={isStreaming}
                  sessionStatus={sessionStatus}
                  error={error}
                />
                
                {/* Video Element for AI Interviewer */}
                <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video
                    ref={videoRef}
                    id="interview-video"
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Video Overlay for Non-active States */}
                  {!isStreaming && (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <Mic className="w-12 h-12 text-primary" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                          {isConnected ? 'Ready to start interview' : 'Connect to begin'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio Controls and Timer */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAudio}
                    className="gap-2"
                  >
                    {isAudioEnabled ? (
                      <>
                        <Mic className="w-4 h-4" />
                        Microphone On
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4" />
                        Microphone Off
                      </>
                    )}
                  </Button>
                  
                  <InterviewTimer 
                    isActive={isStreaming}
                    duration={interviewType.duration}
                    onTimeUp={() => {
                      toast({
                        title: "Time's Up!",
                        description: `Your ${interviewType.duration}-minute interview session has ended.`,
                        variant: "destructive",
                      });
                      // Automatically stop the interview and generate feedback
                      handleStopInterview();
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Interview Controls - moved below video */}
            <div className="mt-6">
              <InterviewControls
                isStreaming={isStreaming}
                onStartInterview={handleStartInterview}
                onStopInterview={handleStopInterview}
                disabled={!!error}
              />
            </div>
          </div>

          {/* Chat History Panel */}
          <div>
            <ChatHistory 
              messages={chatHistory}
              isStreaming={isStreaming}
            />
          </div>
        </div>

        {/* Feedback Section */}
        {(feedback || isGeneratingFeedback) && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Interview Feedback</h2>
              <Button
                variant="secondary"
                onClick={handleRegenerateFeedback}
                disabled={isGeneratingFeedback || !feedback}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {isGeneratingFeedback ? 'Regenerating…' : 'Regenerate Feedback'}
              </Button>
            </div>
            <InterviewFeedback 
              feedback={feedback} 
              isLoading={isGeneratingFeedback}
              interviewType={interviewType.id}
              scoringSystem={interviewType.scoringSystem}
            />
          </div>
        )}
      </div>
    </div>
  );
};