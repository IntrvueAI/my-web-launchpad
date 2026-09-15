import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackService } from '@/services/FeedbackService';
import { FeedbackRecord } from '@/types/interview';

// Exported so every Medicine dashboard view filters/labels feedback records identically instead
// of re-declaring its own copy (MedicineFeedback.tsx used to keep a second, easy-to-drift copy).
export const MEDICINE_TYPES = ['medicine-mmi', 'medicine-mmi-manchester'];

export const titleFor = (r: FeedbackRecord): string =>
  r.interview_type === 'medicine-mmi-manchester' ? 'Manchester circuit' : 'Leeds circuit';

// Medicine feedback is scored and stored under the same 4 DB columns the maths/logic subjects use
// (see supabase/functions/generate-interview-feedback/index.ts's ENGINE_PACKS + `isElevenPlus`
// branch) — the numbers are real and scored specifically against Medicine's own rubric, but the
// column names are generic. Label them with Medicine's actual domain names instead
// (src/interview/subjects/medicine/pack.ts `domains`), not the misleading column names.
export const MEDICINE_SKILL_COLUMNS = [
  { key: 'pattern_recognition_score', label: 'Content & Reasoning' },
  { key: 'logical_deduction_score', label: 'Communication & Delivery' },
  { key: 'mathematical_logic_score', label: 'Empathy & Professional Judgement' },
  { key: 'clarity_of_thought_score', label: 'Insight & Reflection' },
] as const;

export interface MedicineSkillAverage {
  label: string;
  average: number | null;
}

export interface MedicineDashboardStats {
  totalSessions: number;
  averageScore: number | null;
  scoreDeltaLastMonth: number | null;
  recentTrend: { date: string; score: number | null }[];
  recentSessions: { id: string; date: string; title: string; band: number | null }[];
  skills: MedicineSkillAverage[];
  streak: number;
  weekStrip: boolean[];
  byStationType: { type: string; count: number; averageScore: number | null }[];
  // Full Medicine-filtered history behind the above, for views (Feedback tab) that need per-record
  // detail rather than aggregates — kept on the same react-query cache entry so switching tabs
  // doesn't re-fetch.
  records: FeedbackRecord[];
}

const dateKey = (d: Date | string) => new Date(d).toDateString();

const average = (records: FeedbackRecord[], key: keyof FeedbackRecord): number | null => {
  const values = records.map((r) => r[key]).filter((v): v is number => typeof v === 'number');
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
};

const computeStreak = (createdAtDates: string[]): number => {
  const days = new Set(createdAtDates.map(dateKey));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const buildWeekStrip = (createdAtDates: string[]): boolean[] => {
  const days = new Set(createdAtDates.map(dateKey));
  const strip: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    strip.push(days.has(dateKey(d)));
  }
  return strip;
};

export const useMedicineDashboardStats = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['medicine-dashboard-stats', user?.id],
    queryFn: async (): Promise<MedicineDashboardStats> => {
      const history = await FeedbackService.getUserFeedbackHistory(user!.id, 200);
      const medicineHistory = history.filter((r) => MEDICINE_TYPES.includes(r.interview_type ?? ''));

      const scores = medicineHistory.map((r) => r.total_score).filter((s): s is number => typeof s === 'number');
      const averageScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      const recentScores = medicineHistory
        .filter((r) => new Date(r.created_at) >= oneMonthAgo)
        .map((r) => r.total_score)
        .filter((s): s is number => typeof s === 'number');
      const olderScores = medicineHistory
        .filter((r) => new Date(r.created_at) < oneMonthAgo)
        .map((r) => r.total_score)
        .filter((s): s is number => typeof s === 'number');
      // Recent (last 30 days) vs. older — NOT all-time average vs. older, which would dilute the
      // delta with the same old sessions already counted in olderAvg.
      const recentAvg = recentScores.length ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : null;
      const olderAvg = olderScores.length ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : null;
      const scoreDeltaLastMonth = recentAvg !== null && olderAvg !== null
        ? Math.round((recentAvg - olderAvg) * 10) / 10
        : null;

      const createdAtDates = medicineHistory.map((h) => h.created_at);

      const byStationTypeMap = new Map<string, { count: number; scores: number[] }>();
      for (const r of medicineHistory) {
        const type = titleFor(r);
        const row = byStationTypeMap.get(type) ?? { count: 0, scores: [] };
        row.count += 1;
        if (typeof r.total_score === 'number') row.scores.push(r.total_score);
        byStationTypeMap.set(type, row);
      }
      const byStationType = Array.from(byStationTypeMap.entries()).map(([type, row]) => ({
        type,
        count: row.count,
        averageScore: row.scores.length ? Math.round((row.scores.reduce((a, b) => a + b, 0) / row.scores.length) * 10) / 10 : null,
      }));

      return {
        totalSessions: medicineHistory.length,
        averageScore,
        scoreDeltaLastMonth,
        recentTrend: medicineHistory.slice(0, 12).map((r) => ({ date: r.created_at, score: r.total_score ?? null })).reverse(),
        recentSessions: medicineHistory.slice(0, 5).map((r) => ({
          id: r.id,
          date: r.created_at,
          title: titleFor(r),
          band: r.total_score ?? null,
        })),
        skills: MEDICINE_SKILL_COLUMNS.map(({ key, label }) => ({ label, average: average(medicineHistory, key) })),
        streak: computeStreak(createdAtDates),
        weekStrip: buildWeekStrip(createdAtDates),
        byStationType,
        records: medicineHistory,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return { stats: query.data, loading: query.isLoading };
};
