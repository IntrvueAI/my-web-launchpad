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
import { Play, Square, Mic, MicOff } from 'lucide-react';
import { InterviewTimer } from './InterviewTimer';

/**
 * Main Interview Platform Component
 * Handles the complete 11+ interview preparation experience
 */
export const InterviewPlatform: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Custom hook to manage anam.ai interview session
  const {
    isConnected,
    isStreaming,
    error,
    chatHistory,
    startInterview,
    stopInterview,
    sessionStatus
  } = useInterviewSession(videoRef);

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
            11+ Interview Preparation
          </h1>
          <p className="interview-subtitle mb-2">
            Practice with our AI interviewer to build confidence
          </p>
          <p className="interview-instruction max-w-2xl mx-auto">
            Prepare for your 11+ school interview with realistic practice sessions. 
            Our AI interviewer will ask questions commonly used in entrance interviews 
            and provide instant feedback to help you improve.
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

                {/* Audio Controls */}
                <div className="flex justify-center">
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
            <h2 className="text-2xl font-bold text-center mb-8">Your Interview Feedback</h2>
            <InterviewFeedback 
              feedback={feedback} 
              isLoading={isGeneratingFeedback}
            />
          </div>
        )}

        {/* Interview Timer - Fixed Position */}
        <InterviewTimer 
          isActive={isStreaming}
          onTimeUp={() => {
            toast({
              title: "Time's Up!",
              description: "Your 30-minute interview session has ended.",
              variant: "destructive",
            });
          }}
        />
      </div>
    </div>
  );
};