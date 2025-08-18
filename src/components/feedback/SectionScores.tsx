/**
 * SectionScores Component
 * 
 * Displays all section scores for an interview in a consistent grid layout.
 * Automatically renders the correct sections based on the interview type
 * configuration. Each section shows the score, progress, and detailed feedback.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { icons } from 'lucide-react';
import { InterviewType, FeedbackData, InterviewSection } from '@/types/interview';
import { getInterviewTypeConfig } from '@/config/interviewTypes';
import { formatScore, calculatePercentage } from '@/utils/interviewHelpers';

interface SectionScoresProps {
  /** The feedback data containing all scores and detailed feedback */
  feedback: FeedbackData;
  /** The interview type to determine which sections to display */
  interviewType: InterviewType;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Individual section score card component
 */
interface SectionCardProps {
  section: InterviewSection;
  score: number;
  maxScore: number;
  feedback: string;
  interviewType: InterviewType;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  score,
  maxScore,
  feedback,
  interviewType
}) => {
  // Get the icon component dynamically
  const IconComponent = icons[section.iconName as keyof typeof icons];
  const percentage = calculatePercentage(score, maxScore);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {IconComponent && <IconComponent className="w-5 h-5" />}
          {section.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">
            {formatScore(score, interviewType)}
          </span>
          <Progress value={percentage} className="flex-1" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {feedback || `No specific feedback available for ${section.title.toLowerCase()}.`}
        </p>
      </CardContent>
    </Card>
  );
};

/**
 * Main component that displays all section scores in a grid
 */
export const SectionScores: React.FC<SectionScoresProps> = ({
  feedback,
  interviewType,
  className = ''
}) => {
  const config = getInterviewTypeConfig(interviewType);
  
  // Filter sections that have scores available
  const sectionsWithScores = config.sections.filter(section => {
    const score = feedback[section.scoreField];
    return typeof score === 'number' && score >= 0;
  });
  
  if (sectionsWithScores.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">
          No section scores available for this interview.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {sectionsWithScores.map((section) => {
        const score = feedback[section.scoreField] || 0;
        const feedbackText = feedback.detailed_feedback[section.feedbackField as keyof typeof feedback.detailed_feedback] || '';
        
        return (
          <SectionCard
            key={section.id}
            section={section}
            score={score}
            maxScore={config.maxSectionScore}
            feedback={feedbackText}
            interviewType={interviewType}
          />
        );
      })}
    </div>
  );
};

export default SectionScores;