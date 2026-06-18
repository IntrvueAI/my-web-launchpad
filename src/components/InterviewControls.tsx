import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Play, Square, Loader2, SkipForward } from 'lucide-react';

/** A topic option for the engine-driven practice-mode switcher. */
export interface TopicOption {
  id: string;
  label: string;
}

interface InterviewControlsProps {
  isStreaming: boolean;
  onStartInterview: () => Promise<void>;
  onStopInterview: () => Promise<void>;
  disabled?: boolean;
  highlightEnd?: boolean;
  endHint?: string;
  /** Engine-driven only: show a Skip button that records the skip in the evidence log. */
  onSkipQuestion?: () => Promise<void>;
  /** Engine-driven practice mode only: offer mid-run topic switching. */
  topics?: TopicOption[];
  onSwitchTopic?: (topicId: string) => Promise<void>;
}

/**
 * Interview Controls Component
 * Provides start/stop controls for the interview session
 */
export const InterviewControls: React.FC<InterviewControlsProps> = ({
  isStreaming,
  onStartInterview,
  onStopInterview,
  disabled = false,
  highlightEnd = false,
  endHint = 'Interview seems complete. Tap "End Interview" to generate feedback.',
  onSkipQuestion,
  topics,
  onSwitchTopic,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSkipping, setIsSkipping] = React.useState(false);

  const handleSkip = async () => {
    if (!onSkipQuestion) return;
    setIsSkipping(true);
    try {
      await onSkipQuestion();
    } finally {
      setIsSkipping(false);
    }
  };

  // Handle start interview with loading state
  const handleStart = async () => {
    setIsLoading(true);
    try {
      await onStartInterview();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle stop interview with loading state  
  const handleStop = async () => {
    setIsLoading(true);
    try {
      await onStopInterview();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-semibold text-primary mb-4 text-sm md:text-base">Interview Controls</h3>
      
      <div className="space-y-4">
        {!isStreaming ? (
          <Button
            onClick={handleStart}
            disabled={disabled || isLoading}
            className="w-full interview-button-start gap-2 min-h-[48px] text-base font-medium"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start Interview</span>
              </>
            )}
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                id="end-interview-button"
                disabled={isLoading}
                className={`w-full interview-button-stop gap-2 min-h-[48px] text-base font-medium ${highlightEnd ? 'ring-2 ring-primary shadow-lg animate-pulse' : ''}`}
                size="lg"
              >
                <Square className="w-5 h-5" />
                <span>End Interview</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] md:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg">End interview?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed">
                  Are you sure you want to end the interview now? We will stop the call and start generating your feedback.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleStop}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Ending...</span>
                    </>
                  ) : (
                    <span>End Interview</span>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        )}

        {/* Engine-driven: skip the current question (recorded for the review). */}
        {isStreaming && onSkipQuestion && (
          <Button
            onClick={handleSkip}
            disabled={isSkipping}
            variant="outline"
            className="w-full gap-2 min-h-[44px]"
          >
            {isSkipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
            <span>Skip this question</span>
          </Button>
        )}

        {/* Engine-driven practice mode: switch topic mid-run. */}
        {isStreaming && topics && topics.length > 0 && onSwitchTopic && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Switch topic</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {topics.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => onSwitchTopic(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isStreaming && highlightEnd && (
          <p className="text-xs md:text-sm text-muted-foreground text-center px-2" aria-live="polite">
            {endHint}
          </p>
        )}

        {/* Interview Duration */}
        {isStreaming && (
          <div className="text-center px-2">
            <p className="text-sm text-muted-foreground">
              Interview in progress...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Take your time and speak naturally
            </p>
          </div>
        )}

        {/* Pre-interview Information */}
        {!isStreaming && (
          <div className="text-center space-y-2 px-2">
            <p className="text-sm text-muted-foreground">
              Click "Start Interview" when you're ready to begin
            </p>
            <p className="text-xs text-muted-foreground">
              The AI interviewer will introduce themselves and start with questions
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};