import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Pip } from '@/components/brand/Pip';
import { Play, Calendar, Trophy, BarChart3, Flame, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardProps {
  onStartInterview: () => void;
  onViewHistory: () => void;
  onManageDates: () => void;
  onAchievements?: () => void;
}

const MAX_TOTAL_SCORE = 20;
const MAX_SKILL_SCORE = 5;

const SKILLS: { key: 'reasoning' | 'personalInsight' | 'currentAwareness' | 'extracurricular'; label: string; bar: string }[] = [
  { key: 'personalInsight', label: 'Personal Insight & Expression', bar: 'bg-amber' },
  { key: 'reasoning', label: 'Reasoning & Intellectual Agility', bar: 'bg-sky' },
  { key: 'extracurricular', label: 'Extracurricular Engagement', bar: 'bg-emerald' },
  { key: 'currentAwareness', label: 'Current Awareness & Curiosity', bar: 'bg-primary' },
];

const DATE_ACCENTS = ['#FF9E77', '#DCE4F2', '#DCE4F2'];

export const Dashboard: React.FC<DashboardProps> = ({ onStartInterview, onViewHistory, onAchievements }) => {
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

  const skills = SKILLS.map((s) => ({ ...s, value: stats?.skills[s.key] ?? null })).filter((s) => s.value !== null) as (typeof SKILLS[number] & { value: number })[];
  const coachNote = (stats?.goodPoints ?? [])[0] ?? null;

  const achievements = [
    totalSessions >= 1 && { emoji: '🥇', label: 'First Mock', color: 'text-amber', bg: 'bg-amber/10 border-amber/20' },
    streak >= 3 && { emoji: '🔥', label: 'On a Roll', color: 'text-[#FF9E77]', bg: 'bg-primary/10 border-primary/20' },
    (stats?.skills.reasoning ?? 0) >= 3 && { emoji: '🧠', label: 'Deep Thinker', color: 'text-sky', bg: 'bg-sky/10 border-sky/20' },
    totalSessions >= 10 && { emoji: '⭐', label: 'Ten Club', color: 'text-purple', bg: 'bg-purple/10 border-purple/20' },
  ].filter(Boolean) as { emoji: string; label: string; color: string; bg: string }[];

  const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });

  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6 space-y-[13px]">
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
          className="md:row-span-2 relative overflow-hidden rounded-[20px] p-[22px] text-left flex flex-col justify-between"
          style={{ background: 'linear-gradient(150deg,#FF7F50,#F43F5E)' }}
        >
          <Play className="absolute right-3 bottom-3 h-28 w-28 text-white/[0.14]" strokeWidth={1.2} />
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide text-white/85">Ready when you are</div>
            <div className="font-display text-[27px] font-semibold text-white leading-[1.1] mt-1.5">Start your next<br />interview</div>
            <p className="mt-2 text-[13px] font-bold text-white/90 max-w-[230px]">A friendly mock with instant feedback. Earn up to +200 XP!</p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-[14px] bg-white px-5 py-3 text-sm font-extrabold text-[#EF4444] shadow-lg">
            <Play className="h-3 w-3 fill-current" /> Let&rsquo;s go
          </span>
        </button>

        {/* Level */}
        <div onClick={onAchievements} className="rounded-[20px] p-[18px] text-white cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(150deg,#8B5CF6,#6366F1)' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide opacity-85">Level</div>
          <div className="font-display text-[34px] font-semibold leading-none my-1 flex items-center gap-2">{level}<Trophy className="h-5 w-5" /></div>
          <div className="h-2 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${xpPct}%` }} /></div>
          <div className="text-[11px] font-bold mt-1.5 opacity-90">{xpInLevel} / {xpNeeded} XP</div>
        </div>

        {/* Avg score */}
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Avg score</div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="relative w-14 h-14 flex-none">
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
        <div className="rounded-[20px] p-[18px] text-white" style={{ background: 'linear-gradient(150deg,#F59E0B,#EF4444)' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide opacity-85">Streak</div>
          <div className="font-display text-[34px] font-semibold leading-none my-1 flex items-center gap-2">{streak}<Flame className="h-5 w-5 fill-white" /></div>
          <div className="text-[11.5px] font-bold opacity-92">{streak > 0 ? `Practise today to make it ${streak + 1}!` : 'Practise today to start a streak!'}</div>
        </div>

        {/* Interviews done */}
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Interviews done</div>
          <div className="font-display text-[34px] font-semibold text-white leading-none my-1">{totalSessions}</div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-sky" style={{ width: `${donePct}%` }} /></div>
          <div className="text-[11px] font-bold text-muted-foreground mt-1.5">{Math.max(0, milestone - totalSessions)} to your milestone 🎉</div>
        </div>
      </div>

      {/* Interview dates */}
      {dates.length > 0 && (
        <div className="tile px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="font-display font-semibold text-[15px] text-white flex items-center gap-2 flex-none">
            <Calendar className="h-[17px] w-[17px] text-[#F0A579]" /> Interview dates
          </div>
          <div className="flex gap-2.5 flex-1 flex-wrap">
            {dates.slice(0, 3).map((d, i) => (
              <div key={`${d.school}-${d.date}`} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 border" style={{ background: i === 0 ? 'rgba(255,127,80,.12)' : 'rgba(255,255,255,.04)', borderColor: i === 0 ? 'rgba(255,127,80,.3)' : 'rgba(255,255,255,.08)' }}>
                <div className="font-display text-xl font-semibold" style={{ color: DATE_ACCENTS[i] }}>{fmtDate(d.date)}</div>
                <div className="text-[11.5px] font-extrabold text-[#EAF0FA] leading-tight">
                  {d.school}<br /><span className="text-muted-foreground font-bold">{d.daysUntil === 0 ? 'Today' : d.daysUntil === 1 ? '1 day' : `${d.daysUntil} days`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="tile p-5">
          <div className="flex items-center justify-between mb-3.5">
            <span className="font-display font-semibold text-[15px] text-white flex items-center gap-2"><BarChart3 className="h-4 w-4 text-sky" /> Skill breakdown</span>
            <span className="text-[10.5px] font-bold text-muted-foreground px-2.5 py-[3px] rounded-full border border-white/10">Avg. across sessions</span>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">Finish a session to see your skills grow!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {skills.map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-[#DCE4F2]">{s.label}</span>
                    <span className="text-muted-foreground">{s.value}/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={cn('h-full rounded-full', s.bar)} style={{ width: `${(s.value / MAX_SKILL_SCORE) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
    </div>
  );
};
