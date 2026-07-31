import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Pip } from '@/components/brand/Pip';
import { BETA_CUTOFF } from '@/contexts/PipCustomizationContext';
import { HATS, unlockedHats, usePipCustomization, type HatId } from '@/contexts/PipCustomizationContext';
import { getStars } from '@/lib/kid';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Lock, Check } from 'lucide-react';

interface Badge {
  emoji: string; title: string; desc: string; xp: number; earned: boolean; grad: string; progress?: number;
}

type Tab = 'trophies' | 'locker';

/**
 * "Trophy cabinet" (badges) and "Locker room" (Pip customisation) merged into one page with a tab
 * switcher — previously two separate views/routes; Dashboard 2's sidebar already only had one
 * Achievements icon on the assumption this merge existed (see SidebarLayout.tsx's comment), so this
 * catches Dashboard 1 up to that same shape. Both share the same live stats.
 */
export const AchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const { stats } = useDashboardStats();
  const { hat: equipped, setHat } = usePipCustomization();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('trophies');

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] || 'You';
  const sessions = stats?.totalSessions ?? 0;
  const streak = stats?.streak ?? 0;
  const avg = stats?.averageScore ?? 0;
  const reasoning = stats?.skills.reasoning ?? 0;
  const insight = stats?.skills.personalInsight ?? 0;
  const dates = (stats?.upcomingSchoolInterviews ?? []).length;
  const stars = typeof window !== 'undefined' ? getStars() : 0;
  const bestScore = Math.max(avg, ...(stats?.recentTrend ?? []).map((t) => t.score), 0);

  const pct = (v: number, t: number) => Math.min(100, Math.round((v / t) * 100));

  const groups: { icon: string; name: string; badges: Badge[] }[] = [
    {
      icon: '🐣', name: 'Getting Started', badges: [
        { emoji: '👤', title: 'First Steps', desc: 'Complete your profile', xp: 50, earned: !!user, grad: 'from-emerald to-[#10B981]' },
        { emoji: '🎤', title: 'First Mock', desc: 'Finish your first interview', xp: 100, earned: sessions >= 1, grad: 'from-amber to-[#F59E0B]', progress: pct(sessions, 1) },
        { emoji: '⭐', title: 'Daily Debut', desc: 'Answer your first daily question', xp: 50, earned: stars >= 1, grad: 'from-primary to-rose', progress: pct(stars, 1) },
        { emoji: '📅', title: 'Booked In', desc: 'Add an interview date', xp: 50, earned: dates >= 1, grad: 'from-sky to-[#0EA5E9]', progress: pct(dates, 1) },
      ],
    },
    {
      icon: '🔥', name: 'Streak Master', badges: [
        { emoji: '🔥', title: 'On a Roll', desc: '3-day practice streak', xp: 150, earned: streak >= 3, grad: 'from-primary to-[#EF4444]', progress: pct(streak, 3) },
        { emoji: '⚡', title: 'Week Warrior', desc: '7-day streak', xp: 300, earned: streak >= 7, grad: 'from-amber to-primary', progress: pct(streak, 7) },
      ],
    },
    {
      icon: '🎯', name: 'Practice Pro', badges: [
        { emoji: '🌱', title: 'Getting Warm', desc: 'Complete 5 mocks', xp: 100, earned: sessions >= 5, grad: 'from-emerald to-sky', progress: pct(sessions, 5) },
        { emoji: '💪', title: 'Committed', desc: 'Complete 10 mocks', xp: 200, earned: sessions >= 10, grad: 'from-sky to-purple', progress: pct(sessions, 10) },
        { emoji: '🏋️', title: 'Dedicated', desc: 'Complete 25 mocks', xp: 500, earned: sessions >= 25, grad: 'from-purple to-rose', progress: pct(sessions, 25) },
      ],
    },
    {
      icon: '🌟', name: 'Skill Stars', badges: [
        { emoji: '🧠', title: 'Deep Thinker', desc: 'Score 4/5 in Reasoning', xp: 150, earned: reasoning >= 4, grad: 'from-sky to-[#0EA5E9]', progress: pct(reasoning, 4) },
        { emoji: '🗣️', title: 'Great Communicator', desc: '4/5 in Personal Insight', xp: 150, earned: insight >= 4, grad: 'from-amber to-primary', progress: pct(insight, 4) },
      ],
    },
    {
      icon: '🏅', name: 'Score Champions', badges: [
        { emoji: '👍', title: 'Good Show', desc: 'Score 12+ in an interview', xp: 150, earned: bestScore >= 12, grad: 'from-emerald to-sky', progress: pct(bestScore, 12) },
        { emoji: '🏆', title: 'Brilliant', desc: 'Score 16+ in an interview', xp: 400, earned: bestScore >= 16, grad: 'from-amber to-[#F59E0B]', progress: pct(bestScore, 16) },
      ],
    },
    {
      icon: '🎩', name: 'Special', badges: [
        { emoji: '🦉', title: 'Beta Tester', desc: 'Joined during the beta — unlocks the intrvue cap!', xp: 250, earned: !!user?.created_at && user.created_at.slice(0, 10) < BETA_CUTOFF, grad: 'from-primary to-[#F1730B]' },
        { emoji: '🌅', title: 'Early Bird', desc: 'Practise before 8am', xp: 50, earned: false, grad: 'from-amber to-primary' },
        { emoji: '🎪', title: 'All-Rounder', desc: 'Try every interview type', xp: 200, earned: false, grad: 'from-purple to-sky' },
      ],
    },
  ];

  const earnedBadges = groups.flatMap((g) => g.badges).filter((b) => b.earned);
  const totalXp = earnedBadges.reduce((s, b) => s + b.xp, 0);
  const level = Math.floor(totalXp / 300) + 1;
  const intoLevel = totalXp % 300;
  const toNext = 300 - intoLevel;

  const unlocked = unlockedHats({
    createdAt: user?.created_at,
    sessions,
    streak,
    reasoning,
    bestScore,
  });

  const equip = async (id: HatId) => {
    if (!unlocked.has(id)) return;
    await setHat(id);
    const def = HATS.find((h) => h.id === id);
    toast({
      title: id === 'none' ? 'Back to classic Pip!' : `Pip is wearing the ${def?.name}!`,
      description: id === 'none' ? undefined : 'Every Pip on the site wears it now.',
    });
  };

  return (
    <div data-tour="page-achievements" className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6 space-y-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] p-1 w-fit">
        <button
          onClick={() => setTab('trophies')}
          className={cn(
            'px-4 py-1.5 rounded-full text-[12.5px] font-extrabold transition-colors',
            tab === 'trophies' ? 'bg-primary/20 text-white' : 'text-muted-foreground hover:text-white',
          )}
        >
          🏅 Trophy cabinet
        </button>
        <button
          onClick={() => setTab('locker')}
          data-tour="locker-link"
          className={cn(
            'px-4 py-1.5 rounded-full text-[12.5px] font-extrabold transition-colors',
            tab === 'locker' ? 'bg-primary/20 text-white' : 'text-muted-foreground hover:text-white',
          )}
        >
          👒 Locker room
        </button>
      </div>

      {tab === 'trophies' ? (
        <>
          {/* Hero */}
          <div className="flex items-center gap-[18px] rounded-[20px] border border-white/[0.07] p-5" style={{ background: 'linear-gradient(120deg,rgba(139,92,246,.18),rgba(255,127,80,.12))' }}>
            <Pip size={78} float className="flex-none" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-semibold text-white">{firstName}&rsquo;s trophy cabinet</h1>
              <div className="flex items-center gap-2.5 my-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)' }}>Level {level}</span>
                <span className="text-[12.5px] font-extrabold text-amber inline-flex items-center gap-1">🏅 {earnedBadges.length} badges</span>
                <span className="text-[12.5px] font-bold text-muted-foreground">{totalXp} XP total</span>
              </div>
              <div className="h-3 rounded-full bg-white/[0.08] overflow-hidden max-w-[460px]">
                <div className="h-full rounded-full" style={{ width: `${pct(intoLevel, 300)}%`, background: 'linear-gradient(90deg,#FBBF24,#F59E0B,#FF7F50)' }} />
              </div>
              <p className="mt-2.5 text-[12.5px] font-semibold text-muted-foreground">
                {toNext} XP to <span className="text-[#C4B0FF]">Level {level + 1}</span>
                {' · '}
                <button onClick={() => setTab('locker')} className="font-extrabold text-amber hover:text-white transition-colors">
                  👒 Spend your badges in the locker room →
                </button>
              </p>
            </div>
          </div>

          {/* Groups */}
          {groups.map((g) => {
            const done = g.badges.filter((b) => b.earned).length;
            return (
              <div key={g.name}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-display text-base font-semibold text-white">{g.icon} {g.name}</span>
                  <span className={cn('text-[11px] font-extrabold', done === g.badges.length ? 'text-emerald' : 'text-amber')}>{done}/{g.badges.length}</span>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {g.badges.map((b) => (
                    <div
                      key={b.title}
                      className={cn('rounded-[18px] p-4 text-center border', b.earned ? 'border-white/10' : 'border-white/[0.08] bg-[#141C30]')}
                      style={b.earned ? { background: 'linear-gradient(160deg,rgba(52,211,153,.14),rgba(255,255,255,.03))' } : undefined}
                    >
                      <div className={cn('w-[52px] h-[52px] mx-auto mb-2.5 rounded-2xl flex items-center justify-center text-2xl', b.earned ? `bg-gradient-to-br ${b.grad}` : 'bg-white/[0.06] grayscale opacity-60')}>
                        {b.emoji}
                      </div>
                      <div className={cn('font-extrabold text-[13px]', b.earned ? 'text-white' : 'text-[#DCE4F2]')}>{b.title}</div>
                      <div className="text-[11px] font-semibold text-muted-foreground mt-0.5 mb-2">{b.desc}</div>
                      {b.earned ? (
                        <div className="text-[10.5px] font-extrabold text-emerald">✓ +{b.xp} XP</div>
                      ) : (
                        <>
                          {b.progress !== undefined && b.progress > 0 && (
                            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mb-1.5"><div className="h-full rounded-full bg-primary/70" style={{ width: `${b.progress}%` }} /></div>
                          )}
                          <div className="text-[10.5px] font-extrabold text-muted-foreground">+{b.xp} XP</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {/* Hero: big preview of Pip in the equipped hat */}
          <div
            className="flex items-center gap-[22px] rounded-[20px] border border-white/[0.07] p-6"
            style={{ background: 'linear-gradient(120deg,rgba(56,189,248,.16),rgba(139,92,246,.14))' }}
          >
            <Pip size={110} float className="flex-none" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-semibold text-white">{firstName}&rsquo;s locker room</h1>
              <p className="mt-1 text-[13.5px] font-semibold text-muted-foreground max-w-[520px]">
                Dress up Pip! Hats unlock as you earn achievements — whatever Pip wears here, Pip wears
                <span className="text-white"> everywhere on the site</span>.
              </p>
              <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#38BDF8,#8B5CF6)' }}>
                  {unlocked.size - 1}/{HATS.length - 1} hats unlocked
                </span>
                <button onClick={() => setTab('trophies')} className="text-[12.5px] font-extrabold text-amber hover:text-white transition-colors">
                  🏅 Earn more in the trophy cabinet →
                </button>
              </div>
            </div>
          </div>

          {/* Hat grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {HATS.map((h) => {
              const isUnlocked = unlocked.has(h.id);
              const isEquipped = equipped === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => equip(h.id)}
                  disabled={!isUnlocked}
                  data-tour={h.id === 'beta-cap' ? 'locker-hat' : undefined}
                  className={cn(
                    'rounded-[18px] p-4 text-center border transition-all',
                    isEquipped
                      ? 'border-primary/70 shadow-[0_0_0_2px_hsl(var(--primary)/.35)]'
                      : isUnlocked
                        ? 'border-white/10 hover:border-white/25 hover:-translate-y-0.5 cursor-pointer'
                        : 'border-white/[0.08] bg-[#141C30] cursor-not-allowed',
                  )}
                  style={isEquipped || isUnlocked ? { background: 'linear-gradient(160deg,rgba(56,189,248,.10),rgba(255,255,255,.03))' } : undefined}
                >
                  <div className={cn('mx-auto mb-2 w-fit', !isUnlocked && 'grayscale opacity-45')}>
                    <Pip size={64} hat={h.id} />
                  </div>
                  <div className={cn('font-extrabold text-[13px]', isUnlocked ? 'text-white' : 'text-[#DCE4F2]')}>{h.name}</div>
                  <div className="text-[11px] font-semibold text-muted-foreground mt-0.5 mb-2">
                    {isUnlocked ? h.achievement : h.unlock}
                  </div>
                  {isEquipped ? (
                    <div className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-primary-soft">
                      <Check className="w-3.5 h-3.5" /> Wearing it
                    </div>
                  ) : isUnlocked ? (
                    <div className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-[10.5px] font-extrabold text-[#C7D2E4]">
                      Wear it
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-muted-foreground">
                      <Lock className="w-3 h-3" /> Locked
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[12px] font-semibold text-muted-foreground">
            More hats coming — keep practising to unlock them! 🦉
          </p>
        </>
      )}
    </div>
  );
};
