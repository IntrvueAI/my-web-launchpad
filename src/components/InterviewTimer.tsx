import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface InterviewTimerProps {
  isActive: boolean;
  duration: number; // duration in minutes
  onTimeUp?: () => void;
  calm?: boolean;
}

export const InterviewTimer: React.FC<InterviewTimerProps> = ({ 
  isActive, 
  duration,
  onTimeUp,
  calm = false
}) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // duration in seconds

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60); // Reset to original duration when not active
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp, duration]);

  // Don't render if not active
  if (!isActive) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft <= 300; // Last 5 minutes

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${calm ? 'med-calm-timer' : ''} ${
      isLowTime ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/50'
    }`}>
      <Clock className={`w-4 h-4 ${isLowTime ? 'text-destructive' : 'text-muted-foreground'}`} />
      <span className={`font-mono text-sm font-medium ${
        isLowTime ? 'text-destructive' : 'text-foreground'
      }`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
