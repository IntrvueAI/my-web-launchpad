import React, { useState, useEffect, useRef } from 'react';
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
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60); // Reset to original duration when not active
      return;
    }

    const endsAt = Date.now() + duration * 60 * 1000;
    setTimeLeft(duration * 60);
    let finished = false;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (!remaining && !finished) {
        finished = true;
        clearInterval(interval);
        onTimeUpRef.current?.();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, duration]);

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
