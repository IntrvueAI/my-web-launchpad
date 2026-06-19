import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackService } from '@/services/FeedbackService';
import { FeedbackRecord } from '@/types/interview';

export interface SkillAverages {
  personalInsight: number | null;
  reasoning: number | null;
  extracurricular: number | null;
  currentAwareness: number | null;
}

export interface WeekStripDay {
  label: string;
  completed: boolean;
  isToday: boolean;
}

export interface UpcomingSchoolInterview {
  school: string;
  date: string;
  daysUntil: number;
}

export interface DashboardStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  recentTrend: { date: string; score: number }[];
  skills: SkillAverages;
  goodPoints: string[];
  tips: string[];
  hasLatestFeedback: boolean;
  streak: number;
  weekStrip: WeekStripDay[];
  daysUntilInterview: number | null;
  upcomingSchoolInterviews: UpcomingSchoolInterview[];
}

const HISTORY_LIMIT = 60;

const average = (records: FeedbackRecord[], key: keyof FeedbackRecord): number | null => {
  const values = records
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number');
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
};

// "What went well" / "Even better if" come from the same teacher-style action plan
// generated for every completed interview (see generate-interview-feedback).
const parseImprovementFeedback = (text?: string | null): { good: string[]; tips: string[] } => {
  if (!text) return { good: [], tips: [] };

  const toSentences = (s: string) =>
    s
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);

  const [goodPart, tipsPart] = text.split(/\*\*Even better if\*\*/i);
  const good = toSentences((goodPart || '').replace(/\*\*What went well\*\*/i, '')).slice(0, 3);
  const tips = toSentences(tipsPart || '').slice(0, 3);
  return { good, tips };
};

const dateKey = (d: Date | string) => new Date(d).toDateString();

const computeStreak = (createdAtDates: string[]): number => {
  const days = new Set(createdAtDates.map(dateKey));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const buildWeekStrip = (createdAtDates: string[]): WeekStripDay[] => {
  const days = new Set(createdAtDates.map(dateKey));
  const strip: WeekStripDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    strip.push({
      label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }),
      completed: days.has(dateKey(d)),
      isToday: i === 0,
    });
  }
  return strip;
};

const daysUntil = (dateStr: string): number => {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

interface RawSchoolInterview {
  school: string;
  interview_date: string | null;
}

// Prefer the new paired school+date rows; fall back to the old shared-date shape
// for profiles that haven't been re-saved since Settings switched to per-school dates.
const resolveSchoolInterviews = (
  pairedRows: RawSchoolInterview[] | null,
  legacySchools: string[] | null,
  legacyInterviewDate: string | null
): RawSchoolInterview[] => {
  if (pairedRows && pairedRows.length > 0) return pairedRows;
  if (legacySchools && legacySchools.length > 0) {
    return legacySchools.map((school) => ({ school, interview_date: legacyInterviewDate }));
  }
  return [];
};

const buildUpcomingSchoolInterviews = (rows: RawSchoolInterview[]): UpcomingSchoolInterview[] =>
  rows
    .filter((row): row is RawSchoolInterview & { interview_date: string } => !!row.interview_date)
    .map((row) => ({ school: row.school, date: row.interview_date, daysUntil: daysUntil(row.interview_date) }))
    .filter((row) => row.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

export const useDashboardStats = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      const [summary, history, profileResult] = await Promise.all([
        FeedbackService.getProgressSummary(user!.id),
        FeedbackService.getUserFeedbackHistory(user!.id, HISTORY_LIMIT),
        supabase
          .from('profiles')
          .select('school_interviews, schools, interview_date')
          .eq('id', user!.id)
          .maybeSingle(),
      ]);

      const latest = history[0];
      const { good, tips } = parseImprovementFeedback(latest?.overall_improvement_feedback);
      const createdAtDates = history.map((h) => h.created_at);

      const schoolInterviewRows = resolveSchoolInterviews(
        (profileResult.data?.school_interviews as RawSchoolInterview[] | null) ?? null,
        profileResult.data?.schools ?? null,
        profileResult.data?.interview_date ?? null
      );
      const upcomingSchoolInterviews = buildUpcomingSchoolInterviews(schoolInterviewRows);

      return {
        ...summary,
        skills: {
          personalInsight: average(history, 'personal_insight_score'),
          reasoning: average(history, 'reasoning_score'),
          extracurricular: average(history, 'extracurricular_score'),
          currentAwareness: average(history, 'current_awareness_score'),
        },
        goodPoints: good,
        tips,
        hasLatestFeedback: !!latest,
        streak: computeStreak(createdAtDates),
        weekStrip: buildWeekStrip(createdAtDates),
        daysUntilInterview: upcomingSchoolInterviews[0]?.daysUntil ?? null,
        upcomingSchoolInterviews,
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
