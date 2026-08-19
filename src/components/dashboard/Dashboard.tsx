import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Pip } from '@/components/brand/Pip';
import { QuestionOfTheDay } from '@/components/questions/QuestionOfTheDay';
import { SkillBreakdown } from '@/components/dashboard/SkillBreakdown';
import { SchoolTimeline } from '@/components/dashboard/SchoolTimeline';
import { Play, Trophy, Flame, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardProps {
  onStartInterview: () => void;
  onViewHistory: () => void;
  onManageDates: () => void;
  onAchievements?: () => void;
  /** Testing aid: replays the first-time guided tour on demand. */
  onReplayTour?: () => void;
}

const MAX_TOTAL_SCORE = 20;

export const Dashboard: React.FC<DashboardProps> = ({ onStartInterview, onViewHistory, onAchievements, onReplayTour }) => {
  const { user } = useAuth();
  const { stats } = useDashboardStats();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const totalSessions = stats?.totalSessions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const streak = stats?.streak ?? 0;
  const milestone = totalSessions < 20 ? 20 : Math.ceil((totalSessions + 1) / 10) * 10;
  const donePct = Math.min(100, Math.round((totalSessions / milestone) * 100));

  // Playful XP / level derived from real activity.
  const level = Math.floor(totalSessions / 5) + 1;
  const xpInLevel = (totalSessions % 5) * 40 + Math.round(averageScore * 5);
  const xpNeeded = 300;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  const scoreCirc = 2 * Math.PI * 23;
  const scoreOffset = scoreCirc * (1 - Math.min(1, averageScore / MAX_TOTAL_SCORE));
  const trend = stats?.recentTrend ?? [];
  const lastTwo = trend.slice(-2);
  const scoreDelta = lastTwo.length === 2 ? Math.round((lastTwo[1].score - lastTwo[0].score) * 10) / 10 : null;

  const dates = stats?.upcomingSchoolInterviews ?? [];
  const nextName = dates[0]?.school;
  const nextDays = dates[0]?.daysUntil;

  // Hero card copy — different for someone who hasn't interviewed yet vs. a returning user, and
  // leads with their actual chosen school's countdown when there's one, rather than generic filler.
  const hasInterviewed = totalSessions > 0;
  const heroEyebrow = nextName
    ? `${nextName} in ${nextDays} ${nextDays === 1 ? 'day' : 'days'}`
    : hasInterviewed ? 'Ready when you are' : "Let's get started";
  const heroHeadline = hasInterviewed ? <>Start your next<br />interview</> : <>Practise for your<br />first interview</>;
  const heroSubtext = hasInterviewed
    ? 'A friendly mock with instant feedback. Earn up to +200 XP!'
    : 'No pressure, just practice — see exactly what a real interview feels like before it counts.';

  const coachNote = (stats?.goodPoints ?? [])[0] ?? null;

  const achievements = [
    totalSessions >= 1 && { emoji: '🥇', label: 'First Mock', color: 'text-amber', bg: 'bg-amber/10 border-amber/20' },
    streak >= 3 && { emoji: '🔥', label: 'On a Roll', color: 'text-[#FF9E77]', bg: 'bg-primary/10 border-primary/20' },
    (stats?.skills.reasoning ?? 0) >= 3 && { emoji: '🧠', label: 'Deep Thinker', color: 'text-sky', bg: 'bg-sky/10 border-sky/20' },
    totalSessions >= 10 && { emoji: '⭐', label: 'Ten Club', color: 'text-purple', bg: 'bg-purple/10 border-purple/20' },
  ].filter(Boolean) as { emoji: string; label: string; color: string; bg: string }[];

  return (
    <div data-tour="page-dashboard" className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6 space-y-[13px]">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <Pip size={58} float className="flex-none" />
        <div>
          <h1 className="text-[25px] font-semibold text-white">Hi {firstName}! Let&rsquo;s practise</h1>
          <p className="text-[13.5px] font-bold text-muted-foreground mt-0.5">
            {nextName ? <>Pick a tile to jump in — {nextName} is only {nextDays} {nextDays === 1 ? 'day' : 'days'} away!</> : 'Pick a tile to jump in and warm up your thinking.'}
          </p>
        </div>
      </div>

      {/* Tile grid */}
      <div className="grid gap-[13px] md:grid-cols-[1.4fr_1fr_1fr]">
        {/* Start interview — hero */}
        <button
          onClick={onStartInterview}
          data-tour="start-interview"
          title="Start a new mock interview"
          className="group md:row-span-2 relative overflow-hidden rounded-[20px] p-[22px] text-left flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-10px_rgba(244,63,94,.6)]"
          style={{ background: 'linear-gradient(150deg,#FF7F50,#F43F5E)' }}
        >
          <Play className="absolute right-3 bottom-3 h-28 w-28 text-white/[0.14] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" strokeWidth={1.2} />
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide text-white/85">{heroEyebrow}</div>
            <div className="font-display text-[27px] font-semibold text-white leading-[1.1] mt-1.5">{heroHeadline}</div>
            <p className="mt-2 text-[13px] font-bold text-white/90 max-w-[230px]">{heroSubtext}</p>
          </div>
          <div className="flex items-end justify-between w-full mt-4 gap-3">
            <span className="inline-flex items-center gap-1.5 self-start rounded-[14px] bg-white px-5 py-3 text-sm font-extrabold text-[#EF4444] shadow-lg transition-transform duration-200 group-hover:scale-105">
              <Play className="h-3 w-3 fill-current" /> Let&rsquo;s go
            </span>
            {dates.length > 0 && (
              <div className="hidden sm:flex flex-col gap-1 items-end text-right relative z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/70">Upcoming</span>
                {dates.slice(0, 2).map((d) => (
                  <div key={`${d.school}-${d.date}`} className="text-[11.5px] font-bold text-white/90 leading-tight">
                    {d.school} <span className="text-white/60">· {d.daysUntil === 0 ? 'today' : d.daysUntil === 1 ? '1 day' : `${d.daysUntil}d`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Level */}
        <div onClick={onAchievements} title="See all achievements" className="group rounded-[20px] p-[18px] text-white cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(139,92,246,.55)]" style={{ background: 'linear-gradient(150deg,#8B5CF6,#6366F1)' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide opacity-85">Level</div>
          <div className="font-display text-[34px] font-semibold leading-none my-1 flex items-center gap-2">{level}<Trophy className="h-5 w-5 transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6" /></div>
          <div className="h-2 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${xpPct}%` }} /></div>
          <div className="text-[11px] font-bold mt-1.5 opacity-90">{xpInLevel} / {xpNeeded} XP</div>
        </div>

        {/* Avg score */}
        <div title="Your average score across all interviews" className="group tile p-[18px] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(56,189,248,.35)]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Avg score</div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="relative w-14 h-14 flex-none transition-transform duration-200 group-hover:scale-110">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
                <circle cx="28" cy="28" r="23" fill="none" stroke="hsl(var(--sky))" strokeWidth="6" strokeLinecap="round" strokeDasharray={scoreCirc} strokeDashoffset={scoreOffset} transform="rotate(-90 28 28)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-[15px] font-semibold text-white font-display">{averageScore}</span></div>
            </div>
            <div className="text-[11.5px] font-bold text-muted-foreground leading-[1.4]">
              out of 20<br />
              {scoreDelta !== null && scoreDelta !== 0 && (
                <span className={scoreDelta > 0 ? 'text-emerald font-extrabold' : 'text-[#F87171] font-extrabold'}>{scoreDelta > 0 ? '↑' : '↓'} {Math.abs(scoreDelta)} since last</span>
              )}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div title={streak > 0 ? `${streak}-day practice streak` : 'Start a practice streak'} className="group rounded-[20px] p-[18px] text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(239,68,68,.5)]" style={{ background: 'linear-gradient(150deg,#F59E0B,#EF4444)' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide opacity-85">Streak</div>
          <div className="font-display text-[34px] font-semibold leading-none my-1 flex items-center gap-2">{streak}<Flame className="h-5 w-5 fill-white transition-transform duration-200 group-hover:scale-125" /></div>
          <div className="text-[11.5px] font-bold opacity-92">{streak > 0 ? `Practise today to make it ${streak + 1}!` : 'Practise today to start a streak!'}</div>
        </div>

        {/* Interviews done */}
        <div title="Total interviews completed" className="group tile p-[18px] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(56,189,248,.35)]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Interviews done</div>
          <div className="font-display text-[34px] font-semibold text-white leading-none my-1">{totalSessions}</div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-sky" style={{ width: `${donePct}%` }} /></div>
          <div className="text-[11px] font-bold text-muted-foreground mt-1.5">{Math.max(0, milestone - totalSessions)} to your milestone 🎉</div>
        </div>
      </div>

      {/* Question of the Day */}
      <div data-tour="qotd">
        <QuestionOfTheDay name={firstName} />
      </div>

      {/* Interview dates */}
      <SchoolTimeline dates={dates} />

      {/* Achievements strip */}
      {achievements.length > 0 && (
        <div className="tile px-5 py-4 flex items-center gap-[18px] flex-wrap">
          <div className="font-display font-semibold text-[15px] text-white flex items-center gap-2 flex-none">
            <Award className="h-[17px] w-[17px] text-amber" /> Achievements
          </div>
          <div className="flex gap-3 flex-1 flex-wrap">
            {achievements.map((a) => (
              <div key={a.label} className={cn('flex items-center gap-2 rounded-xl px-3 py-1.5 border', a.bg)}>
                <span className="text-lg">{a.emoji}</span>
                <span className={cn('text-[11.5px] font-extrabold', a.color)}>{a.label}</span>
              </div>
            ))}
          </div>
          {onAchievements && (
            <button onClick={onAchievements} className="flex-none rounded-xl bg-white/[0.06] px-3.5 py-2 text-[13px] font-extrabold text-[#DCE4F2] hover:bg-white/10 transition-colors">See all →</button>
          )}
        </div>
      )}

      {/* Skills + Pip says */}
      <div className="grid gap-[13px] lg:grid-cols-[1.3fr_1fr]">
        <SkillBreakdown stats={stats} />

        <div className="tile p-5 flex flex-col">
          <span className="font-display font-semibold text-[15px] text-white flex items-center gap-2 mb-3"><Zap className="h-4 w-4 text-amber" /> Pip says</span>
          <div className="flex items-start gap-3 flex-1">
            <Pip size={52} float className="flex-none" />
            <p className="text-[13.5px] font-semibold text-[#C7D2E4] leading-relaxed">
              {coachNote ? `"${coachNote}"` : `Finish a session and I'll leave you a note here, ${firstName} — one thing you did brilliantly, and one to try next time!`}
            </p>
          </div>
        </div>
      </div>

      {/* Admin-only testing aid — replays the full fresh-signup flow (schools, founder video, walkthrough) on demand. */}
      {onReplayTour && (
        <button
          onClick={onReplayTour}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full border border-white/12 bg-[#152036] px-4 py-2.5 text-[12.5px] font-extrabold text-[#C7D2E4] shadow-lg hover:bg-white/10 hover:text-white transition-colors"
        >
          <Zap className="h-3.5 w-3.5 text-amber" /> Replay onboarding flow
        </button>
      )}
    </div>
  );
};
