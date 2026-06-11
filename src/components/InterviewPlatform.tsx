import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  
  // Attention cues for ending early
  const [highlightEnd, setHighlightEnd] = useState(false);
  const [attentionNudged, setAttentionNudged] = useState(false);
  const [endHintText, setEndHintText] = useState<string>('');
  const controlsContainerRef = useRef<HTMLDivElement>(null);
  
  // Use selected interview type or default to 11-plus
  const interviewType = selectedInterviewType || getDefaultInterviewType();
  
  // Custom hook to manage anam.ai interview session
  const {
    isConnected,
    isStreaming,
    error,
    chatHistory,
    sessionReference,
    connectionHealth,
    startInterview,
    stopInterview,
    sessionStatus,
    setMicMuted
  } = useInterviewSession(videoRef, interviewType);

  // Detect when interviewer wraps up and nudge user to end
  useEffect(() => {
    if (!isStreaming) {
      setHighlightEnd(false);
      setAttentionNudged(false);
      setEndHintText('');
      return;
    }

    const assistantMessages = chatHistory
      .filter(m => m.role === 'assistant')
      .map(m => (m.content || '').toLowerCase());
    const recent = assistantMessages.slice(-3);
    const combined = recent.join(' • ');

    const wrapUpPhrases = [
      "that's all for today",
      "that's all for now",
      'this concludes',
      'that concludes',
      'we are done',
      "we're done",
      'we have reached the end',
      'this ends the interview',
      'we will stop here',
      "we'll stop here",
      "let's end here",
      'let us end here',
      "let's wrap up",
      'to wrap up',
      'we will conclude',
      "we'll conclude",
      'this demo is complete',
      'the demo is complete',
      "that's the end of our demo",
      'thank you for your time today',
      'thanks for your time today',
    ];

    const primingPhrases = [
      'final question',
      'last question',
      'one last question',
      'final prompt',
      'final topic',
    ];

    const regexes: RegExp[] = [
      /thank(s| you)?[^.!?]{0,40}\b(time|today|chat|speaking|conversation)\b/i,
      /\b(time('?s)?\s*up|out of time|nearly out of time)\b/i,
      /\b(conclude|conclusion|wrap\s*up|end here|stop here)\b/i,
      /\b(this (?:ends|concludes) (?:the )?(?:interview|session|demo))\b/i,
    ];

    const matchedWrapUp = wrapUpPhrases.find(p => combined.includes(p));
    const matchedPriming = primingPhrases.find(p => combined.includes(p));
    const matchedRegex = regexes.find(r => r.test(combined));

    const shouldNudge = Boolean(matchedWrapUp || matchedRegex);
    const shouldPrime = Boolean(matchedPriming);

    if (shouldNudge) {
      if (!highlightEnd) setHighlightEnd(true);
      setEndHintText('Looks like the interviewer finished. Click "End Interview" to get feedback.');
      if (!attentionNudged) {
        setAttentionNudged(true);
        setTimeout(() => {
          controlsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById('end-interview-button')?.focus();
        }, 150);
        toast({
          title: 'Interview complete',
          description: 'Tap End Interview to finish and get your feedback.',
          duration: 8000,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                controlsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('end-interview-button')?.focus();
              }}
            >
              End now
            </Button>
          ),
        });
      }
      console.debug('[InterviewPlatform] wrap-up detected', { combined, matchedWrapUp, matchedRegex: matchedRegex?.toString() });
    } else if (shouldPrime && !highlightEnd) {
      setHighlightEnd(true);
      setEndHintText('Final question. When you finish, click "End Interview" to get feedback.');
      console.debug('[InterviewPlatform] final-question priming detected', { combined, matchedPriming });
    }
  }, [chatHistory, isStreaming, attentionNudged, highlightEnd, toast]);


  // Handle starting the interview session
  const handleStartInterview = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start an interview session.",
        variant: "destructive",
      });
      return;
    }

    try {
      await startInterview(user.id);
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  }, [startInterview, user, toast]);

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
            sessionId: sessionReference || Date.now().toString(),
            userId: user.id,
            interviewType: interviewType.id,
            interviewCategory: interviewType.category,
            scoringSystem: interviewType.scoringSystem,
            sessionReference: sessionReference, // Include session reference
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
          sessionReference: sessionReference, // Include session reference for regeneration
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

  // Toggle audio input (microphone) on the live Anam session
  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => {
      const next = !prev;
      setMicMuted(!next); // enabled => unmuted, disabled => muted
      return next;
    });
  }, [setMicMuted]);

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
              : 'Prepare for your interview with realistic practice sessions. Our AI interviewer will ask questions commonly used in entrance interviews and provide instant feedback to help you improve.'
            }
          </p>
        </div>

        {/* Main Interview Interface - Mobile First Layout */}
        <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
          
          {/* Video Interview Area */}
          <div className="lg:col-span-2">
            <Card className="p-4 md:p-6 shadow-medium">
              <div className="space-y-4">
                
                {/* Interview Status */}
                <InterviewStatus 
                  isConnected={isConnected}
                  isStreaming={isStreaming}
                  sessionStatus={sessionStatus}
                  error={error}
                />

                {/* Session Reference Display */}
                {sessionReference && (
                  <div className="text-xs text-muted-foreground text-center">
                    Session: <code className="bg-muted px-1 py-0.5 rounded text-xs">{sessionReference}</code>
                  </div>
                )}

                {/* Connection Health Indicator */}
                {isStreaming && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionHealth === 'good' ? 'bg-green-500' : 
                      connectionHealth === 'poor' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-muted-foreground">
                      Connection: {connectionHealth}
                    </span>
                  </div>
                )}
                
                {/* Video Element for AI Interviewer - Mobile Optimized Aspect Ratio */}
                <div className="relative bg-muted rounded-lg overflow-hidden aspect-video md:aspect-[16/10] lg:aspect-[16/9]">
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
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <Mic className="w-8 h-8 md:w-12 md:h-12 text-primary" />
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground font-medium px-4">
                          {isConnected ? 'Ready to start interview' : 'Connect to begin'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio Controls and Timer - Mobile Optimized */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAudio}
                    className="gap-2 w-full sm:w-auto min-h-[44px]"
                  >
                    {isAudioEnabled ? (
                      <>
                        <Mic className="w-4 h-4" />
                        <span className="text-sm">Microphone On</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span className="text-sm">Microphone Off</span>
                      </>
                    )}
                  </Button>
                  
                  <div className="w-full sm:w-auto">
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
              </div>
            </Card>

            {/* Interview Controls - Mobile Optimized */}
            <div className="mt-4 md:mt-6" ref={controlsContainerRef} id="interview-controls">
              <InterviewControls
                isStreaming={isStreaming}
                onStartInterview={handleStartInterview}
                onStopInterview={handleStopInterview}
                disabled={!!error}
                highlightEnd={highlightEnd}
              />
            </div>
          </div>

          {/* Chat History Panel - Collapsible on Mobile */}
          <div className="lg:block">
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