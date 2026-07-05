import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Pip } from '@/components/brand/Pip';
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
  { key: 'personalInsight', label: 'Personal Insight & Expression', colorClass: 'bg-gold' },
  { key: 'reasoning', label: 'Reasoning & Intellectual Agility', colorClass: 'bg-teal' },
  { key: 'extracurricular', label: 'Extracurricular Engagement', colorClass: 'bg-primary' },
  { key: 'currentAwareness', label: 'Current Awareness & Moral Reasoning', colorClass: 'bg-ink' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onStartInterview, onViewHistory, onManageDates }) => {
  const { user } = useAuth();
  const { stats } = useDashboardStats();

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

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const daysUntilInterview = stats?.daysUntilInterview ?? null;
  const eyebrowText =
    daysUntilInterview === null
      ? null
      : daysUntilInterview === 0
      ? "Your interview is today — you've got this"
      : daysUntilInterview === 1
      ? 'Just 1 day until your next interview'
      : `${daysUntilInterview} days until your next interview`;

  const goodPoints = stats?.goodPoints ?? [];
  const tips = stats?.tips ?? [];
  const hasLatestFeedback = stats?.hasLatestFeedback ?? false;
  const streak = stats?.streak ?? 0;
  const weekStrip = stats?.weekStrip ?? [];
  const upcomingSchoolInterviews = stats?.upcomingSchoolInterviews ?? [];
  const nextInterview = upcomingSchoolInterviews[0] ?? null;
  // Rough fill toward the interview (assumes a ~60-day prep window).
  const countdownPct = nextInterview
    ? Math.max(6, Math.min(100, Math.round((1 - nextInterview.daysUntil / 60) * 100)))
    : 0;

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
      {/* Hero greeting — Pip + serif welcome + interview-day countdown (ref mock 1a) */}
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 py-4 pb-6">
        <Pip size={112} className="hidden sm:block" />
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-gold mb-2.5">Pip says hello</div>
          <h1 className="font-serif text-4xl md:text-[44px] font-semibold leading-[1.15] text-foreground">
            Good {partOfDay}, {firstName}.
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground max-w-xl mx-auto md:mx-0">
            {nextInterview ? (
              <>Your <strong className="text-foreground">{nextInterview.school}</strong> interview is in{' '}
                <strong className="text-foreground">{nextInterview.daysUntil} {nextInterview.daysUntil === 1 ? 'day' : 'days'}</strong>.
                {' '}One short practice today keeps you on track.</>
            ) : (
              <>One short practice a day keeps your thinking sharp — shall we warm up your thinking-aloud?</>
            )}
          </p>
          <div className="mt-6 flex gap-3 flex-wrap justify-center md:justify-start">
            <Button size="lg" className="rounded-full gap-2 shadow-md" onClick={onStartInterview}>
              <Play className="w-4 h-4" />
              Start today&rsquo;s practice
            </Button>
            <Button size="lg" variant="outline" className="rounded-full gap-2" onClick={onViewHistory}>
              <HistoryIcon className="w-4 h-4" />
              Review last session
            </Button>
          </div>
        </div>
        {nextInterview && (
          <div className="w-full md:w-[230px] shrink-0 rounded-2xl bg-ink text-cream p-6">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-cream/60">Interview day</div>
            <div className="font-serif text-[40px] font-semibold mt-2 leading-none text-cream">
              {nextInterview.daysUntil}
              <span className="text-base font-sans font-medium text-cream/60"> {nextInterview.daysUntil === 1 ? 'day' : 'days'} to go</span>
            </div>
            <div className="mt-3.5 h-1.5 rounded-full bg-cream/15 overflow-hidden">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${countdownPct}%` }} />
            </div>
            <div className="mt-2.5 text-[12.5px] text-cream/60">
              {nextInterview.school} · {new Date(`${nextInterview.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_0.85fr_1.3fr] gap-4">
        {/* Interviews completed */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="w-[26px] h-[26px] rounded-lg bg-muted flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
            </div>
            Interviews Completed
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-foreground">{totalSessions}</span>
            <span className="text-sm text-muted-foreground font-medium">sessions</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${completedPct}%`, background: 'hsl(var(--teal))' }}
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
              <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
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

        {/* Interview dates — real, from each school's paired date in Settings */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="w-[26px] h-[26px] rounded-lg bg-accent flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-primary" />
              </div>
              Your Interview Dates
            </div>
          </div>
          {upcomingSchoolInterviews.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                You haven't added your interview dates yet — go to Settings to add them.
              </p>
              <button
                onClick={onManageDates}
                className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline"
              >
                Go to Settings →
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5 mt-1.5">
                {upcomingSchoolInterviews.slice(0, 3).map((d, i) => {
                  const dateObj = new Date(`${d.date}T00:00:00`);
                  const mon = dateObj.toLocaleDateString('en-GB', { month: 'short' });
                  const day = dateObj.toLocaleDateString('en-GB', { day: '2-digit' });
                  const next = i === 0;
                  return (
                    <div
                      key={`${d.school}-${d.date}`}
                      className={`flex flex-col items-center text-center px-2 py-3 rounded-md border ${
                        next ? 'bg-accent border-primary/20' : 'bg-background border-border'
                      }`}
                    >
                      <span className={`text-[10.5px] font-bold uppercase tracking-wide ${next ? 'text-primary' : 'text-muted-foreground'}`}>
                        {mon}
                      </span>
                      <span className={`text-xl font-extrabold leading-tight ${next ? 'text-primary' : 'text-foreground'}`}>{day}</span>
                      <span className="mt-2 font-bold text-[12.5px] text-foreground leading-tight">{d.school}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {d.daysUntil === 0 ? 'Today' : d.daysUntil === 1 ? '1 day away' : `${d.daysUntil} days away`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={onManageDates}
                className="mt-4 text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline"
              >
                Manage your interview dates in Settings →
              </button>
            </>
          )}
        </Card>
      </div>

      {/* Streak tracker — real, computed from completed-interview dates */}
      <Card className="p-6 flex items-center justify-between gap-5 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground">
              {streak > 0 ? `${streak}-day practice streak` : 'No active streak yet'}
            </span>
            <div className="text-sm text-muted-foreground mt-0.5">
              {streak > 0
                ? 'Keep it going — practise today to extend your streak'
                : 'Complete an interview today to start a streak'}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {weekStrip.map((day, i) => (
            <div
              key={i}
              className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[11px] font-bold border ${
                day.completed
                  ? 'bg-primary text-primary-foreground border-primary'
                  : day.isToday
                  ? 'bg-card text-primary border-2 border-primary'
                  : 'bg-background text-muted-foreground border-border'
              }`}
            >
              {day.label}
            </div>
          ))}
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

      {/* Bottom row — real, drawn from the action plan generated for the most recent interview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <MessageSquare className="w-[18px] h-[18px]" />
              Quick Feedback
            </div>
            <Badge variant="outline" className="text-[11px]">From your last session</Badge>
          </div>
          {!hasLatestFeedback ? (
            <p className="text-sm text-muted-foreground py-4">Complete an interview to see feedback here.</p>
          ) : goodPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No feedback notes were generated for your last session.</p>
          ) : (
            goodPoints.map((point, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-border last:border-b-0 last:pb-0 first:pt-0">
                <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 bg-success/10">
                  <CheckCircle2 className="w-[15px] h-[15px] text-success" />
                </div>
                <div className="text-[13px] text-foreground leading-relaxed pt-1.5">{point}</div>
              </div>
            ))
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Lightbulb className="w-[18px] h-[18px]" />
              Tips for Your Next Interview
            </div>
            <Badge variant="outline" className="text-[11px]">From your last session</Badge>
          </div>
          {!hasLatestFeedback ? (
            <p className="text-sm text-muted-foreground py-4">Complete an interview to get personalised tips here.</p>
          ) : tips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No tips were generated for your last session.</p>
          ) : (
            tips.map((tip, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-border last:border-b-0 last:pb-0 first:pt-0">
                <div className="w-[26px] h-[26px] rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="text-[13px] text-foreground leading-relaxed pt-0.5">{tip}</div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
};
