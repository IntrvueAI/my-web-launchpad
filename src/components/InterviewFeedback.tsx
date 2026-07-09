/**
 * InterviewFeedback Component
 * 
 * Main component for displaying comprehensive interview feedback including:
 * - Overall score with band assessment
 * - Section-specific scores and feedback  
 * - Collapsible annotated transcript
 * - Structured improvement feedback
 * 
 * This component is now built using modular sub-components for better
 * maintainability and reusability across different interview types.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Target, ChevronDown, Brain } from 'lucide-react';
import { useState } from 'react';

// Import our new modular components and utilities
import { AnnotatedTranscript } from './AnnotatedTranscript';
import { ScoreDisplay } from './feedback/ScoreDisplay';
import { SectionScores } from './feedback/SectionScores';
import { FeedbackCard } from './feedback/FeedbackCard';
import { FeedbackComponentProps } from '@/types/interview';
import { FEEDBACK_DEFAULTS, FEEDBACK_SECTIONS } from '@/constants/feedback';
import { parseFeedbackText } from '@/utils/interviewHelpers';

/**
 * Legacy interface support - keeping for backward compatibility
 * TODO: Migrate all usage to use FeedbackComponentProps from types/interview.ts
 */
interface InterviewFeedbackProps {
  feedback: {
    // 11+ scores
    personal_insight_score?: number;
    reasoning_score?: number;
    extracurricular_score?: number;
    current_awareness_score?: number;
    // IELTS scores
    fluency_coherence_score?: number;
    lexical_resource_score?: number;
    grammatical_range_score?: number;
    pronunciation_score?: number;
    // Logic puzzles scores
    pattern_recognition_score?: number;
    logical_deduction_score?: number;
    mathematical_logic_score?: number;
    clarity_of_thought_score?: number;
    // Common fields
    total_score: number;
    detailed_feedback: {
      // 11+ feedback
      personal_insight?: string;
      reasoning?: string;
      extracurricular?: string;
      current_awareness?: string;
      // IELTS feedback
      fluency_coherence?: string;
      lexical_resource?: string;
      grammatical_range?: string;
      pronunciation?: string;
      // Logic puzzles feedback
      pattern_recognition?: string;
      logical_deduction?: string;
      mathematical_logic?: string;
      clarity_of_thought?: string;
      // Common feedback
      overall: string;
      band_assessment: string;
    };
    // New annotated transcript fields (optional)
    transcription?: string;
    annotations?: Array<{
      quote: string;
      category: 'strength' | 'grammar' | 'fluency' | 'lexical';
      explanation: string;
      suggestion?: string;
      start?: number;
      end?: number;
    }>;
    // Overall improvement feedback
    overall_improvement_feedback?: string;
    // Per-question review (engine-driven interviews) — what was asked, answered, or skipped.
    questions_review?: Array<{
      index: number;
      topic: string;
      difficulty?: string;
      question: string;
      asked: boolean;
      skipped: boolean;
      outcome: string;
      band?: 'strong' | 'developing' | 'weak' | null;
      your_answer?: string;
      note?: string;
    }>;
  };
  isLoading?: boolean;
  interviewType?: string;
  scoringSystem?: string;
}

/**
 * Helper function to safely get band color based on score and interview type
 * Maintains backward compatibility with existing logic
 */
const getBandColor = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'bg-emerald-500';
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * Helper function to safely get band label based on score and interview type
 * Maintains backward compatibility with existing logic
 */
const getBandLabel = (score: number, maxScore: number, interviewType?: string) => {
  if (interviewType === 'ielts') {
    if (score >= 8.5) return 'Expert User (Band 9)';
    if (score >= 7.5) return 'Very Good User (Band 8)';
    if (score >= 6.5) return 'Good User (Band 7)';
    if (score >= 5.5) return 'Competent User (Band 6)';
    if (score >= 4.5) return 'Modest User (Band 5)';
    if (score >= 3.5) return 'Limited User (Band 4)';
    return 'Below Band 4';
  }
  
  // 11+ labels
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Outstanding';
  if (percentage >= 75) return 'Strong';
  if (percentage >= 60) return 'Good';
  if (percentage >= 40) return 'Developing';
  return 'Needs Support';
};

/**
 * Main InterviewFeedback component
 * Now using modular sub-components while maintaining identical functionality
 */
