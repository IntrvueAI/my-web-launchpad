import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InterviewFeedback } from './InterviewFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, ChevronRight } from 'lucide-react';

interface FeedbackRecord {
  id: string;
  created_at: string;
  total_score: number;
  personal_insight_score: number;
  reasoning_score: number;
  extracurricular_score: number;
  current_awareness_score: number;
  detailed_feedback: any;
  interview_session_id: string;
}

export const FeedbackHistory: React.FC = () => {
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackRecord[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchFeedbackHistory();
    }
  }, [user]);

  const fetchFeedbackHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackHistory(data || []);
    } catch (error) {
      console.error('Error fetching feedback history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBandLabel = (score: number) => {
    if (score >= 18) return 'Outstanding';
    if (score >= 15) return 'Strong';
    if (score >= 12) return 'Sound';
    if (score >= 8) return 'Developing';
    return 'Needs Support';
  };

  const getBandColor = (score: number) => {
    if (score >= 18) return 'bg-emerald-500';
    if (score >= 15) return 'bg-green-500';
    if (score >= 12) return 'bg-blue-500';
    if (score >= 8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (selectedFeedback) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedFeedback(null)}
          >
            ← Back to History
          </Button>
          <h2 className="text-xl font-semibold">
            Interview from {new Date(selectedFeedback.created_at).toLocaleDateString()}
          </h2>
        </div>
        
        <InterviewFeedback 
          feedback={{
            personal_insight_score: selectedFeedback.personal_insight_score,
            reasoning_score: selectedFeedback.reasoning_score,
            extracurricular_score: selectedFeedback.extracurricular_score,
            current_awareness_score: selectedFeedback.current_awareness_score,
            total_score: selectedFeedback.total_score,
            detailed_feedback: selectedFeedback.detailed_feedback
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Feedback History</h2>
        <p className="text-muted-foreground">
          Review your past interview performances and track your progress.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      ) : feedbackHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
            <p className="text-muted-foreground">
              Complete an interview to see your feedback and track your progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedbackHistory.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Interview Session
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      {new Date(feedback.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {feedback.total_score}/20
                      </div>
                      <Badge className={`${getBandColor(feedback.total_score)} text-white text-xs`}>
                        {getBandLabel(feedback.total_score)}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-primary">{feedback.personal_insight_score}/5</div>
                    <div className="text-muted-foreground">Personal</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-primary">{feedback.reasoning_score}/5</div>
                    <div className="text-muted-foreground">Reasoning</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-primary">{feedback.extracurricular_score}/5</div>
                    <div className="text-muted-foreground">Activities</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-primary">{feedback.current_awareness_score}/5</div>
                    <div className="text-muted-foreground">Awareness</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};