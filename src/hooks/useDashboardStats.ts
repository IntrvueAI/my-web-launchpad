import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackService } from '@/services/FeedbackService';
import { FeedbackRecord } from '@/types/interview';

export interface SkillAverages {
  personalInsight: number | null;
  reasoning: number | null;
  extracurricular: number | null;
  currentAwareness: number | null;
}

export interface DashboardStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  recentTrend: { date: string; score: number }[];
  skills: SkillAverages;
}

const average = (records: FeedbackRecord[], key: keyof FeedbackRecord): number | null => {
  const values = records
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number');
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
};

export const useDashboardStats = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      const [summary, history] = await Promise.all([
        FeedbackService.getProgressSummary(user!.id),
        FeedbackService.getUserFeedbackHistory(user!.id, 20),
      ]);

      return {
        ...summary,
        skills: {
          personalInsight: average(history, 'personal_insight_score'),
          reasoning: average(history, 'reasoning_score'),
          extracurricular: average(history, 'extracurricular_score'),
          currentAwareness: average(history, 'current_awareness_score'),
        },
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return {
    stats: query.data,
    loading: query.isLoading,
  };
};
