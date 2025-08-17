import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowLeft, Calendar, User, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackItem {
  id: string;
  subject: string | null;
  message: string;
  category: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackHistoryProps {
  onBack: () => void;
}

const FeedbackHistory: React.FC<FeedbackHistoryProps> = ({ onBack }) => {
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFeedbackHistory();
    }
  }, [user]);

  const fetchFeedbackHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching feedback history:', error);
      toast({
        title: "Error loading feedback history",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'reviewed': return 'secondary';
      case 'in_progress': return 'outline';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'bug_report': return 'Bug Report';
      case 'feature_request': return 'Feature Request';
      case 'general': return 'General';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'new': return 'New';
      case 'reviewed': return 'Reviewed';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your feedback history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Your Feedback History</h1>
          </div>
          <p className="text-muted-foreground">
            View all your submitted feedback and track their status.
          </p>
        </div>

        {feedbackHistory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feedback submitted yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven't submitted any feedback yet. We'd love to hear your thoughts!
              </p>
              <Button onClick={onBack}>
                Submit Your First Feedback
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbackHistory.map((feedback) => (
              <Card key={feedback.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {feedback.subject || `${getCategoryLabel(feedback.category)} Feedback`}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                        </span>
                        <Badge variant="outline">{getCategoryLabel(feedback.category)}</Badge>
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(feedback.status)}>
                      {formatStatus(feedback.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Your Message
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {feedback.message}
                      </p>
                    </div>
                    
                    {feedback.admin_response && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Admin Response
                        </h4>
                        <p className="text-sm bg-primary/5 border border-primary/20 p-3 rounded-md">
                          {feedback.admin_response}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Updated {formatDistanceToNow(new Date(feedback.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackHistory;