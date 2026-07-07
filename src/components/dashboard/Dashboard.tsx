import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Pip, PipMark } from '@/components/brand/Pip';
import { Star, Play } from 'lucide-react';
import { QuestionOfTheDay } from '@/components/questions/QuestionOfTheDay';
import { WarmUp } from '@/components/questions/WarmUp';
import { WrongLastTime } from '@/components/questions/WrongLastTime';
import { MinigameSection } from '@/components/MinigameSection';
import { getStars } from '@/lib/kid';

interface DashboardProps {
  onStartInterview: () => void;
  onViewHistory: () => void;
  onManageDates: () => void;
}

const MAX_TOTAL_SCORE = 20;
const MAX_SKILL_SCORE = 5;

// Skill rows in the mock's order, with the mock's short labels.
const SKILL_ROWS: { key: 'reasoning' | 'personalInsight' | 'currentAwareness' | 'extracurricular'; label: string }[] = [
  { key: 'reasoning', label: 'Reasoning & agility' },
  { key: 'personalInsight', label: 'Personal insight' },
  { key: 'currentAwareness', label: 'Current awareness' },
  { key: 'extracurricular', label: 'Extracurricular stories' },
];

const STRONG = { text: 'Getting strong', textClass: 'text-teal', barClass: 'bg-teal' };
const COMING = { text: 'Coming along', textClass: 'text-[#b0641f]', barClass: 'bg-gold' };
const FOCUS = { text: "Pip's next focus", textClass: 'text-primary', barClass: 'bg-primary' };

const LABEL = 'text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground';

