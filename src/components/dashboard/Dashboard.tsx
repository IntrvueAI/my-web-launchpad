import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import {
  Play,
  History as HistoryIcon,
  CheckCircle2,
  Calendar,
  Flame,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';

interface DashboardProps {
  onStartInterview: () => void;
  onViewHistory: () => void;
  onManageDates: () => void;
}

const MAX_TOTAL_SCORE = 20;
const MAX_SKILL_SCORE = 5;

const SKILL_ROWS: { key: 'personalInsight' | 'reasoning' | 'extracurricular' | 'currentAwareness'; label: string; colorClass: string }[] = [
  { key: 'personalInsight', label: 'Personal Insight & Expression', colorClass: 'bg-[#2E8AB8]' },
  { key: 'reasoning', label: 'Reasoning & Intellectual Agility', colorClass: 'bg-primary' },
  { key: 'extracurricular', label: 'Extracurricular Engagement', colorClass: 'bg-success' },
  { key: 'currentAwareness', label: 'Current Awareness & Moral Reasoning', colorClass: 'bg-[#724DB2]' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onStartInterview, onViewHistory, onManageDates }) => {
  const { user } = useAuth();
  const { stats, loading } = useDashboardStats();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const totalSessions = stats?.totalSessions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const trend = stats?.recentTrend ?? [];

  const milestone = totalSessions < 20 ? 20 : Math.ceil((totalSessions + 1) / 10) * 10;
  const completedPct = Math.min(100, (totalSessions / milestone) * 100);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const scoreRatio = MAX_TOTAL_SCORE > 0 ? Math.min(1, averageScore / MAX_TOTAL_SCORE) : 0;
  const dashOffset = circumference - scoreRatio * circumference;

  const lastTwo = trend.slice(-2);
  const trendDelta = lastTwo.length === 2 ? Math.round((lastTwo[1].score - lastTwo[0].score) * 10) / 10 : null;

  const validSkills = SKILL_ROWS.map((row) => ({ ...row, value: stats?.skills[row.key] ?? null })).filter(
    (row) => row.value !== null
  ) as (typeof SKILL_ROWS[number] & { value: number })[];
  const strongest = validSkills.length ? validSkills.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const weakest = validSkills.length ? validSkills.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  // Chart geometry for the "progress over time" sparkline
  const chartWidth = 460;
  const chartLeft = 10;
  const chartRight = 450;
  const chartTop = 20;
  const chartBottom = 150;
  const points = trend.map((t, i) => {
    const x = trend.length > 1 ? chartLeft + (i * (chartRight - chartLeft)) / (trend.length - 1) : (chartLeft + chartRight) / 2;
    const ratio = Math.min(1, Math.max(0, t.score / MAX_TOTAL_SCORE));
    const y = chartBottom - ratio * (chartBottom - chartTop);
    return { x, y };
  });
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `M${points[0].x},${chartBottom} ` +
        points.map((p) => `L${p.x},${p.y}`).join(' ') +
        ` L${points[points.length - 1].x},${chartBottom} Z`
      : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Hero greeting */}
      <div className="text-center py-2 pb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-accent text-primary-foreground/0 text-primary text-sm font-semibold mb-5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {loading
            ? 'Loading your progress…'
            : totalSessions > 0
            ? `${totalSessions} interview${totalSessions === 1 ? '' : 's'} completed so far — keep the momentum going`
            : "Let's get your first practice session started"}
        </div>
        <h1 className="text-3xl md:text-[42px] font-bold leading-tight tracking-tight text-foreground">
          Hello, {firstName} — <br />
          <span className="text-primary">ready for your next interview?</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Pick up where you left off, or jump into a fresh mock session with instant feedback from your digital interviewer.
        </p>
        <div className="mt-7 flex justify-center gap-3 flex-wrap">
          <Button size="lg" className="rounded-xl gap-2 shadow-md" onClick={onStartInterview}>
            <Play className="w-4 h-4" />
            Start Your Next Interview
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl gap-2" onClick={onViewHistory}>
            <HistoryIcon className="w-4 h-4" />
            View Past Sessions
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_0.85fr_1.3fr] gap-4">
        {/* Interviews completed */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="w-[26px] h-[26px] rounded-lg bg-winter-frost flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8AB8]" />
            </div>
            Interviews Completed
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-foreground">{totalSessions}</span>
            <span className="text-sm text-muted-foreground font-medium">sessions</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-winter-frost overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${completedPct}%`, background: 'linear-gradient(90deg, #2E8AB8, #85C2E0)' }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {totalSessions === 0
              ? 'Complete your first session to get started'
              : `${milestone - totalSessions} more to reach your milestone of ${milestone}`}
          </p>
        </Card>

        {/* Average score */}
        <Card className="p-6 flex items-center gap-5">
          <div className="relative w-[88px] h-[88px] flex-shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(var(--winter-frost))" strokeWidth="9" />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 44 44)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-foreground leading-none">{averageScore}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">/ {MAX_TOTAL_SCORE}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Average Score
            </div>
            {trendDelta !== null && (
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  trendDelta >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {trendDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {trendDelta >= 0 ? 'Up' : 'Down'} {Math.abs(trendDelta)} since last session
              </div>
            )}
            <div className="mt-2 text-sm text-muted-foreground leading-snug">
              {strongest && weakest && strongest.key !== weakest.key
                ? `Strongest in ${strongest.label}, room to grow in ${weakest.label}.`
                : 'Complete a few sessions to see your strengths emerge.'}
            </div>
          </div>
        </Card>

        {/* Interview dates — placeholder until scheduling data exists */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="w-[26px] h-[26px] rounded-lg bg-accent flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-primary" />
              </div>
              Your Interview Dates
            </div>
            <Badge variant="outline" className="text-[10px]">Preview</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mt-1.5">
            {[
              { mon: 'Jul', day: '02', school: 'Westfield Grammar', countdown: '13 days away', next: true },
              { mon: 'Jul', day: '11', school: 'Kingswood House', countdown: '22 days away', next: false },
              { mon: 'Jul', day: '19', school: "St. Augustine's", countdown: '30 days away', next: false },
            ].map((d) => (
              <div
                key={d.school}
                className={`flex flex-col items-center text-center px-2 py-3 rounded-md border ${
                  d.next ? 'bg-accent border-primary/20' : 'bg-background border-border'
                }`}
              >
                <span className={`text-[10.5px] font-bold uppercase tracking-wide ${d.next ? 'text-primary' : 'text-muted-foreground'}`}>
                  {d.mon}
                </span>
                <span className={`text-xl font-extrabold leading-tight ${d.next ? 'text-primary' : 'text-foreground'}`}>{d.day}</span>
                <span className="mt-2 font-bold text-[12.5px] text-foreground leading-tight">{d.school}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{d.countdown}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onManageDates}
            className="mt-4 text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline"
          >
            Add your real interview dates in Settings →
          </button>
        </Card>
      </div>

      {/* Streak tracker — placeholder until streak tracking exists */}
      <Card className="p-6 flex items-center justify-between gap-5 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-foreground">5-day practice streak</span>
              <Badge variant="outline" className="text-[10px]">Preview</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">Keep it going — practise today to extend your streak</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
            const done = i < 5;
            const today = i === 5;
            return (
              <div
                key={i}
                className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[11px] font-bold border ${
                  done
                    ? 'bg-primary text-primary-foreground border-primary'
                    : today
                    ? 'bg-card text-primary border-2 border-primary'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                {d}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Skill breakdown — real data */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <BarChart3 className="w-[18px] h-[18px]" />
              Skill Breakdown
            </div>
            <Badge variant="outline" className="text-[11px]">Avg. across sessions</Badge>
          </div>
          {validSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Complete a session to see your skill breakdown.</p>
          ) : (
            SKILL_ROWS.map((row) => {
              const value = stats?.skills[row.key] ?? null;
              const pct = value !== null ? (value / MAX_SKILL_SCORE) * 100 : 0;
              return (
                <div key={row.key} className="mb-4 last:mb-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[13.5px] font-semibold text-foreground">{row.label}</span>
                    <span className="text-[13px] font-bold text-muted-foreground">
                      {value !== null ? `${value}/${MAX_SKILL_SCORE}` : '—'}
                    </span>
                  </div>
                  <div className="h-[9px] rounded-full bg-background overflow-hidden">
                    <div className={`h-full rounded-full ${row.colorClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* Progress over time — real data */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <TrendingUp className="w-[18px] h-[18px]" />
              Progress Over Time
            </div>
            <Badge variant="outline" className="text-[11px]">Last {trend.length || 0} sessions</Badge>
          </div>
          {points.length < 2 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Complete a couple more sessions to start tracking your trend.
            </p>
          ) : (
            <>
              <svg width="100%" height="160" viewBox={`0 0 ${chartWidth} 160`} preserveAspectRatio="none">
                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="hsl(var(--border))" strokeWidth="1" />
                <line x1="0" y1="70" x2={chartWidth} y2="70" stroke="hsl(var(--border))" strokeWidth="1" />
                <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="hsl(var(--border))" strokeWidth="1" />
                <path d={areaPath} fill="hsl(var(--accent))" />
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === points.length - 1 ? 5.5 : 4.5}
                    fill={i === points.length - 1 ? 'hsl(var(--primary))' : '#fff'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={i === points.length - 1 ? 2 : 2.5}
                  />
                ))}
              </svg>
              <p className="mt-2.5 text-xs text-muted-foreground">
                Across your last {trend.length} sessions, scores have gone from {trend[0].score}/{MAX_TOTAL_SCORE} to{' '}
                {trend[trend.length - 1].score}/{MAX_TOTAL_SCORE}.
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Bottom row — placeholders until generated from real session feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <MessageSquare className="w-[18px] h-[18px]" />
              Quick Feedback
            </div>
            <Badge variant="outline" className="text-[11px]">Preview</Badge>
          </div>
          {[
            { good: true, label: 'Thoughtful, well-organised answers', desc: 'You structured your responses with a clear beginning, middle, and end.' },
            { good: true, label: 'Strong opening answer', desc: 'Your "tell me about yourself" response was well structured.' },
            { good: false, label: 'Pace was a little fast', desc: 'Try pausing briefly before answering tricky questions.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-border last:border-b-0 last:pb-0 first:pt-0">
              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 ${item.good ? 'bg-success/10' : 'bg-accent'}`}>
                <CheckCircle2 className={`w-[15px] h-[15px] ${item.good ? 'text-success' : 'text-primary'}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Lightbulb className="w-[18px] h-[18px]" />
              Tips for Your Next Interview
            </div>
            <Badge variant="outline" className="text-[11px]">Preview</Badge>
          </div>
          {[
            { label: 'Slow your pace on tricky questions', desc: 'Take a breath before answering — it reads as thoughtful, not unsure.' },
            { label: 'Practise explaining your favourite book', desc: 'This came up in 3 of your last 5 sessions — have one ready.' },
            { label: 'Bring one example to every answer', desc: 'Specific stories score higher than general statements.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-border last:border-b-0 last:pb-0 first:pt-0">
              <div className="w-[26px] h-[26px] rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
