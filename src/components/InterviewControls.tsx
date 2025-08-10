import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Play, Square, Loader2 } from 'lucide-react';
interface InterviewControlsProps {
  isStreaming: boolean;
  onStartInterview: () => Promise<void>;
  onStopInterview: () => Promise<void>;
  disabled?: boolean;
  highlightEnd?: boolean;
  endHint?: string;
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
  endHint = 'Interview seems complete. Tap "End Interview" to generate feedback.'
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

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
    <Card className="p-6">
      <h3 className="font-semibold text-primary mb-4">Interview Controls</h3>
      
      <div className="space-y-4">
        {!isStreaming ? (
          <Button
            onClick={handleStart}
            disabled={disabled || isLoading}
            className="w-full interview-button-start gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Interview
              </>
            )}
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                id="end-interview-button"
                disabled={isLoading}
                className={`w-full interview-button-stop gap-2 ${highlightEnd ? 'ring-2 ring-primary shadow-lg pulse' : ''}`}
                size="lg"
              >
                <Square className="w-5 h-5" />
                End Interview
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End interview?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to end the interview now? We will stop the call and start generating your feedback.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStop}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ending...
                    </>
                  ) : (
                    'End Interview'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        )}

        {isStreaming && highlightEnd && (
          <p className="text-xs text-muted-foreground text-center" aria-live="polite">
            {endHint}
          </p>
        )}

        {/* Interview Duration */}
        {isStreaming && (
          <div className="text-center">
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
          <div className="text-center space-y-2">
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