export const Dashboard: React.FC<DashboardProps> = ({ onStartInterview, onViewHistory, onManageDates }) => {
  const { user } = useAuth();
  const { stats } = useDashboardStats();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  // Live star count (awarded by the Question of the Day) — a little reward loop for the storyboard.
  const [stars, setStars] = useState(0);
  useEffect(() => {
    setStars(getStars());
    const onChange = () => setStars(getStars());
    window.addEventListener('pip-stars-changed', onChange);
    return () => window.removeEventListener('pip-stars-changed', onChange);
  }, []);

  const totalSessions = stats?.totalSessions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const milestone = totalSessions < 20 ? 20 : Math.ceil((totalSessions + 1) / 10) * 10;
  const completedPct = Math.min(100, (totalSessions / milestone) * 100);
  const scoreRatio = Math.min(1, averageScore / MAX_TOTAL_SCORE);

  const validSkills = SKILL_ROWS.map((r) => ({ ...r, value: stats?.skills[r.key] ?? null })).filter(
    (r) => r.value !== null,
  ) as (typeof SKILL_ROWS[number] & { value: number })[];
  const strongest = validSkills.length ? validSkills.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const weakest = validSkills.length ? validSkills.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  // Rank skills so the status words vary: only the lowest is "Pip's next focus", the highest is
  // "Getting strong", the rest "Coming along" (stable tiebreak keeps them distinct even when equal).
  const ranked = [...validSkills].sort((a, b) => b.value - a.value);
  const bestKey = ranked[0]?.key;
  const worstKey = ranked[ranked.length - 1]?.key;
  const skillStatus = (key: string, pct: number) => {
    if (bestKey !== worstKey) {
      if (key === worstKey) return FOCUS;
      if (key === bestKey) return STRONG;
      return COMING;
    }
    return pct >= 55 ? STRONG : COMING; // single skill: fall back to its value
  };

  const streak = stats?.streak ?? 0;
  const weekStrip = stats?.weekStrip ?? [];
  const goodPoints = stats?.goodPoints ?? [];
  const hasLatestFeedback = stats?.hasLatestFeedback ?? false;
  const coachNote = goodPoints[0] ?? null;

  const upcomingSchoolInterviews = stats?.upcomingSchoolInterviews ?? [];
  const nextInterview = upcomingSchoolInterviews[0] ?? null;
  const countdownPct = nextInterview
    ? Math.max(6, Math.min(100, Math.round((1 - nextInterview.daysUntil / 60) * 100)))
    : 0;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 md:px-8 space-y-5">
      {/* Hero — Pip + serif welcome + interview-day countdown (mock 1a) */}
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 py-6">
        <Pip size={120} className="hidden sm:block" />
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex items-center gap-3 mb-2.5 justify-center md:justify-start">
            <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#b0641f]">Pip says hello</span>
            {stars > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-[#b0641f]">
                <Star className="h-3 w-3 fill-current" /> {stars} {stars === 1 ? 'star' : 'stars'}
              </span>
            )}
          </div>
          <h1 className="font-serif text-4xl md:text-[44px] font-semibold leading-[1.15] text-foreground">
            Good {partOfDay}, {firstName}.
          </h1>
          <p className="mt-3 text-[17px] leading-[1.6] text-muted-foreground max-w-[560px] mx-auto md:mx-0">
            {nextInterview ? (
              <>Your <strong className="text-foreground font-semibold">{nextInterview.school}</strong> interview is in{' '}
                <strong className="text-foreground font-semibold">{nextInterview.daysUntil} {nextInterview.daysUntil === 1 ? 'day' : 'days'}</strong>.
                {' '}One short practice today keeps you on track — shall we warm up your thinking-aloud?</>
            ) : (
              <>One short practice a day keeps your thinking sharp — shall we warm up your thinking-aloud?</>
            )}
          </p>
          <div className="mt-6 flex gap-3 flex-wrap justify-center md:justify-start">
            <Button size="lg" className="rounded-full px-7 font-bold shadow-[0_6px_16px_hsl(var(--primary)/0.28)]" onClick={onStartInterview}>
              Start today&rsquo;s practice
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-7 border-[1.5px] font-semibold" onClick={onViewHistory}>
              Review last session
            </Button>
          </div>
        </div>
        {nextInterview && (
          <div className="w-full md:w-[230px] shrink-0 rounded-[20px] bg-ink text-cream p-6">
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

      {/* Chapter: today's question + warm up */}
      <Chapter title="Let's warm up your brain" subtitle="A daily puzzle and a few quick questions to get going." />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <QuestionOfTheDay name={firstName} />
        <WarmUp name={firstName} />
      </div>

      {/* Chapter: progress */}
      <Chapter title="How you're doing" subtitle="Your sessions, your score, and the skills you're building." />

      {/* Stats row — Practice sessions · Latest score · This week */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Practice sessions */}
        <Card className="rounded-[18px] p-6">
          <div className={LABEL}>Practice sessions</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-serif text-[34px] font-semibold leading-none">{totalSessions}</span>
            <span className="text-[13px] text-muted-foreground">
              · {totalSessions >= milestone ? 'milestone reached' : `${milestone - totalSessions} more to your ${milestone} badge`}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-teal" style={{ width: `${completedPct}%` }} />
          </div>
        </Card>

        {/* Latest score */}
        <Card className="rounded-[18px] p-6 flex items-center gap-[18px]">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `conic-gradient(hsl(var(--primary)) ${scoreRatio * 360}deg, hsl(var(--muted)) 0)` }}
          >
            <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
              <span className="font-extrabold text-sm">{averageScore}</span>
              <span className="font-medium text-muted-foreground text-[11px]">/{MAX_TOTAL_SCORE}</span>
            </div>
          </div>
          <div>
            <div className={LABEL}>Latest score</div>
            <div className="text-[13.5px] leading-[1.5] text-muted-foreground mt-1.5">
              {strongest && weakest && strongest.key !== weakest.key ? (
                <>Strongest in <strong className="text-foreground font-semibold">{strongest.label.toLowerCase()}</strong> — Pip suggests practising {weakest.label.toLowerCase()} next.</>
              ) : (
                <>Complete a few sessions and Pip will point you at what to practise next.</>
              )}
            </div>
          </div>
        </Card>

        {/* This week */}
        <Card className="rounded-[18px] p-6">
          <div className={LABEL}>This week</div>
          <div className="flex gap-2 mt-3.5">
            {(weekStrip.length ? weekStrip : ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => ({ label, completed: false, isToday: false }))).map((d, i) => (
              <div
                key={i}
                className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11.5px] font-bold ${
                  d.completed
                    ? 'bg-teal text-white'
                    : d.isToday
                    ? 'border-2 border-dashed border-gold text-[#b0641f]'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {d.label}
              </div>
            ))}
          </div>
          <div className="text-[13px] text-muted-foreground mt-3">
            {streak > 0 ? `${streak}-day streak — practise today to keep it alive` : 'Practise today to start a streak'}
          </div>
        </Card>
      </div>

      {/* Your skills + Pip's note */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 pb-4">
        <Card className="rounded-[18px] p-7">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-[19px] font-semibold">Your skills</span>
            <span className="text-[12px] text-muted-foreground">average across sessions</span>
          </div>
          {validSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-5">Complete a session to see your skill breakdown.</p>
          ) : (
            <div className="flex flex-col gap-4 mt-5">
              {validSkills.map((row) => {
                const pct = (row.value / MAX_SKILL_SCORE) * 100;
                const b = skillStatus(row.key, pct);
                return (
                  <div key={row.key}>
                    <div className="flex justify-between text-[13.5px] font-semibold">
                      <span>{row.label}</span>
                      <span className={b.textClass}>{b.text}</span>
                    </div>
                    <div className="mt-1.5 h-[9px] rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${b.barClass}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="rounded-[18px] p-7 border-gold/25 bg-[hsl(38_70%_92%)]">
          <div className="font-serif text-[19px] font-semibold">From your last session</div>
          <p className="mt-3.5 text-[14.5px] leading-[1.65] text-[#5a4a2e]">
            {hasLatestFeedback && coachNote
              ? `"${coachNote}"`
              : '"Once you finish a session, Pip will leave you a note here — one thing you did well, and one thing to try next time."'}
          </p>
          <div className="flex items-center gap-2.5 mt-4">
            <PipMark size={26} />
            <span className="text-[12.5px] font-bold text-[#b0641f]">Pip · your practice coach</span>
          </div>
        </Card>
      </div>

      {/* Chapter: quick-fire game */}
      <Chapter title="Play a quick round" subtitle="Ten fast questions — how many can you get right?" />
      <MinigameSection />

      {/* Chapter: review from last time */}
      <WrongLastTime name={firstName} onViewHistory={onViewHistory} />

      {/* Chapter: ready for a full practice */}
      <Card className="rounded-[22px] bg-ink p-7 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left border-0">
        <Pip size={84} />
        <div className="flex-1">
          <h2 className="font-serif text-2xl md:text-[28px] font-semibold text-cream">Ready for the real thing, {firstName}?</h2>
          <p className="text-cream/70 mt-1.5 text-[15px]">Pick a full practice interview and show Pip your best thinking. You&rsquo;ve got this!</p>
        </div>
        <Button size="lg" className="rounded-full px-8 font-bold shadow-[0_6px_16px_hsl(var(--primary)/0.35)]" onClick={onStartInterview}>
          <Play className="w-4 h-4 mr-2" /> Start a practice
        </Button>
      </Card>
    </div>
  );
};

/** A small "storyboard chapter" divider — a Pip mark, a serif title and a friendly subtitle. */
function Chapter({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <PipMark size={28} />
      <div>
        <h2 className="font-serif text-xl font-semibold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