export const InterviewFeedback = ({ 
  feedback, 
  isLoading = false, 
  interviewType = FEEDBACK_DEFAULTS.INTERVIEW_TYPE, 
  scoringSystem = FEEDBACK_DEFAULTS.SCORING_SYSTEM 
}: InterviewFeedbackProps) => {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Loading state component
  if (isLoading) {
    return (
      <FeedbackCard
        title={FEEDBACK_DEFAULTS.LOADING_MESSAGE}
        description={FEEDBACK_DEFAULTS.LOADING_DESCRIPTION}
        className="w-full"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </FeedbackCard>
    );
  }

  // Calculate scoring parameters based on interview type
  const isIELTS = interviewType === 'ielts';
  const isLogicPuzzles = interviewType === 'logic-puzzles';
  const isMathsInterview = interviewType === 'maths-interview';
  const isVerbalInterview = interviewType === 'verbal-interview';
  const isCurrentAffairs = interviewType === 'current-affairs-interview';

  let maxScore, maxIndividualScore;
  if (isIELTS) {
    maxScore = 9;
    maxIndividualScore = 9;
  } else if (isLogicPuzzles || isMathsInterview || isVerbalInterview || isCurrentAffairs) {
    maxScore = 20;
    maxIndividualScore = 5;
  } else {
    maxScore = scoringSystem === '0-5' ? 20 : 5;
    maxIndividualScore = 5;
  }

  // Dynamic sections configuration based on interview type
  let sections;
  if (isIELTS) {
    sections = [
      {
        title: 'Fluency & Coherence',
        icon: 'MessageSquare',
        score: feedback.fluency_coherence_score || 0,
        feedback: feedback.detailed_feedback.fluency_coherence || '',
      },
      {
        title: 'Lexical Resource',
        icon: 'Languages', 
        score: feedback.lexical_resource_score || 0,
        feedback: feedback.detailed_feedback.lexical_resource || '',
      },
      {
        title: 'Grammatical Range & Accuracy',
        icon: 'FileText',
        score: feedback.grammatical_range_score || 0,
        feedback: feedback.detailed_feedback.grammatical_range || '',
      },
      {
        title: 'Pronunciation',
        icon: 'Volume2',
        score: feedback.pronunciation_score || 0,
        feedback: feedback.detailed_feedback.pronunciation || '',
      },
    ];
  } else if (isLogicPuzzles) {
    sections = [
      {
        title: 'Logic',
        icon: 'Brain',
        score: feedback.pattern_recognition_score || 0,
        feedback: feedback.detailed_feedback.pattern_recognition || '',
      },
      {
        title: 'Verbal Reasoning',
        icon: 'BookOpen',
        score: feedback.logical_deduction_score || 0,
        feedback: feedback.detailed_feedback.logical_deduction || '',
      },
      {
        title: 'Thinking Aloud & Adaptability',
        icon: 'MessageCircle',
        score: feedback.mathematical_logic_score || 0,
        feedback: feedback.detailed_feedback.mathematical_logic || '',
      },
      {
        title: 'Lateral Thinking',
        icon: 'TrendingUp',
        score: feedback.clarity_of_thought_score || 0,
        feedback: feedback.detailed_feedback.clarity_of_thought || '',
      },
    ];
  } else if (isMathsInterview) {
    // Maths mock interview reuses the logic score fields with maths titles
    sections = [
      {
        title: 'Number & Calculation',
        icon: 'Calculator',
        score: feedback.pattern_recognition_score || 0,
        feedback: feedback.detailed_feedback.pattern_recognition || '',
      },
      {
        title: 'Problem-Solving & Method',
        icon: 'Brain',
        score: feedback.logical_deduction_score || 0,
        feedback: feedback.detailed_feedback.logical_deduction || '',
      },
      {
        title: 'Mathematical Reasoning',
        icon: 'TrendingUp',
        score: feedback.mathematical_logic_score || 0,
        feedback: feedback.detailed_feedback.mathematical_logic || '',
      },
      {
        title: 'Clarity of Explanation',
        icon: 'MessageCircle',
        score: feedback.clarity_of_thought_score || 0,
        feedback: feedback.detailed_feedback.clarity_of_thought || '',
      },
    ];
  } else if (isVerbalInterview) {
    // Verbal reasoning interview reuses the logic score fields with verbal titles
    sections = [
      {
        title: 'Vocabulary & Word Knowledge',
        icon: 'BookOpen',
        score: feedback.pattern_recognition_score || 0,
        feedback: feedback.detailed_feedback.pattern_recognition || '',
      },
      {
        title: 'Verbal Reasoning & Deduction',
        icon: 'Brain',
        score: feedback.logical_deduction_score || 0,
        feedback: feedback.detailed_feedback.logical_deduction || '',
      },
      {
        title: 'Word Relationships & Patterns',
        icon: 'TrendingUp',
        score: feedback.mathematical_logic_score || 0,
        feedback: feedback.detailed_feedback.mathematical_logic || '',
      },
      {
        title: 'Clarity of Explanation',
        icon: 'MessageCircle',
        score: feedback.clarity_of_thought_score || 0,
        feedback: feedback.detailed_feedback.clarity_of_thought || '',
      },
    ];
  } else if (isCurrentAffairs) {
    // Current affairs interview reuses the logic score fields with discussion titles
    sections = [
      {
        title: 'World Awareness & Engagement',
        icon: 'Globe',
        score: feedback.pattern_recognition_score || 0,
        feedback: feedback.detailed_feedback.pattern_recognition || '',
      },
      {
        title: 'Forming & Defending a View',
        icon: 'Brain',
        score: feedback.logical_deduction_score || 0,
        feedback: feedback.detailed_feedback.logical_deduction || '',
      },
      {
        title: 'Considering Other Perspectives',
        icon: 'TrendingUp',
        score: feedback.mathematical_logic_score || 0,
        feedback: feedback.detailed_feedback.mathematical_logic || '',
      },
      {
        title: 'Moral Maturity & Clarity',
        icon: 'MessageCircle',
        score: feedback.clarity_of_thought_score || 0,
        feedback: feedback.detailed_feedback.clarity_of_thought || '',
      },
    ];
  } else {
    // Default 11+ sections
    sections = [
      {
        title: 'Personal Insight & Expression',
        icon: 'BookOpen',
        score: feedback.personal_insight_score || 0,
        feedback: feedback.detailed_feedback.personal_insight || '',
      },
      {
        title: 'Reasoning & Intellectual Agility',
        icon: 'Brain',
        score: feedback.reasoning_score || 0,
        feedback: feedback.detailed_feedback.reasoning || '',
      },
      {
        title: 'Extracurricular Engagement',
        icon: 'Activity',
        score: feedback.extracurricular_score || 0,
        feedback: feedback.detailed_feedback.extracurricular || '',
      },
      {
        title: 'Current Awareness & Moral Reasoning',
        icon: 'Globe',
        score: feedback.current_awareness_score || 0,
        feedback: feedback.detailed_feedback.current_awareness || '',
      },
    ];
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Section - Using legacy approach for now */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Interview Assessment</CardTitle>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-4xl font-bold text-primary">
              {isIELTS ? `${feedback.total_score}/9.0` : `${feedback.total_score}/${maxScore}`}
            </div>
            <Badge className={`${getBandColor(feedback.total_score, maxScore)} text-white`}>
              {getBandLabel(feedback.total_score, maxScore, interviewType)}
            </Badge>
          </div>
          <Progress 
            value={(feedback.total_score / maxScore) * 100} 
            className="w-full mt-4"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Band Assessment</h4>
              <p className="text-muted-foreground">{feedback.detailed_feedback.band_assessment}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Overall Feedback</h4>
              <p className="text-muted-foreground">{feedback.detailed_feedback.overall}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Scores - Using legacy approach but with modular icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section, index) => {
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {/* Note: Icon names stored as strings in legacy format */}
                  <span className="w-5 h-5">📊</span>
                  {section.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {section.score}/{maxIndividualScore}
                  </span>
                  <Progress value={(section.score / maxIndividualScore) * 100} className="flex-1" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {section.feedback}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-question review (engine-driven interviews) */}
      {Array.isArray(feedback.questions_review) && feedback.questions_review.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Questions</CardTitle>
            <CardDescription>
              Every question you were asked, what you said, and the ones you skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback.questions_review
              .slice()
              .sort((a, b) => a.index - b.index)
              .map((q) => {
                const outcomeMeta: Record<string, { label: string; cls: string }> = {
                  correct_method: { label: 'Correct, with method', cls: 'bg-emerald-500' },
                  correct_no_method: { label: 'Correct, method unclear', cls: 'bg-green-500' },
                  incorrect: { label: 'Not quite', cls: 'bg-red-500' },
                  stuck: { label: 'Got stuck', cls: 'bg-yellow-500' },
                  skipped: { label: 'Skipped', cls: 'bg-muted-foreground' },
                  incomplete: { label: 'Not finished', cls: 'bg-orange-400' },
                };
                const meta = q.skipped
                  ? outcomeMeta.skipped
                  : outcomeMeta[q.outcome] || { label: q.outcome, cls: 'bg-blue-500' };
                return (
                  <div
                    key={q.index}
                    className={`rounded-lg border p-3 ${q.skipped ? 'border-dashed opacity-80' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground">Q{q.index}.</span> {q.question}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {q.band && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {q.band}
                          </Badge>
                        )}
                        <Badge className={`${meta.cls} text-white`}>{meta.label}</Badge>
                      </div>
                    </div>
                    {!q.skipped && q.your_answer && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">You said:</span> {q.your_answer}
                      </p>
                    )}
                    {q.note && <p className="text-xs text-muted-foreground mt-1 italic">{q.note}</p>}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Annotated Transcript - Now using the enhanced component */}
      {feedback.transcription && (
        <Card>
          <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Annotated Transcript</CardTitle>
                    <CardDescription>
                      Full transcript with highlighted strengths and areas to improve
                    </CardDescription>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isTranscriptOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <AnnotatedTranscript 
                  transcript={feedback.transcription}
                  annotations={feedback.annotations || []}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Comprehensive Overall Feedback Summary - Enhanced with modular approach */}
      {feedback.overall_improvement_feedback && (
        <FeedbackCard
          title="Overall Feedback Summary & Action Plan"
          description="Comprehensive analysis of your performance with targeted improvement strategies"
          icon={Target}
          variant="highlight"
          className="shadow-lg"
        >
          {/* Parse and render the overall improvement feedback using utility function */}
          {(() => {
            const feedbackText = feedback.overall_improvement_feedback || '';
            const sections = feedbackText.split(/(?=\*\*(?:What went well|Even better if)\*\*)/);
            
            return sections.map((section, index) => {
              const trimmedSection = section.trim();
              if (!trimmedSection) return null;
              
              // Check if this is a "What went well" section
              if (trimmedSection.startsWith(FEEDBACK_SECTIONS.WHAT_WENT_WELL)) {
                const content = trimmedSection.replace(FEEDBACK_SECTIONS.WHAT_WENT_WELL, '').trim();
                return (
                  <div key={index} className="bg-white/[0.04] rounded-lg p-4 border border-emerald/25 mb-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-emerald">
                      <Brain className="w-4 h-4" />
                      What went well
                    </h4>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      {parseFeedbackText(content).map((paragraph, pIndex) => (
                        <p key={pIndex} className="mb-2 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              
              // Check if this is an "Even better if" section
              if (trimmedSection.startsWith(FEEDBACK_SECTIONS.EVEN_BETTER_IF)) {
                const content = trimmedSection.replace(FEEDBACK_SECTIONS.EVEN_BETTER_IF, '').trim();
                return (
                  <div key={index} className="bg-white/[0.04] rounded-lg p-4 border border-primary/25 mb-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                      <Target className="w-4 h-4" />
                      Even better if
                    </h4>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      {parseFeedbackText(content).map((paragraph, pIndex) => {
                        // Check if it's a bullet point or numbered item
                        const isBulletPoint = paragraph.trim().match(/^[•\-\*]\s/) || paragraph.trim().match(/^\d+\.\s/);
                        
                        return (
                          <div key={pIndex} className={`mb-2 leading-relaxed ${isBulletPoint ? 'ml-4' : ''}`}>
                            {isBulletPoint ? (
                              <div className="flex items-start gap-2">
                                <span className="text-primary font-semibold">→</span>
                                <span>{paragraph.replace(/^[•\-\*]\s/, '').replace(/^\d+\.\s/, '')}</span>
                              </div>
                            ) : (
                              <p>{paragraph}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              
              // For any other content (fallback or intro text)
              if (trimmedSection && !trimmedSection.startsWith('**')) {
                return (
                  <div key={index} className="bg-white/[0.04] rounded-lg p-4 border border-secondary/20 mb-4">
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      {parseFeedbackText(trimmedSection).map((paragraph, pIndex) => (
                        <p key={pIndex} className="mb-2 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              
              return null;
            }).filter(Boolean);
          })()}
          
          {/* Success Reminder */}
          <div className="bg-emerald/10 rounded-lg p-4 border border-emerald/25">
            <p className="text-sm text-emerald font-medium text-center">
              💡 Remember: Every interview is a learning opportunity. Focus on progress, not perfection!
            </p>
          </div>
        </FeedbackCard>
      )}
    </div>
  );
};