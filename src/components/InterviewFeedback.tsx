import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Brain, Activity, Globe, MessageSquare, Languages, FileText, Volume2, Target } from 'lucide-react';
import { AnnotatedTranscript } from './AnnotatedTranscript';

interface Annotation {
  quote: string;
  category: 'strength' | 'grammar' | 'fluency' | 'lexical';
  explanation: string;
  suggestion?: string;
  start?: number;
  end?: number;
}

interface FeedbackData {
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
    // Common feedback
    overall: string;
    band_assessment: string;
  };
  // New annotated transcript fields (optional)
  transcription?: string;
  annotations?: Annotation[];
  // Overall improvement feedback
  overall_improvement_feedback?: string;
}

interface InterviewFeedbackProps {
  feedback: FeedbackData;
  isLoading?: boolean;
  interviewType?: string;
  scoringSystem?: string;
}

const getBandColor = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'bg-emerald-500';
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

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

export const InterviewFeedback = ({ feedback, isLoading, interviewType = '11-plus', scoringSystem = '0-5' }: InterviewFeedbackProps) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Generating Your Feedback...</CardTitle>
          <CardDescription>Please wait while we analyze your interview performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isIELTS = interviewType === 'ielts';
  const maxScore = isIELTS ? 9 : (scoringSystem === '0-5' ? 20 : 5);
  const maxIndividualScore = isIELTS ? 9 : 5;

  const sections = isIELTS ? [
    {
      title: 'Fluency & Coherence',
      icon: MessageSquare,
      score: feedback.fluency_coherence_score || 0,
      feedback: feedback.detailed_feedback.fluency_coherence || '',
    },
    {
      title: 'Lexical Resource',
      icon: Languages,
      score: feedback.lexical_resource_score || 0,
      feedback: feedback.detailed_feedback.lexical_resource || '',
    },
    {
      title: 'Grammatical Range & Accuracy',
      icon: FileText,
      score: feedback.grammatical_range_score || 0,
      feedback: feedback.detailed_feedback.grammatical_range || '',
    },
    {
      title: 'Pronunciation',
      icon: Volume2,
      score: feedback.pronunciation_score || 0,
      feedback: feedback.detailed_feedback.pronunciation || '',
    },
  ] : [
    {
      title: 'Personal Insight & Expression',
      icon: BookOpen,
      score: feedback.personal_insight_score || 0,
      feedback: feedback.detailed_feedback.personal_insight || '',
    },
    {
      title: 'Reasoning & Intellectual Agility',
      icon: Brain,
      score: feedback.reasoning_score || 0,
      feedback: feedback.detailed_feedback.reasoning || '',
    },
    {
      title: 'Extracurricular Engagement',
      icon: Activity,
      score: feedback.extracurricular_score || 0,
      feedback: feedback.detailed_feedback.extracurricular || '',
    },
    {
      title: 'Current Awareness & Moral Reasoning',
      icon: Globe,
      score: feedback.current_awareness_score || 0,
      feedback: feedback.detailed_feedback.current_awareness || '',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Score */}
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

      {/* Section Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section, index) => {
          const IconComponent = section.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconComponent className="w-5 h-5" />
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

      {/* Annotated Transcript */}
      {feedback.transcription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Annotated Transcript</CardTitle>
            <CardDescription>Full transcript with highlighted strengths and areas to improve</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnotatedTranscript 
              transcript={feedback.transcription}
              annotations={feedback.annotations || []}
            />
          </CardContent>
        </Card>
      )}

      {/* Overall Improvement Feedback */}
      {feedback.overall_improvement_feedback && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Target className="w-5 h-5" />
              Your Action Plan for Improvement
            </CardTitle>
            <CardDescription>Specific steps to boost your performance in your next interview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {feedback.overall_improvement_feedback.split('\n').map((paragraph, index) => {
                if (paragraph.trim() === '') return null;
                return (
                  <p key={index} className="mb-3 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};