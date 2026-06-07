import { supabase } from '@/integrations/supabase/client';
import { FeedbackRecord } from '@/models/Feedback';

export interface ProgressSummary {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  recentTrend: { date: string; score: number }[];
}

export interface BugReportData {
  subject: string;
  category: string;
  description: string;
  stepsToReproduce?: string;
  currentUrl: string;
}

export const FeedbackService = {
  async getFeedback(feedbackId: string): Promise<FeedbackRecord> {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();
    if (error) throw error;
    return data as unknown as FeedbackRecord;
  },

  async getUserFeedbackHistory(userId: string, limit = 20, offset = 0): Promise<FeedbackRecord[]> {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []) as unknown as FeedbackRecord[];
  },

  async getProgressSummary(userId: string): Promise<ProgressSummary> {
    const { data, error } = await supabase
      .from('feedback')
      .select('total_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const records = data ?? [];
    const scores = records
      .map((r) => r.total_score as number | null)
      .filter((s): s is number => s != null);

    return {
      totalSessions: records.length,
      averageScore: scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
      recentTrend: records
        .slice(0, 10)
        .map((r) => ({ date: r.created_at as string, score: (r.total_score as number) ?? 0 }))
        .reverse(),
    };
  },

  async submitBugReport(data: BugReportData): Promise<void> {
    const { error } = await supabase.functions.invoke('send-bug-report', { body: data });
    if (error) throw error;
  },
};
