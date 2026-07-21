/**
 * The Locker Room — customise Pip! Hats unlock through achievements (same live stats as the
 * trophy cabinet); the equipped hat is worn by every Pip across the whole site.
 */
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Pip } from '@/components/brand/Pip';
import { HATS, unlockedHats, usePipCustomization, type HatId } from '@/contexts/PipCustomizationContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Lock, Check } from 'lucide-react';

export const LockerRoom: React.FC<{ onAchievements?: () => void }> = ({ onAchievements }) => {
  const { user } = useAuth();
  const { stats } = useDashboardStats();
  const { hat: equipped, setHat } = usePipCustomization();
  const { toast } = useToast();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] || 'You';

  const bestScore = Math.max(
    stats?.averageScore ?? 0,
    ...(stats?.recentTrend ?? []).map((t) => t.score),
    0,
  );
  const unlocked = unlockedHats({
    createdAt: user?.created_at,
    sessions: stats?.totalSessions ?? 0,
    streak: stats?.streak ?? 0,
    reasoning: stats?.skills.reasoning ?? 0,
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
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6 space-y-6">
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
            {onAchievements && (
              <button onClick={onAchievements} className="text-[12.5px] font-extrabold text-amber hover:text-white transition-colors">
                🏅 Earn more in the trophy cabinet →
              </button>
            )}
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
    </div>
  );
};
