import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Brain, Activity, Globe } from 'lucide-react';

interface FeedbackData {
  personal_insight_score: number;
  reasoning_score: number;
  extracurricular_score: number;
  current_awareness_score: number;
  total_score: number;
  detailed_feedback: {
    personal_insight: string;
    reasoning: string;
    extracurricular: string;
    current_awareness: string;
    overall: string;
    band_assessment: string;
  };
}

interface InterviewFeedbackProps {
  feedback: FeedbackData;
  isLoading?: boolean;
}

const getBandColor = (score: number) => {
  if (score >= 18) return 'bg-emerald-500';
  if (score >= 15) return 'bg-green-500';
  if (score >= 12) return 'bg-blue-500';
  if (score >= 8) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getBandLabel = (score: number) => {
  if (score >= 18) return 'Outstanding';
  if (score >= 15) return 'Strong';
  if (score >= 12) return 'Sound';
  if (score >= 8) return 'Developing';
  return 'Needs Support';
};

export const InterviewFeedback = ({ feedback, isLoading }: InterviewFeedbackProps) => {
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

  const sections = [
    {
      title: 'Personal Insight & Expression',
      icon: BookOpen,
      score: feedback.personal_insight_score,
      feedback: feedback.detailed_feedback.personal_insight,
    },
    {
      title: 'Reasoning & Intellectual Agility',
      icon: Brain,
      score: feedback.reasoning_score,
      feedback: feedback.detailed_feedback.reasoning,
    },
    {
      title: 'Extracurricular Engagement',
      icon: Activity,
      score: feedback.extracurricular_score,
      feedback: feedback.detailed_feedback.extracurricular,
    },
    {
      title: 'Current Awareness & Moral Reasoning',
      icon: Globe,
      score: feedback.current_awareness_score,
      feedback: feedback.detailed_feedback.current_awareness,
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
              {feedback.total_score}/20
            </div>
            <Badge className={`${getBandColor(feedback.total_score)} text-white`}>
              {getBandLabel(feedback.total_score)}
            </Badge>
          </div>
          <Progress 
            value={(feedback.total_score / 20) * 100} 
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
                    {section.score}/5
                  </span>
                  <Progress value={(section.score / 5) * 100} className="flex-1" />
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
    </div>
  );
};