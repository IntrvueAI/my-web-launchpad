import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { INTERVIEW_TYPES } from '@/config/interviewTypes';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { StatCard } from '@/pages/AdminMedicinePortal';

/** Derived, not hardcoded — so a new medicine interview type (e.g. a third school) is automatically
 *  included here the moment it's added to interviewTypes.ts, with nothing else to remember to sync. */
const MEDICINE_INTERVIEW_TYPE_IDS = Object.values(INTERVIEW_TYPES)
  .filter((t) => t.category === 'medicine')
  .map((t) => t.id);

interface MedicineSessionRow {
  id: string;
  interview_type: string;
  status: string;
  created_at: string;
}
interface MedicineFeedbackRow {
  interview_type: string;
  total_score: number | null;
  created_at: string;
}

/**
 * Real usage/outcome data — everything else in the portal is the static content pack; this is the
 * only thing backed by a live query, so it's the one place an admin can see whether the pack is
 * actually being used, not just how big it is.
 *
 * Its own file (not inline in AdminMedicinePortal.tsx) and lazy-loaded from there specifically so
 * recharts — a genuinely heavy dependency — only ever downloads when this tab is actually clicked,
 * not on every visit to the portal regardless of which tab someone lands on.
 */
export default function AnalyticsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['medicine-analytics', MEDICINE_INTERVIEW_TYPE_IDS],
    queryFn: async () => {
      const [sessionsRes, feedbackRes] = await Promise.all([
        supabase
          .from('interview_sessions')
          .select('id, interview_type, status, created_at')
          .in('interview_type', MEDICINE_INTERVIEW_TYPE_IDS)
          .order('created_at', { ascending: true }),
        supabase
          .from('feedback')
          .select('interview_type, total_score, created_at')
          .in('interview_type', MEDICINE_INTERVIEW_TYPE_IDS),
      ]);
      if (sessionsRes.error) throw sessionsRes.error;
      if (feedbackRes.error) throw feedbackRes.error;
      return {
        sessions: (sessionsRes.data ?? []) as MedicineSessionRow[],
        feedback: (feedbackRes.data ?? []) as MedicineFeedbackRow[],
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const { sessions, feedback } = data;
    const completed = sessions.filter((s) => s.status === 'completed');
    const scores = feedback.map((f) => f.total_score).filter((s): s is number => typeof s === 'number');
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const byType = new Map<string, { total: number; completed: number; scores: number[] }>();
    for (const id of MEDICINE_INTERVIEW_TYPE_IDS) byType.set(id, { total: 0, completed: 0, scores: [] });
    for (const s of sessions) {
      const row = byType.get(s.interview_type) ?? { total: 0, completed: 0, scores: [] };
      row.total += 1;
      if (s.status === 'completed') row.completed += 1;
      byType.set(s.interview_type, row);
    }
    for (const f of feedback) {
      if (typeof f.total_score !== 'number') continue;
      const row = byType.get(f.interview_type);
      row?.scores.push(f.total_score);
    }

    // Sessions per day, last 30 days — a simple, honest usage trend (no smoothing/projection).
    const days: { date: string; sessions: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      const count = sessions.filter((s) => s.created_at.slice(0, 10) === key).length;
      days.push({ date: key.slice(5), sessions: count });
    }

    return {
      total: sessions.length,
      completed: completed.length,
      completionRate: sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0,
      avgScore,
      byType,
      days,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }
  if (error || !stats) {
    return <Card className="p-4 text-sm text-destructive">Failed to load analytics: {(error as Error)?.message ?? 'unknown error'}</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Total sessions" value={stats.total} sub="all medicine interview types, all-time" />
        <StatCard label="Completion rate" value={`${stats.completionRate}%`} sub={`${stats.completed} of ${stats.total} completed`} />
        <StatCard label="Average score" value={stats.avgScore !== null ? stats.avgScore.toFixed(1) : '—'} sub={stats.avgScore !== null ? 'across all scored sessions' : 'no scored sessions yet'} />
        <StatCard label="Interview types live" value={MEDICINE_INTERVIEW_TYPE_IDS.length} sub={MEDICINE_INTERVIEW_TYPE_IDS.join(', ')} />
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Sessions per day (last 30 days)</h3>
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No sessions yet — this fills in once real students start interviews.</p>
        ) : (
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={stats.days}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6 }}
                  labelFormatter={(d) => `Date: ${d}`}
                />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">By interview type</h3>
        <div className="space-y-2">
          {MEDICINE_INTERVIEW_TYPE_IDS.map((id) => {
            const row = stats.byType.get(id);
            if (!row) return null;
            const avg = row.scores.length ? (row.scores.reduce((a, b) => a + b, 0) / row.scores.length).toFixed(1) : '—';
            const rate = row.total ? Math.round((row.completed / row.total) * 100) : 0;
            return (
              <div key={id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <span className="font-medium">{INTERVIEW_TYPES[id]?.name ?? id}</span>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{row.total} sessions</span>
                  <span>{rate}% completed</span>
                  <span>avg score {avg}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          "Pass rate" isn't shown as a single number — Medicine has no defined pass/fail threshold (scoring is four
          domains out of 5, not a cutoff) — average score per type is the honest proxy until a threshold is agreed.
        </p>
      </Card>
    </div>
  );
}
