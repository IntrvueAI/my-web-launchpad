/**
 * ScoreDisplay Component
 * 
 * A reusable component for displaying scores with consistent formatting
 * across different interview types. Handles score formatting, progress bars,
 * and band labels automatically based on the interview type configuration.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InterviewType } from '@/types/interview';
import { 
  formatScore, 
  getBandLabel, 
  getBandColor, 
  calculatePercentage 
} from '@/utils/interviewHelpers';
import { getInterviewTypeConfig } from '@/config/interviewTypes';

interface ScoreDisplayProps {
  /** The actual score value */
  score: number;
  /** The interview type this score belongs to */
  interviewType: InterviewType;
  /** Whether this is a total score (vs section score) */
  isTotal?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the progress bar */
  showProgress?: boolean;
  /** Whether to show the band label */
  showBand?: boolean;
  /** Size variant for the display */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Displays a score with optional progress bar and band label
 * Automatically formats the score based on the interview type
 */
export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  interviewType,
  isTotal = false,
  className = '',
  showProgress = true,
  showBand = true,
  size = 'md'
}) => {
  const config = getInterviewTypeConfig(interviewType);
  const maxScore = isTotal ? config.maxTotalScore : config.maxSectionScore;
  const percentage = calculatePercentage(score, maxScore);
  const bandLabel = getBandLabel(score, interviewType);
  const bandColor = getBandColor(score, interviewType);
  
  // Size-based styling
  const sizeClasses = {
    sm: {
      score: 'text-lg font-semibold',
      badge: 'text-xs'
    },
    md: {
      score: 'text-2xl font-bold',
      badge: 'text-sm'
    },
    lg: {
      score: 'text-4xl font-bold',
      badge: 'text-base'
    }
  };
  
  const currentSizeClasses = sizeClasses[size];
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Score Value */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-primary ${currentSizeClasses.score}`}>
          {formatScore(score, interviewType, isTotal)}
        </span>
        
        {/* Band Label */}
        {showBand && (
          <Badge className={`${bandColor} text-white ${currentSizeClasses.badge}`}>
            {bandLabel}
          </Badge>
        )}
      </div>
      
      {/* Progress Bar */}
      {showProgress && (
        <Progress 
          value={percentage} 
          className="w-full"
          aria-label={`Score: ${percentage}%`}
        />
      )}
    </div>
  );
};

export default ScoreDisplay;